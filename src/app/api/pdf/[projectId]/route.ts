import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { generateProposalPDF } from '@/server/pdf-generator'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Fetch project + estimate + equipment
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*, estimates(*, equipment_catalog(*))')
    .eq('id', params.projectId)
    .eq('user_id', user.id)
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const estimate = project.estimates?.[0]
  if (!estimate) {
    return NextResponse.json({ error: 'Este proyecto no tiene cotización generada aún.' }, { status: 400 })
  }

  try {
    const pdfBuffer = await generateProposalPDF({
      project,
      estimate,
      profile: profile ?? { id: user.id, company_name: null, phone: null, city: null, logo_url: null, labor_rate: 65, default_margin: 25, created_at: '' },
    })

    const filename = `propuesta-hvac-${project.client_name.toLowerCase().replace(/\s+/g, '-')}.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Error generando el PDF' }, { status: 500 })
  }
}
