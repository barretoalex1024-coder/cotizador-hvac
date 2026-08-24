'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, formatBTU } from '@/lib/utils'
import { ArrowLeft, Download, Thermometer, MapPin, User, Mail, Phone, Building2 } from 'lucide-react'
import { CLIMATE_ZONES, BUILD_TYPES, PROJECT_STATUS, type ProjectStatusKey, type ClimateZoneKey, type BuildTypeKey } from '@/lib/constants'
import type { Project, Estimate, EquipmentCatalog, ProjectStatus } from '@/types/database'

interface ProjectDetail extends Project {
  estimates: (Estimate & { equipment_catalog: EquipmentCatalog | null })[]
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*, estimates(*, equipment_catalog(*))')
        .eq('id', id)
        .single()

      if (error || !data) { router.push('/dashboard/projects'); return }
      setProject(data as ProjectDetail)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleStatusChange(newStatus: string) {
    if (!project) return
    setUpdatingStatus(true)
    const supabase = createClient()
    await supabase.from('projects').update({ status: newStatus as ProjectStatus }).eq('id', id)
    setProject((p) => p ? { ...p, status: newStatus as ProjectStatus } : p)
    setUpdatingStatus(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
  if (!project) return null

  const estimate = project.estimates?.[0] ?? null
  const equip = estimate?.equipment_catalog ?? null
  const climate = CLIMATE_ZONES[project.climate_zone as ClimateZoneKey]
  const buildType = BUILD_TYPES[project.build_type as BuildTypeKey]

  const nextStatuses = Object.entries(PROJECT_STATUS).filter(([k]) => k !== project.status)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.client_name}</h1>
              <StatusBadge status={project.status as ProjectStatusKey} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Creado el {formatDate(project.created_at)}</p>
          </div>
        </div>
        <a href={`/api/pdf/${project.id}`} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
        </a>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <Card>
            <CardHeader><CardTitle>Información del cliente</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: 'Cliente', value: project.client_name },
                { icon: Mail, label: 'Correo', value: project.client_email || '—' },
                { icon: Phone, label: 'Teléfono', value: project.client_phone || '—' },
                { icon: MapPin, label: 'Dirección', value: project.address || '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <row.icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{row.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Technical specs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-brand-600" />
                <CardTitle>Especificaciones técnicas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Área', value: `${project.area_m2} m²` },
                { label: 'Altura de techo', value: `${project.ceiling_height_m} m` },
                { label: 'Zona climática', value: climate?.label ?? project.climate_zone },
                { label: 'Tipo de construcción', value: buildType?.label ?? project.build_type },
                { label: 'Carga BTU', value: estimate?.btu_load ? formatBTU(estimate.btu_load) : '—' },
                { label: 'Toneladas', value: estimate?.tons ? `${estimate.tons} ton` : '—' },
              ].map((row) => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-xs text-gray-400">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{row.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Equipment */}
          {equip && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <CardTitle>Equipo seleccionado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Marca', value: equip.brand },
                  { label: 'Modelo', value: equip.model },
                  { label: 'Capacidad', value: `${equip.tons} ton` },
                  { label: 'SEER', value: String(equip.seer ?? '—') },
                  { label: 'Refrigerante', value: equip.refrigerant ?? '—' },
                  { label: 'Tipo', value: equip.type.replace('_', ' ') },
                ].map((row) => (
                  <div key={row.label} className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{row.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Cost breakdown */}
          {estimate && (
            <Card>
              <CardHeader><CardTitle>Desglose de costos</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: 'Equipo', value: estimate.cost_equipment },
                  { label: 'Ductos', value: estimate.cost_ducts },
                  { label: 'Tuberías', value: estimate.cost_piping },
                  { label: 'Mano de obra', value: estimate.cost_labor },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-gray-600">
                    <span>{row.label}</span>
                    <span>{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(estimate.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Margen ({estimate.margin_pct}%)</span>
                  <span>{formatCurrency(estimate.total - estimate.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-brand-700">{formatCurrency(estimate.total)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status change */}
          <Card>
            <CardHeader><CardTitle>Cambiar estado</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nextStatuses.map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  disabled={updatingStatus}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-between group"
                >
                  <span>{info.label}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-gray-400 text-xs transition-opacity">Aplicar →</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          {estimate?.notes && (
            <Card>
              <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{estimate.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
