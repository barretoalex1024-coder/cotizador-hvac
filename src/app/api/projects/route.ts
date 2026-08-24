import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { form, calc, costs } = body

  // Validate required fields
  if (!form.client_name || !form.area_m2 || !form.climate_zone || !form.build_type) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Create project
  const { data: project, error: projError } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      client_name: form.client_name,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      address: form.address || null,
      area_m2: parseFloat(form.area_m2),
      climate_zone: form.climate_zone,
      build_type: form.build_type,
      ceiling_height_m: parseFloat(form.ceiling_height_m) || 2.7,
      status: 'draft',
    })
    .select()
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: projError?.message ?? 'Error al crear proyecto' }, { status: 500 })
  }

  // Create estimate if calculation data exists
  if (calc && costs && form.equipment_id) {
    await supabase.from('estimates').insert({
      project_id: project.id,
      btu_load: calc.btu_load,
      tons: calc.tons_recommended,
      equipment_id: form.equipment_id || null,
      cost_equipment: costs.cost_equipment,
      cost_ducts: costs.cost_ducts,
      cost_piping: costs.cost_piping,
      cost_labor: costs.cost_labor,
      labor_hours: costs.labor_hours,
      margin_pct: parseFloat(form.margin_pct) || 25,
      notes: form.notes || null,
      version: 1,
    })
  }

  return NextResponse.json({ project_id: project.id })
}
