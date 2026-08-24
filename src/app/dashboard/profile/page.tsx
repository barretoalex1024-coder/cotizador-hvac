'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const [form, setForm] = useState<Partial<Profile>>({})
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setForm(data ?? {})
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'labor_rate' || name === 'default_margin' ? Number(value) : value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .upsert({ id: user.id, ...form })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <Header title="Mi Empresa" subtitle="Información que aparece en tus propuestas PDF" />

      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Datos de la empresa</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="pb-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Correo de la cuenta</p>
                <p className="text-sm font-medium text-gray-700">{email || '—'}</p>
              </div>

              <Input
                label="Nombre de la empresa"
                name="company_name"
                type="text"
                value={form.company_name ?? ''}
                onChange={handleChange}
                placeholder="Refrigeración ABC S.A. de C.V."
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Teléfono"
                  name="phone"
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={handleChange}
                  placeholder="+52 55 1234 5678"
                  disabled={loading}
                />
                <Input
                  label="Ciudad"
                  name="city"
                  type="text"
                  value={form.city ?? ''}
                  onChange={handleChange}
                  placeholder="Ciudad de México"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parámetros de cotización</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-gray-500">Estos valores se usan por defecto en cada nueva cotización.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tarifa de mano de obra"
                  name="labor_rate"
                  type="number"
                  min={0}
                  step={5}
                  prefix="$"
                  suffix="/hr"
                  value={form.labor_rate ?? 65}
                  onChange={handleChange}
                  hint="Costo por hora de instalación"
                  disabled={loading}
                />
                <Input
                  label="Margen de ganancia"
                  name="default_margin"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  value={form.default_margin ?? 25}
                  onChange={handleChange}
                  hint="Porcentaje sobre el costo total"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button type="submit" loading={saving}>
              Guardar cambios
            </Button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
