'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { PlusCircle, Search, FileText, Trash2, Eye } from 'lucide-react'
import type { Project } from '@/types/database'
import type { ProjectStatusKey } from '@/lib/constants'

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Borrador' },
  { key: 'sent', label: 'Enviados' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filtered, setFiltered] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let list = projects
    if (status !== 'all') list = list.filter((p) => p.status === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.client_name.toLowerCase().includes(q) ||
          (p.address ?? '').toLowerCase().includes(q) ||
          (p.client_email ?? '').toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [projects, status, search])

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('projects').delete().eq('id', id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      <Header
        title="Proyectos"
        subtitle={`${projects.length} proyecto${projects.length !== 1 ? 's' : ''} en total`}
        actions={
          <Link href="/dashboard/projects/new">
            <Button><PlusCircle className="w-4 h-4" />Nueva Cotización</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, dirección..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                status === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Área</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Zona climática</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Fecha</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded-full animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">
                  {projects.length === 0 ? (
                    <>
                      <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="font-medium text-gray-500 mb-1">Sin proyectos aún</p>
                      <p>Crea tu primera cotización para comenzar</p>
                    </>
                  ) : (
                    'No se encontraron proyectos con esos filtros.'
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">{p.client_name}</p>
                    {p.client_email && <p className="text-xs text-gray-400 mt-0.5">{p.client_email}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{p.area_m2} m²</td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell capitalize">{p.climate_zone.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status as ProjectStatusKey} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 hidden sm:table-cell">{formatDate(p.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/dashboard/projects/${p.id}`}>
                        <button className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                      <a href={`/api/pdf/${p.id}`} target="_blank" rel="noopener noreferrer">
                        <button className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
                      </a>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
