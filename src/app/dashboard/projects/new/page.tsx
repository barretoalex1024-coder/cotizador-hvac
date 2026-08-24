'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { formatCurrency, formatBTU } from '@/lib/utils'
import { calculateHVACLoad, estimateCosts } from '@/lib/hvac-calculator'
import { CLIMATE_ZONES, BUILD_TYPES, type ClimateZoneKey, type BuildTypeKey } from '@/lib/constants'
import { Thermometer, Zap, DollarSign, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { EquipmentCatalog, Profile } from '@/types/database'

const climateOptions = Object.entries(CLIMATE_ZONES).map(([value, z]) => ({ value, label: z.label }))
const buildOptions = Object.entries(BUILD_TYPES).map(([value, b]) => ({ value, label: b.label }))

interface FormData {
  // Client
  client_name: string
  client_email: string
  client_phone: string
  address: string
  // Property
  area_m2: string
  climate_zone: string
  build_type: string
  ceiling_height_m: string
  num_occupants: string
  num_windows: string
  has_kitchen: boolean
  // Equipment & costs
  equipment_id: string
  cost_ducts: string
  cost_piping: string
  labor_rate: string
  margin_pct: string
  notes: string
}

const INITIAL: FormData = {
  client_name: '', client_email: '', client_phone: '', address: '',
  area_m2: '', climate_zone: '', build_type: '', ceiling_height_m: '2.7',
  num_occupants: '', num_windows: '', has_kitchen: false,
  equipment_id: '', cost_ducts: '', cost_piping: '',
  labor_rate: '65', margin_pct: '25', notes: '',
}

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [equipment, setEquipment] = useState<EquipmentCatalog[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: prof }, { data: equip }] = await Promise.all([
        supabase.from('profiles').select('labor_rate,default_margin').single(),
        supabase.from('equipment_catalog').select('*').eq('is_active', true).order('tons'),
      ])
      if (prof) {
        setForm((f) => ({ ...f, labor_rate: String(prof.labor_rate), margin_pct: String(prof.default_margin) }))
      }
      setEquipment(equip ?? [])
    }
    load()
  }, [])

  function set(name: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [name]: value, ...(name === 'climate_zone' || name === 'build_type' || name === 'area_m2' || name === 'ceiling_height_m' ? { equipment_id: '' } : {}) }))
  }

  // Live HVAC calculation
  const calc = useMemo(() => {
    const area = parseFloat(form.area_m2)
    if (!area || !form.climate_zone || !form.build_type) return null
    return calculateHVACLoad({
      area_m2: area,
      climate_zone: form.climate_zone as ClimateZoneKey,
      build_type: form.build_type as BuildTypeKey,
      ceiling_height_m: parseFloat(form.ceiling_height_m) || 2.7,
      num_occupants: form.num_occupants ? parseInt(form.num_occupants) : undefined,
      num_windows: form.num_windows ? parseInt(form.num_windows) : undefined,
      has_kitchen: form.has_kitchen,
    })
  }, [form.area_m2, form.climate_zone, form.build_type, form.ceiling_height_m, form.num_occupants, form.num_windows, form.has_kitchen])

  // Filtered equipment by recommended tons (±1 ton range)
  const suitableEquipment = useMemo(() => {
    if (!calc) return equipment
    return equipment.filter((e) => e.tons >= calc.tons_recommended * 0.5 && e.tons <= calc.tons_recommended * 2)
  }, [equipment, calc])

  const selectedEquip = equipment.find((e) => e.id === form.equipment_id) ?? null

  // Live cost calculation
  const costs = useMemo(() => {
    if (!calc || !selectedEquip) return null
    return estimateCosts({
      tons: selectedEquip.tons,
      area_m2: parseFloat(form.area_m2) || 0,
      labor_rate: parseFloat(form.labor_rate) || 65,
      margin_pct: parseFloat(form.margin_pct) || 25,
      equipment_cost: selectedEquip.unit_cost,
      install_hours: selectedEquip.install_hours,
    })
  }, [calc, selectedEquip, form.area_m2, form.labor_rate, form.margin_pct])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_name || !form.area_m2 || !form.climate_zone || !form.build_type) {
      setError('Completa los campos requeridos: cliente, área, zona climática y tipo de construcción.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, calc, costs }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); setSaving(false); return }

    router.push(`/dashboard/projects/${data.project_id}`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/projects" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Header title="Nueva Cotización" subtitle="Calcula la carga térmica y genera tu propuesta" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT — inputs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Client */}
            <Card>
              <CardHeader><CardTitle>Datos del cliente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input label="Nombre del cliente" required value={form.client_name}
                  onChange={(e) => set('client_name', e.target.value)} placeholder="Empresa Ejemplo S.A." />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Correo electrónico" type="email" value={form.client_email}
                    onChange={(e) => set('client_email', e.target.value)} placeholder="cliente@email.com" />
                  <Input label="Teléfono" type="tel" value={form.client_phone}
                    onChange={(e) => set('client_phone', e.target.value)} placeholder="+52 55 0000 0000" />
                </div>
                <Input label="Dirección del inmueble" value={form.address}
                  onChange={(e) => set('address', e.target.value)} placeholder="Calle, colonia, ciudad" />
              </CardContent>
            </Card>

            {/* Property */}
            <Card>
              <CardHeader><CardTitle>Características del inmueble</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Área a climatizar" required type="number" min={1} suffix="m²"
                    value={form.area_m2} onChange={(e) => set('area_m2', e.target.value)} placeholder="80" />
                  <Input label="Altura de techo" type="number" min={2} max={10} step={0.1} suffix="m"
                    value={form.ceiling_height_m} onChange={(e) => set('ceiling_height_m', e.target.value)} />
                </div>
                <Select label="Zona climática" required options={climateOptions}
                  value={form.climate_zone} onChange={(e) => set('climate_zone', e.target.value)} />
                <Select label="Tipo de construcción" required options={buildOptions}
                  value={form.build_type} onChange={(e) => set('build_type', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Número de ocupantes" type="number" min={0} value={form.num_occupants}
                    onChange={(e) => set('num_occupants', e.target.value)} placeholder="Auto" hint="Dejar vacío para calcular automáticamente" />
                  <Input label="Número de ventanas" type="number" min={0} value={form.num_windows}
                    onChange={(e) => set('num_windows', e.target.value)} placeholder="Auto" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={form.has_kitchen}
                    onChange={(e) => set('has_kitchen', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-gray-700">El espacio incluye cocina o área de calor adicional</span>
                </label>
              </CardContent>
            </Card>

            {/* Equipment */}
            <Card>
              <CardHeader><CardTitle>Selección de equipo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!calc ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Completa el área y zona climática para ver equipos recomendados.</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">
                      Capacidad recomendada: <strong className="text-gray-900">{calc.tons_recommended} ton</strong> ({calc.btu_load.toLocaleString()} BTU/h)
                    </p>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {suitableEquipment.map((e) => (
                        <label
                          key={e.id}
                          className={`flex items-center gap-4 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            form.equipment_id === e.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <input type="radio" name="equipment" value={e.id} className="accent-brand-600"
                            checked={form.equipment_id === e.id} onChange={() => set('equipment_id', e.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{e.brand} {e.model}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{e.tons} ton · SEER {e.seer} · {e.refrigerant} · {e.type.replace('_', ' ')}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(e.unit_cost)}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Costs */}
            <Card>
              <CardHeader><CardTitle>Parámetros de costo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Tarifa mano de obra" type="number" prefix="$" suffix="/hr"
                    value={form.labor_rate} onChange={(e) => set('labor_rate', e.target.value)} />
                  <Input label="Margen de ganancia" type="number" min={0} max={100} suffix="%"
                    value={form.margin_pct} onChange={(e) => set('margin_pct', e.target.value)} />
                </div>
                <Input label="Notas internas" value={form.notes}
                  onChange={(e) => set('notes', e.target.value)} placeholder="Observaciones del proyecto..." />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Calc result */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-brand-600" />
                  <CardTitle>Carga térmica calculada</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!calc ? (
                  <p className="text-sm text-gray-400 text-center py-4">Esperando datos del inmueble...</p>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center py-4 bg-brand-50 rounded-xl">
                      <div className="text-4xl font-extrabold text-brand-700">{calc.tons_recommended}</div>
                      <div className="text-sm text-brand-500 font-medium mt-1">Toneladas recomendadas</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ['BTU/h total', calc.btu_load.toLocaleString()],
                        ['kW enfriamiento', `${calc.kw_cooling} kW`],
                        ['Carga neta', `${calc.tons.toFixed(2)} ton`],
                        ['Área', `${calc.area_sqft.toLocaleString()} ft²`],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                          <div className="text-gray-400 text-xs">{k}</div>
                          <div className="font-semibold text-gray-800 mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700 font-medium">Ver desglose BTU</summary>
                      <div className="mt-2 space-y-1 pl-2">
                        {Object.entries(calc.breakdown).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                            <span className="font-medium">{v.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <CardTitle>Resumen de costos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!costs ? (
                  <p className="text-sm text-gray-400 text-center py-4">Selecciona un equipo para ver el costo.</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    {[
                      { label: 'Equipo', value: costs.cost_equipment },
                      { label: 'Ductos', value: costs.cost_ducts },
                      { label: 'Tuberías / refrigerante', value: costs.cost_piping },
                      { label: `Mano de obra (${costs.labor_hours}h)`, value: costs.cost_labor },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between text-gray-600">
                        <span>{row.label}</span>
                        <span>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-2 flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(costs.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Margen ({costs.margin_pct}%)</span>
                      <span>{formatCurrency(costs.total - costs.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-brand-700">{formatCurrency(costs.total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
            )}

            <Button type="submit" size="lg" loading={saving} className="w-full">
              <Zap className="w-5 h-5" />
              Guardar cotización
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
