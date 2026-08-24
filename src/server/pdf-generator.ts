import PDFDocument from 'pdfkit'
import type { Project, Estimate, EquipmentCatalog, Profile } from '@/types/database'
import { CLIMATE_ZONES, BUILD_TYPES, type ClimateZoneKey, type BuildTypeKey } from '@/lib/constants'

interface PDFData {
  project: Project
  estimate: Estimate & { equipment_catalog: EquipmentCatalog | null }
  profile: Profile
}

const BRAND_BLUE = '#2563eb'
const DARK = '#0f172a'
const GRAY = '#64748b'
const LIGHT_GRAY = '#f1f5f9'
const WHITE = '#ffffff'

function formatMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
}

function formatNum(n: number) {
  return new Intl.NumberFormat('es-MX').format(n)
}

export async function generateProposalPDF(data: PDFData): Promise<Buffer> {
  const { project, estimate, profile } = data
  const equip = estimate.equipment_catalog

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, info: { Title: `Propuesta HVAC — ${project.client_name}`, Author: profile.company_name ?? 'HVAC Pro' } })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width
    const margin = 50

    // ── HELPERS ──────────────────────────────────────────────
    function sectionTitle(text: string, y?: number) {
      if (y !== undefined) doc.y = y
      doc
        .fillColor(BRAND_BLUE)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(text.toUpperCase(), margin, doc.y, { characterSpacing: 1 })
      doc.moveDown(0.3)
      doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor(BRAND_BLUE).lineWidth(1).stroke()
      doc.moveDown(0.5)
    }

    function row(label: string, value: string, light = false) {
      const y = doc.y
      doc.fillColor(light ? LIGHT_GRAY : WHITE).rect(margin, y, pageW - margin * 2, 20).fill()
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label, margin + 8, y + 6, { width: 200 })
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(value, margin + 210, y + 6, { width: pageW - margin * 2 - 218, align: 'right' })
      doc.y = y + 22
    }

    function costRow(label: string, value: number, light = false, bold = false) {
      const y = doc.y
      doc.fillColor(light ? LIGHT_GRAY : WHITE).rect(margin, y, pageW - margin * 2, 22).fill()
      doc.fillColor(bold ? DARK : GRAY).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, margin + 8, y + 7, { width: 300 })
      doc.fillColor(bold ? DARK : DARK).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(formatMXN(value), margin + 8, y + 7, { width: pageW - margin * 2 - 16, align: 'right' })
      doc.y = y + 24
    }

    // ── PAGE 1: COVER ─────────────────────────────────────────
    doc.fillColor(BRAND_BLUE).rect(0, 0, pageW, 200).fill()

    doc.fillColor(WHITE).fontSize(28).font('Helvetica-Bold').text('HVAC PRO', margin, 60)
    doc.fillColor('#93c5fd').fontSize(11).font('Helvetica').text('Sistema Profesional de Cotización HVAC', margin, 96)

    doc.fillColor(WHITE).fontSize(20).font('Helvetica-Bold').text('PROPUESTA TÉCNICA Y ECONÓMICA', margin, 140)
    doc.fillColor('#bfdbfe').fontSize(10).font('Helvetica').text(
      `Folio: #${project.id.slice(0, 8).toUpperCase()}  ·  Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      margin, 165
    )

    // Company info box
    doc.y = 230
    doc.fillColor(LIGHT_GRAY).rect(margin, 220, pageW - margin * 2, 80).fill()
    doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text(profile.company_name ?? 'Empresa Contratista', margin + 16, 234)
    if (profile.city) doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`📍 ${profile.city}`, margin + 16, 252)
    if (profile.phone) doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`📞 ${profile.phone}`, margin + 16, 266)

    // Client info box
    doc.y = 330
    sectionTitle('Información del cliente', 330)

    row('Cliente', project.client_name, true)
    if (project.client_email) row('Correo electrónico', project.client_email)
    if (project.client_phone) row('Teléfono', project.client_phone, true)
    if (project.address) row('Dirección del inmueble', project.address)

    // ── PAGE 2: TECHNICAL SPECS ───────────────────────────────
    doc.addPage()

    sectionTitle('Especificaciones técnicas del proyecto')

    const climate = CLIMATE_ZONES[project.climate_zone as ClimateZoneKey]
    const buildType = BUILD_TYPES[project.build_type as BuildTypeKey]

    row('Área a climatizar', `${project.area_m2} m² (${Math.round(project.area_m2 * 10.764).toLocaleString()} ft²)`, true)
    row('Altura de techo', `${project.ceiling_height_m} metros`)
    row('Zona climática', climate?.label ?? project.climate_zone, true)
    row('Tipo de construcción', buildType?.label ?? project.build_type)

    doc.moveDown(1.5)
    sectionTitle('Resultados del cálculo térmico (método manual simplificado)')

    row('Carga térmica calculada', estimate.btu_load != null ? `${formatNum(estimate.btu_load)} BTU/h` : '—', true)
    row('Capacidad en toneladas', estimate.tons != null ? `${estimate.tons} toneladas de refrigeración` : '—')
    row('Equivalente en kW', estimate.tons != null ? `${Math.round(estimate.tons * 3.517 * 100) / 100} kW` : '—', true)

    if (equip) {
      doc.moveDown(1.5)
      sectionTitle('Equipo propuesto')

      row('Marca / Modelo', `${equip.brand} ${equip.model}`, true)
      row('Tipo de equipo', equip.type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      row('Capacidad', `${equip.tons} toneladas`, true)
      row('SEER (eficiencia)', equip.seer != null ? String(equip.seer) : '—')
      row('Refrigerante', equip.refrigerant ?? '—', true)
      row('Horas de instalación estimadas', `${equip.install_hours} horas`)
    }

    // ── PAGE 3: COSTS ─────────────────────────────────────────
    doc.addPage()

    sectionTitle('Desglose económico')

    costRow('Equipo de climatización', estimate.cost_equipment, true)
    costRow('Sistema de ductos', estimate.cost_ducts)
    costRow('Tuberías y refrigerante', estimate.cost_piping, true)
    costRow(`Mano de obra (${estimate.labor_hours} horas)`, estimate.cost_labor)

    doc.moveDown(0.5)
    doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor(LIGHT_GRAY).lineWidth(1).stroke()
    doc.moveDown(0.5)

    costRow('Subtotal', estimate.subtotal, true)
    costRow(`Margen de ganancia (${estimate.margin_pct}%)`, estimate.total - estimate.subtotal)

    doc.moveDown(0.5)
    doc.fillColor(BRAND_BLUE).rect(margin, doc.y, pageW - margin * 2, 36).fill()
    const totalY = doc.y + 12
    doc.fillColor(WHITE).fontSize(12).font('Helvetica-Bold').text('TOTAL PROPUESTA', margin + 16, totalY)
    doc.fillColor(WHITE).fontSize(14).font('Helvetica-Bold').text(formatMXN(estimate.total), margin + 16, totalY, { width: pageW - margin * 2 - 32, align: 'right' })
    doc.y += 50

    if (estimate.notes) {
      doc.moveDown(1)
      sectionTitle('Notas')
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(estimate.notes, margin, doc.y, { width: pageW - margin * 2, lineGap: 4 })
    }

    // ── PAGE 4: TERMS & SIGNATURE ─────────────────────────────
    doc.addPage()

    sectionTitle('Términos y condiciones')

    const terms = [
      '1. Esta propuesta tiene una vigencia de 30 días naturales a partir de la fecha de emisión.',
      '2. Los precios están expresados en Pesos Mexicanos (MXN) e incluyen materiales, mano de obra e instalación.',
      '3. No se incluyen trabajos de obra civil, permisos municipales ni conexiones eléctricas de alta tensión.',
      '4. El equipo tiene garantía del fabricante conforme a sus términos (consultar ficha técnica).',
      '5. La mano de obra tiene garantía de 12 meses contra defectos de instalación.',
      '6. Los pagos se realizarán: 50% al aceptar la propuesta, 50% al terminar la instalación.',
    ]

    terms.forEach((t, i) => {
      doc.fillColor(i % 2 === 0 ? WHITE : LIGHT_GRAY).rect(margin, doc.y, pageW - margin * 2, 30).fill()
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(t, margin + 10, doc.y + 10, { width: pageW - margin * 2 - 20 })
      doc.y += 32
    })

    // Signature area
    doc.y += 30
    const sigY = doc.y

    doc.fillColor(DARK).fontSize(9).font('Helvetica').text('Aprobado por el cliente:', margin, sigY)
    doc.moveTo(margin, sigY + 40).lineTo(margin + 200, sigY + 40).strokeColor(DARK).lineWidth(0.5).stroke()
    doc.fillColor(GRAY).fontSize(8).text('Firma y nombre', margin, sigY + 44)

    doc.fillColor(DARK).fontSize(9).font('Helvetica').text('Autorizado por el contratista:', margin + 280, sigY)
    doc.moveTo(margin + 280, sigY + 40).lineTo(margin + 480, sigY + 40).strokeColor(DARK).lineWidth(0.5).stroke()
    doc.fillColor(GRAY).fontSize(8).text(profile.company_name ?? 'Empresa', margin + 280, sigY + 44)

    // Footer on all pages
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i)
      doc.fillColor(GRAY).fontSize(7.5).font('Helvetica')
        .text(
          `Propuesta generada por HVAC Pro  ·  ${profile.company_name ?? ''}  ·  Página ${i + 1} de ${pages.count}`,
          margin, doc.page.height - 35,
          { width: pageW - margin * 2, align: 'center' }
        )
    }

    doc.end()
  })
}
