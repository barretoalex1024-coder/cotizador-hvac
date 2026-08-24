'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart2, FolderOpen, CheckCircle, DollarSign, PlusCircle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Project } from '@/types/database'
import type { ProjectStatusKey } from '@/lib/constants'

interface Stats {
  total: number
  approved: number
  revenue: number
  thisMonth: number
}

interface MonthData { month: string; proyectos: number }

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, revenue: 0, thisMonth: 0 })
  const [chartData, setChartData] = useState<MonthData[]>([])
  const [profile, setProfile] = useState<{ company_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: projs }] = await Promise.all([
        supabase.from('profiles').select('company_name').eq('id', user.id).single(),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
      ])

      setProfile(prof)

      const all = projs ?? []
      setProjects(all.slice(0, 6))

      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // For revenue, we'd need to join estimates. Using placeholder 0 if no estimates loaded.
      setStats({
        total: all.length,
        approved: all.filter((p) => p.status === 'approved').length,
        revenue: 0,
        thisMonth: all.filter((p) => p.created_at >= thisMonthStart).length,
      })

      // Group by month (last 6 months)
      const months: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
        months[key] = 0
      }
      all.forEach((p) => {
        const d = new Date(p.created_at)
        const key = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
        if (key in months) months[key]++
      })
      setChartData(Object.entries(months).map(([month, proyectos]) => ({ month, proyectos })))
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total de proyectos', value: stats.total, icon: FolderOpen, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Aprobados', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Este mes', value: stats.thisMonth, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Ingresos est.', value: formatCurrency(stats.revenue), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div>
      <Header
        title={`Bienvenido${profile?.company_name ? `, ${profile.company_name}` : ''} 👋`}
        subtitle="Resumen de tu actividad reciente"
        actions={
          <Link href="/dashboard/projects/new">
            <Button size="md">
              <PlusCircle className="w-4 h-4" />
              Nueva Cotización
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Proyectos por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px #0001', fontSize: 13 }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="proyectos" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recientes</CardTitle>
            <Link href="/dashboard/projects" className="text-xs text-brand-600 font-medium hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">Cargando...</div>
            ) : projects.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <BarChart2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aún no hay proyectos</p>
              </div>
            ) : (
              projects.map((p) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[130px]">{p.client_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.created_at)}</p>
                  </div>
                  <StatusBadge status={p.status as ProjectStatusKey} />
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
