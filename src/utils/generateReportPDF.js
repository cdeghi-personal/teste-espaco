import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  PDF_BLUE, PDF_DARK, PDF_LIGHT, PDF_GRAY,
  MONTHS, loadLogo, addPageHeader, addAllPageFooters,
  sectionBlock, labelValue, fmtDatePDF, fmtCurrencyPDF,
} from './pdfShared'
import { PAYMENT_TYPE_LABELS } from '../constants/paymentTypes'

function formatPeriod(filter) {
  if (filter.type === 'month') {
    const [y, m] = filter.month.split('-')
    return `${MONTHS[parseInt(m) - 1]}/${y}`
  }
  return `${fmtDatePDF(filter.from)} a ${fmtDatePDF(filter.to)}`
}

async function buildReportHeader(doc, subtitle, period, companySettings) {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const logoData = await loadLogo()
  const now = new Date()
  const geradoEm = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  addPageHeader(doc, logoData, subtitle, companySettings, geradoEm)
  // Period highlight bar
  doc.setFillColor(245, 247, 255)
  doc.setDrawColor(220, 225, 255)
  doc.roundedRect(margin, 26, pageW - margin * 2, 9, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_BLUE)
  doc.text(`Período: ${period}`, margin + 3, 32)
  doc.setTextColor(...PDF_DARK)
  return 42
}

// Resolve valor de paciente para uma consulta segundo a modalidade de pagamento.
// Retorna { display: string, amount: number, paymentType: string }
function resolvePatientValue(c, patient, monthlyTracked) {
  const spec = patient.specialties?.find(s => s.key === c.specialty)
  const paymentType = spec?.paymentType || 'POST_PER_SESSION'

  if (paymentType === 'POST_MONTHLY') {
    const month = c.date?.slice(0, 7)
    const key = `${c.specialty}__${month}`
    if (month && !monthlyTracked.has(key)) {
      const mv = spec?.monthlyPatientValue
      monthlyTracked.set(key, mv != null && mv !== '' ? (parseFloat(mv) || 0) : 0)
    }
    return { display: 'Mensal', amount: 0, paymentType }
  }

  if (paymentType === 'PREPAID_PACKAGE') {
    return { display: 'Pré-pago', amount: 0, paymentType }
  }

  // POST_PER_SESSION | PAY_PER_SESSION (default)
  const pv = spec?.patientValue
  const amount = pv != null && pv !== '' ? (parseFloat(pv) || 0) : 0
  return { display: fmtCurrencyPDF(amount), amount, paymentType }
}

// Resolve valor de terapeuta para uma consulta segundo a modalidade de pagamento.
function resolveTherapistValue(c, patient, monthlyTracked) {
  const spec = patient?.specialties?.find(s => s.key === c.specialty)
  const paymentType = spec?.paymentType || 'POST_PER_SESSION'

  if (paymentType === 'POST_MONTHLY') {
    const month = c.date?.slice(0, 7)
    const key = `${c.specialty}__${month}`
    if (month && !monthlyTracked.has(key)) {
      const mv = spec?.monthlyTherapistValue
      monthlyTracked.set(key, mv != null && mv !== '' ? (parseFloat(mv) || 0) : 0)
    }
    return { display: 'Mensal', amount: 0, paymentType }
  }

  if (paymentType === 'PREPAID_PACKAGE') {
    const tv = spec?.therapistValue
    const amount = tv != null && tv !== '' ? (parseFloat(tv) || 0) : 0
    return { display: amount > 0 ? fmtCurrencyPDF(amount) : 'Pré-pago', amount, paymentType }
  }

  // POST_PER_SESSION | PAY_PER_SESSION
  const tv = spec?.therapistValue
  const amount = tv != null && tv !== '' ? (parseFloat(tv) || 0) : 0
  return { display: fmtCurrencyPDF(amount), amount, paymentType }
}

// Renderiza o bloco de totais após a tabela de consultas
function renderTotals(doc, y, pageW, margin, totalCount, totalPostSessao, monthlyTracked, totalPrepago) {
  const totalMensal = [...monthlyTracked.values()].reduce((a, b) => a + b, 0)
  const grandTotal = totalPostSessao + totalMensal + totalPrepago

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_BLUE)
  doc.text(`Total de atendimentos: ${totalCount}`, margin, y + 4)

  const hasMixed = (totalPostSessao > 0 || totalMensal > 0 || totalPrepago > 0) &&
    [totalPostSessao > 0, totalMensal > 0, totalPrepago > 0].filter(Boolean).length > 1

  if (hasMixed) {
    let lineY = y + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    if (totalPostSessao > 0) {
      doc.text(`Por consulta: ${fmtCurrencyPDF(totalPostSessao)}`, pageW - margin, lineY, { align: 'right' })
      lineY += 4.5
    }
    if (totalMensal > 0) {
      doc.text(`Mensalidades (${monthlyTracked.size} mês/espec.): ${fmtCurrencyPDF(totalMensal)}`, pageW - margin, lineY, { align: 'right' })
      lineY += 4.5
    }
    if (totalPrepago > 0) {
      doc.text(`Pré-pago: ${fmtCurrencyPDF(totalPrepago)}`, pageW - margin, lineY, { align: 'right' })
      lineY += 4.5
    }
    doc.setFont('helvetica', 'bold')
    doc.text(`Total do período: ${fmtCurrencyPDF(grandTotal)}`, pageW - margin, lineY, { align: 'right' })
  } else {
    doc.text(`Total do período: ${fmtCurrencyPDF(grandTotal)}`, pageW - margin, y + 4, { align: 'right' })
  }
}

