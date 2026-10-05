import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { generarListaMateriales, type Proyecto, type TipoSistema } from '@/cotizador/materiales.ts'

const TIPOS: TipoSistema[] = ['minisplit', 'split_ducto', 'paquete']

// POST { tipoSistema, toneladas, distanciaTuberiaPies, notas?, proyectoId? }
// Siempre responde 200 con una lista: si OmniRoute falla, origen = "plantilla" y trae aviso.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const toneladas = Number(body?.toneladas)
  const distancia = Number(body?.distanciaTuberiaPies)
  if (!TIPOS.includes(body?.tipoSistema) || !(toneladas > 0) || !(distancia >= 0)) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const proyecto: Proyecto = {
    tipoSistema: body.tipoSistema,
    toneladas,
    distanciaTuberiaPies: distancia,
    notas: typeof body.notas === 'string' ? body.notas.slice(0, 2000) : undefined,
  }

  const lista = await generarListaMateriales(proyecto, {
    estimadoId: typeof body.proyectoId === 'string' ? body.proyectoId : undefined,
  })
  return NextResponse.json({ data: lista })
}