// ─── Relatório 1: Demonstrativo de Pagamento ──────────────────

export async function generateConsultasPacientePDF({
  patient, guardians, consultations, therapists,
  consultationStatuses, appointmentTypes, specialtiesData,
  filter, companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildReportHeader(doc, 'Demonstrativo de Pagamento', period, companySettings)

  // ── Dados do Paciente ──
  y = sectionBlock(doc, 'Dados do Paciente', y)
  const col1 = margin, col2 = pageW / 2 + 5
  let y1 = y, y2 = y
  y1 = labelValue(doc, 'Nome Completo', patient.fullName, col1, y1, 80) + 2
  y1 = labelValue(doc, 'Data de Nascimento', fmtDatePDF(patient.dateOfBirth), col1, y1, 80) + 2
  y1 = labelValue(doc, 'CPF', patient.cpf, col1, y1, 80) + 2
  y2 = labelValue(doc, 'Diagnóstico Principal', patient.diagnosis, col2, y2, 80) + 2
  y = Math.max(y1, y2) + 6

  // ── Responsáveis ──
  const paiMae = guardians.filter(g =>
    ['pai', 'mãe', 'mae', 'pai/mãe', 'mãe/pai'].some(rel =>
      (g.relationship || '').toLowerCase().includes(rel.replace(/ã/g, 'a'))
    ) || ['pai', 'mãe', 'mae'].includes((g.relationship || '').toLowerCase())
  )
  const guardiansToShow = paiMae.length > 0 ? paiMae : guardians.slice(0, 2)

  if (guardiansToShow.length > 0) {
    y = sectionBlock(doc, 'Dados dos Responsáveis', y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Nome', 'CPF', 'Parentesco']],
      body: guardiansToShow.map(g => [g.fullName || '—', g.cpf || '—', g.relationship || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: PDF_LIGHT },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Atendimentos ──
  y = sectionBlock(doc, `Atendimentos Realizados no Período: ${period}`, y)

  if (consultations.length === 0) {
    doc.setFontSize(8); doc.setTextColor(...PDF_GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    let totalPostSessao = 0
    let totalPrepago = 0
    const monthlyTracked = new Map()

    const pageH = doc.internal.pageSize.height
    const contentW = pageW - margin * 2
    const leftW = Math.round(contentW * 0.38)
    const divX = margin + leftW
    const rightW = contentW - leftW
    const CARD_PAD = 3
    const ROW_H = 7
    const SEP_H = 1.5
    const RIGHT_LINE_H = 4.2
    const CARD_GAP = 3

    for (const c of consultations) {
      const therapist = therapists.find(t => t.id === c.therapistId)
      const spec = specialtiesData.find(s => s.key === c.specialty)
      const specCredential = therapist?.therapistSpecialties?.find(s => s.specialty === c.specialty)?.credential || '—'
      const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
      const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)

      const { display: valueDisplay, amount, paymentType } = resolvePatientValue(c, patient, monthlyTracked)
      if (paymentType === 'POST_PER_SESSION' || paymentType === 'PAY_PER_SESSION') totalPostSessao += amount
      else if (paymentType === 'PREPAID_PACKAGE') totalPrepago += amount

      const sections = [
        [
          { label: 'Data', value: fmtDatePDF(c.date) + (c.time ? '   ' + c.time.slice(0, 5) : '') },
          { label: 'Status', value: status?.name || '—' },
          { label: 'Tipo', value: type?.name || '—' },
        ],
        [
          { label: 'Terapeuta', value: therapist?.name || '—' },
          { label: 'Especialidade', value: spec?.label || c.specialty || '—' },
          { label: 'Conselho', value: specCredential },
        ],
        [
          { label: 'Modalidade', value: PAYMENT_TYPE_LABELS[paymentType] || paymentType },
          { label: 'Valor', value: valueDisplay },
        ],
      ]

      // Left column height
      let leftH = CARD_PAD
      sections.forEach((sec, si) => {
        if (si > 0) leftH += SEP_H
        leftH += sec.length * ROW_H
      })
      leftH += CARD_PAD

      // Right column height (objective)
      const objective = c.mainObjective || '—'
      const rightTextW = rightW - CARD_PAD * 2 - 2
      const objLines = doc.splitTextToSize(objective, rightTextW)
      const rightH = CARD_PAD + 4.5 + 2 + objLines.length * RIGHT_LINE_H + CARD_PAD

      const cardH = Math.max(leftH, rightH)

      // Page break
      if (y + cardH > pageH - 18) {
        doc.addPage()
        y = 18
      }

      // 1. Card background (left area)
      doc.setFillColor(250, 251, 253)
      doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'F')

      // 2. Right column background
      doc.setFillColor(243, 246, 255)
      doc.rect(divX + 0.3, y + 0.3, rightW - 0.3, cardH - 0.6, 'F')

      // 3. Card border (drawn on top)
      doc.setDrawColor(210, 215, 228)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'S')

      // 4. Vertical divider
      doc.setLineWidth(0.3)
      doc.line(divX, y, divX, y + cardH)

      // Left column
      let ly = y + CARD_PAD
      sections.forEach((section, si) => {
        if (si > 0) {
          doc.setDrawColor(218, 222, 233)
          doc.setLineWidth(0.2)
          doc.line(margin + 1, ly, divX - 1, ly)
          ly += SEP_H
        }
        section.forEach(({ label, value }) => {
          doc.setFontSize(5.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(150, 155, 172)
          doc.text(label.toUpperCase(), margin + CARD_PAD, ly + 3)

          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(20, 25, 42)
          const maxVW = leftW - CARD_PAD * 2
          doc.text(doc.splitTextToSize(value, maxVW)[0] || value, margin + CARD_PAD, ly + 6)
          ly += ROW_H
        })
      })

      // Right column
      const rightTextX = divX + CARD_PAD + 1.5
      let ry = y + CARD_PAD + 3.5

      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PDF_BLUE)
      doc.text('OBJETIVO DA SESSÃO', rightTextX, ry)
      ry += 4 + 2

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(20, 25, 42)
      objLines.forEach(line => {
        doc.text(line, rightTextX, ry)
        ry += RIGHT_LINE_H
      })

      y += cardH + CARD_GAP
    }

    renderTotals(doc, y, pageW, margin, consultations.length, totalPostSessao, monthlyTracked, totalPrepago)
  }

  addAllPageFooters(doc)
  const fileName = `demonstrativo_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}

// ─── Relatório 2: Consultas por Terapeuta ─────────────────────

export async function generateConsultasTerapeutaPDF({
  therapist, consultations, patients,
  consultationStatuses, appointmentTypes, specialtiesData,
  filter, companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildReportHeader(doc, 'Relatório de Consultas por Terapeuta', period, companySettings)

  // ── Dados do Terapeuta ──
  y = sectionBlock(doc, 'Dados do Terapeuta', y)
  const specialtiesStr = (therapist.therapistSpecialties || [])
    .map(s => {
      const label = specialtiesData.find(sp => sp.key === s.specialty)?.label || s.specialty
      return s.credential ? `${label} (${s.credential})` : label
    })
    .join(' | ') || specialtiesData.find(s => s.key === therapist.specialty)?.label || '—'

  const col1 = margin, col2 = pageW / 2 + 5
  let y1 = y, y2 = y
  y1 = labelValue(doc, 'Nome', therapist.name, col1, y1, 80) + 2
  y1 = labelValue(doc, 'E-mail', therapist.email, col1, y1, 80) + 2
  y1 = labelValue(doc, 'CPF', therapist.cpf, col1, y1, 80) + 2
  y2 = labelValue(doc, 'Telefone', therapist.phone, col2, y2, 80) + 2
  y2 = labelValue(doc, 'Especialidades e Conselhos', specialtiesStr, col2, y2, 80) + 2
  y = Math.max(y1, y2) + 6

  // ── Atendimentos ──
  y = sectionBlock(doc, `Atendimentos Realizados no Período: ${period}`, y)

  if (consultations.length === 0) {
    doc.setFontSize(8); doc.setTextColor(...PDF_GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    let totalPostSessao = 0
    let totalPrepago = 0
    const monthlyTracked = new Map()

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Paciente', 'Especialidade', 'Status', 'Tipo', 'Valor (R$)', 'Objetivo da Sessão']],
      body: consultations.map(c => {
        const patient = patients.find(p => p.id === c.patientId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)

        const { display, amount, paymentType } = resolveTherapistValue(c, patient, monthlyTracked)
        if (paymentType === 'POST_PER_SESSION' || paymentType === 'PAY_PER_SESSION') totalPostSessao += amount
        else if (paymentType === 'PREPAID_PACKAGE') totalPrepago += amount

        return [
          fmtDatePDF(c.date), c.time ? c.time.slice(0, 5) : '—',
          patient?.fullName || '—', spec?.label || c.specialty || '—',
          status?.name || '—', type?.name || '—',
          display, c.mainObjective || '—',
        ]
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 12 }, 2: { cellWidth: 35 },
        3: { cellWidth: 26 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 },
        6: { cellWidth: 20, halign: 'right' }, 7: { cellWidth: 'auto' },
      },
    })
    y = doc.lastAutoTable.finalY + 4
    renderTotals(doc, y, pageW, margin, consultations.length, totalPostSessao, monthlyTracked, totalPrepago)
  }

  addAllPageFooters(doc)
  const fileName = `consultas_terapeuta_${therapist.name.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}
