import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  PDF_BLUE, PDF_DARK, PDF_LIGHT, PDF_GRAY,
  MONTHS, loadLogo, addPageHeader, addAllPageFooters,
  sectionBlock, labelValue, fmtDatePDF, fmtCurrencyPDF,
} from './pdfShared'
import { PAYMENT_TYPE_LABELS } from '../constants/paymentTypes'

const PDF_RED = [220, 38, 38]

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

// Helper central para localizar configuração financeira de uma especialidade no paciente.
// Tenta: 1) match direto por key; 2) match por label via specialtiesData.
export function findPatientSpecialtyConfig(patient, consultationSpecialty, specialtiesData) {
  if (!patient || !consultationSpecialty) return null
  const byKey = patient.specialties?.find(s => s.key === consultationSpecialty)
  if (byKey) return byKey
  if (specialtiesData?.length) {
    const sd = specialtiesData.find(s =>
      s.label?.toLowerCase() === consultationSpecialty?.toLowerCase()
    )
    if (sd) return patient.specialties?.find(s => s.key === sd.key) || null
  }
  return null
}

// Resolve valor de paciente para uma consulta segundo a modalidade de pagamento.
// Retorna { display, amount, paymentType, isUnconfigured }
function resolvePatientValue(c, patient, monthlyTracked, specialtiesData) {
  const spec = findPatientSpecialtyConfig(patient, c.effectiveSpecialty || c.specialty, specialtiesData)

  if (!spec) {
    return { display: 'Não configurado', amount: 0, paymentType: 'POST_PER_SESSION', isUnconfigured: true }
  }

  const paymentType = spec.paymentType || 'POST_PER_SESSION'

  if (paymentType === 'POST_MONTHLY') {
    const month = c.date?.slice(0, 7)
    const key = `${c.specialty}__${month}`
    if (month && !monthlyTracked.has(key)) {
      const mv = spec?.monthlyPatientValue
      monthlyTracked.set(key, mv != null && mv !== '' ? (parseFloat(mv) || 0) : 0)
    }
    return { display: 'Mensal', amount: 0, paymentType, isUnconfigured: false }
  }

  if (paymentType === 'PREPAID_PACKAGE') {
    return { display: 'Pré-pago', amount: 0, paymentType, isUnconfigured: false }
  }

  // POST_PER_SESSION | PAY_PER_SESSION
  const pv = spec?.patientValue
  const amount = pv != null && pv !== '' ? (parseFloat(pv) || 0) : 0
  return { display: fmtCurrencyPDF(amount), amount, paymentType, isUnconfigured: false }
}

// Resolve valor de terapeuta para uma consulta segundo a modalidade de pagamento.
// Retorna { display, amount, paymentType, isUnconfigured }
function resolveTherapistValue(c, patient, monthlyTracked, specialtiesData) {
  const spec = findPatientSpecialtyConfig(patient, c.effectiveSpecialty || c.specialty, specialtiesData)

  if (!spec) {
    return { display: 'Não configurado', amount: 0, paymentType: 'POST_PER_SESSION', isUnconfigured: true }
  }

  const paymentType = spec?.paymentType || 'POST_PER_SESSION'

  if (paymentType === 'POST_MONTHLY') {
    const month = c.date?.slice(0, 7)
    const key = `${c.effectiveSpecialty || c.specialty}__${month}`
    if (month && !monthlyTracked.has(key)) {
      const mv = spec?.monthlyTherapistValue
      monthlyTracked.set(key, mv != null && mv !== '' ? (parseFloat(mv) || 0) : 0)
    }
    return { display: 'Mensal', amount: 0, paymentType, isUnconfigured: false }
  }

  if (paymentType === 'PREPAID_PACKAGE') {
    const tv = spec?.therapistValue
    const amount = tv != null && tv !== '' ? (parseFloat(tv) || 0) : 0
    return { display: amount > 0 ? fmtCurrencyPDF(amount) : 'Pré-pago', amount, paymentType, isUnconfigured: false }
  }

  // POST_PER_SESSION | PAY_PER_SESSION
  const tv = spec?.therapistValue
  const amount = tv != null && tv !== '' ? (parseFloat(tv) || 0) : 0
  return { display: fmtCurrencyPDF(amount), amount, paymentType, isUnconfigured: false }
}

// Renderiza o bloco de totais após a tabela de consultas
function renderTotals(doc, y, pageW, margin, totalCount, totalPostSessao, monthlyTracked, totalPrepago, hasUnconfigured) {
  const totalMensal = [...monthlyTracked.values()].reduce((a, b) => a + b, 0)
  const grandTotal = totalPostSessao + totalMensal + totalPrepago

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_BLUE)
  doc.text(`Total de atendimentos: ${totalCount}`, margin, y + 4)

  const hasMixed = (totalPostSessao > 0 || totalMensal > 0 || totalPrepago > 0) &&
    [totalPostSessao > 0, totalMensal > 0, totalPrepago > 0].filter(Boolean).length > 1

  let lastY = y + 4

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
    lastY = lineY
  } else {
    doc.text(`Total do período: ${fmtCurrencyPDF(grandTotal)}`, pageW - margin, y + 4, { align: 'right' })
    lastY = y + 4
  }

  if (hasUnconfigured) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...PDF_RED)
    doc.text(
      '* Existem atendimentos com especialidade sem configuração financeira. Revise o cadastro do paciente.',
      margin, lastY + 7
    )
    doc.setTextColor(...PDF_DARK)
  }
}

// ─── Card renderer: cada atendimento como bloco 2 colunas ─────
function drawAttendanceCard(doc, data, y, pageH, margin, pageW) {
  const {
    date, time, statusName, typeName,
    therapistName, specLabel, credential,
    modalityLabel, valueDisplay, objective,
    isValueUnconfigured,
  } = data

  const contentW = pageW - margin * 2
  const leftW = Math.round(contentW * 0.55)
  const rightW = contentW - leftW
  const divX = margin + leftW

  const CARD_PAD = 3.5
  const FIELD_H = 9
  const F_LBL = 2.5
  const F_VAL = 7
  const ROW_SEP = 1
  const CARD_GAP = 3.5
  const RIGHT_LH = 4.3

  const leftH = CARD_PAD + 3 * FIELD_H + 2 * ROW_SEP + CARD_PAD

  const rightTextW = rightW - CARD_PAD * 2
  const objLines = doc.splitTextToSize(objective || '—', rightTextW)
  const rightH = CARD_PAD + F_LBL + 2 + objLines.length * RIGHT_LH + CARD_PAD

  const cardH = Math.max(leftH, rightH)

  if (y + cardH > pageH - 18) {
    doc.addPage()
    y = 18
  }

  doc.setFillColor(250, 251, 253)
  doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'F')
  doc.setFillColor(244, 246, 253)
  doc.rect(divX + 0.3, y + 0.3, rightW - 0.3, cardH - 0.6, 'F')

  doc.setDrawColor(208, 213, 227)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'S')
  doc.line(divX, y, divX, y + cardH)

  const rows = [
    [
      { label: 'DATA', value: time ? `${date}  ${time}` : date },
      { label: 'STATUS', value: statusName },
      { label: 'TIPO', value: typeName },
    ],
    [
      { label: 'TERAPEUTA', value: therapistName },
      { label: 'ESPECIALIDADE', value: specLabel },
      { label: 'CONSELHO', value: credential },
    ],
    [
      { label: 'MODALIDADE', value: modalityLabel, isWarning: isValueUnconfigured },
      { label: 'VALOR', value: valueDisplay, isWarning: isValueUnconfigured },
    ],
  ]

  let ly = y + CARD_PAD
  rows.forEach((row, ri) => {
    if (ri > 0) {
      doc.setDrawColor(213, 218, 230)
      doc.setLineWidth(0.15)
      doc.line(margin + 1, ly, divX - 1, ly)
      ly += ROW_SEP
    }

    const nFields = row.length
    const fieldW = leftW / nFields

    row.forEach((field, fi) => {
      if (fi > 0) {
        doc.setDrawColor(220, 224, 235)
        doc.setLineWidth(0.12)
        doc.line(margin + fi * fieldW, ly, margin + fi * fieldW, ly + FIELD_H - 1)
      }

      const fx = margin + fi * fieldW + CARD_PAD
      const maxFW = fieldW - CARD_PAD * 1.8

      doc.setFontSize(5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 153, 170)
      doc.text(field.label, fx, ly + F_LBL)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(field.isWarning ? PDF_RED : PDF_DARK))
      doc.text(doc.splitTextToSize(field.value, maxFW)[0] || field.value, fx, ly + F_VAL)
      doc.setTextColor(...PDF_DARK)
    })

    ly += FIELD_H
  })

  const rtx = divX + CARD_PAD
  let ry = y + CARD_PAD

  doc.setFontSize(5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_BLUE)
  doc.text('OBJETIVO DA SESSÃO', rtx, ry + F_LBL)
  ry += F_LBL + 2

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_DARK)
  objLines.forEach(line => {
    doc.text(line, rtx, ry + RIGHT_LH - 0.5)
    ry += RIGHT_LH
  })

  return y + cardH + CARD_GAP
}

// ─── Relatório 1: Demonstrativo de Pagamento ──────────────────

export async function generateConsultasPacientePDF({
  patient, guardians, consultations, therapists,
  consultationStatuses, appointmentTypes, specialtiesData,
  filter, companySettings = null,
  draftMode = false, nfNumber = null, nfDate = null,
  returnBlob = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildReportHeader(doc, 'Demonstrativo de Pagamento', period, companySettings)

  if (nfNumber || nfDate) {
    const nfLine = [
      nfNumber ? `NF nº ${nfNumber}` : '',
      nfDate ? `Emitida em ${fmtDatePDF(nfDate)}` : '',
    ].filter(Boolean).join('  —  ')
    doc.setFillColor(240, 253, 244)
    doc.setDrawColor(187, 247, 208)
    doc.roundedRect(margin, y, pageW - margin * 2, 8, 1.5, 1.5, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text(nfLine, pageW / 2, y + 5.5, { align: 'center' })
    doc.setTextColor(...PDF_DARK)
    y += 12
  }

  y = sectionBlock(doc, 'Dados do Paciente', y)
  const col1 = margin, col2 = pageW / 2 + 5
  let y1 = y, y2 = y
  y1 = labelValue(doc, 'Nome Completo', patient.fullName, col1, y1, 80) + 2
  y1 = labelValue(doc, 'Data de Nascimento', fmtDatePDF(patient.dateOfBirth), col1, y1, 80) + 2
  y1 = labelValue(doc, 'CPF', patient.cpf, col1, y1, 80) + 2
  y2 = labelValue(doc, 'Diagnóstico Principal', patient.diagnosis, col2, y2, 80) + 2
  y = Math.max(y1, y2) + 6

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

  y = sectionBlock(doc, `Atendimentos Realizados no Período: ${period}`, y)

  let totalPostSessao = 0
  let totalPrepago = 0
  let hasUnconfigured = false
  const monthlyTracked = new Map()

  if (consultations.length === 0) {
    doc.setFontSize(8); doc.setTextColor(...PDF_GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    const pageH = doc.internal.pageSize.height

    // Expand secondary therapist participants as separate billing entries
    const expandedConsultations = []
    for (const c of consultations) {
      expandedConsultations.push(c)
      for (const ct of (c.consultationTherapists || []).filter(t => !t.isPrimary)) {
        if (therapists.find(t => t.id === ct.therapistId)) {
          expandedConsultations.push({ ...c, therapistId: ct.therapistId, effectiveSpecialty: ct.specialty })
        }
      }
    }

    for (const c of expandedConsultations) {
      const therapist = therapists.find(t => t.id === c.therapistId)
      const effSpec = c.effectiveSpecialty || c.specialty
      const spec = specialtiesData.find(s => s.key === effSpec)
      const credential = therapist?.therapistSpecialties?.find(s => s.specialty === effSpec)?.credential || '—'
      const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
      const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)

      const { display: valueDisplay, amount, paymentType, isUnconfigured } = resolvePatientValue(c, patient, monthlyTracked, specialtiesData)
      if (isUnconfigured) hasUnconfigured = true
      if (paymentType === 'POST_PER_SESSION' || paymentType === 'PAY_PER_SESSION') totalPostSessao += amount
      else if (paymentType === 'PREPAID_PACKAGE') totalPrepago += amount

      y = drawAttendanceCard(doc, {
        date: fmtDatePDF(c.date),
        time: c.time ? c.time.slice(0, 5) : '',
        statusName: status?.name || '—',
        typeName: type?.name || '—',
        therapistName: therapist?.name || '—',
        specLabel: spec?.label || effSpec || '—',
        credential,
        modalityLabel: isUnconfigured ? 'Não configurada' : (PAYMENT_TYPE_LABELS[paymentType] || paymentType),
        valueDisplay,
        objective: c.mainObjective || '—',
        isValueUnconfigured: isUnconfigured,
      }, y, pageH, margin, pageW)
    }

    renderTotals(doc, y, pageW, margin, expandedConsultations.length, totalPostSessao, monthlyTracked, totalPrepago, hasUnconfigured)
  }

  addAllPageFooters(doc)

  if (draftMode) {
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setGState(new doc.GState({ opacity: 0.07 }))
      doc.setFontSize(80)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 80)
      doc.text('', pageW / 2, doc.internal.pageSize.height / 2, { angle: 45, align: 'center' })
      doc.setGState(new doc.GState({ opacity: 1 }))
      doc.setTextColor(...PDF_DARK)
    }
  }

  const suffix = draftMode ? '_RASCUNHO' : ''
  const fileName = `demonstrativo_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}${suffix}.pdf`

  const totalMensal = [...monthlyTracked.values()].reduce((a, b) => a + b, 0)
  const totalAmount = totalPostSessao + totalMensal + totalPrepago

  if (returnBlob) {
    const blob = doc.output('blob')
    return { blob, filename: fileName, totalAmount }
  }

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

  y = sectionBlock(doc, `Atendimentos Realizados no Período: ${period}`, y)

  if (consultations.length === 0) {
    doc.setFontSize(8); doc.setTextColor(...PDF_GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    let totalPostSessao = 0
    let totalPrepago = 0
    let hasUnconfigured = false
    const monthlyTracked = new Map()

    const body = consultations.map(c => {
      const patient = patients.find(p => p.id === c.patientId)
      const effSpec = c.effectiveSpecialty || c.specialty
      const spec = specialtiesData.find(s => s.key === effSpec)
      const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
      const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)

      const { display, amount, paymentType, isUnconfigured } = resolveTherapistValue(c, patient, monthlyTracked, specialtiesData)
      if (isUnconfigured) hasUnconfigured = true
      if (paymentType === 'POST_PER_SESSION' || paymentType === 'PAY_PER_SESSION') totalPostSessao += amount
      else if (paymentType === 'PREPAID_PACKAGE') totalPrepago += amount

      return [
        fmtDatePDF(c.date), c.time ? c.time.slice(0, 5) : '—',
        patient?.fullName || '—', spec?.label || effSpec || '—',
        status?.name || '—', type?.name || '—',
        display, c.mainObjective || '—',
      ]
    })

    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Paciente', 'Especialidade', 'Status', 'Tipo', 'Valor (R$)', 'Objetivo da Sessão']],
      body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 12 }, 2: { cellWidth: 35 },
        3: { cellWidth: 26 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 },
        6: { cellWidth: 20, halign: 'right' }, 7: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6 && data.cell.text[0] === 'Não configurado') {
          data.cell.styles.textColor = PDF_RED
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = doc.lastAutoTable.finalY + 4
    renderTotals(doc, y, pageW, margin, consultations.length, totalPostSessao, monthlyTracked, totalPrepago, hasUnconfigured)
  }

  addAllPageFooters(doc)
  const fileName = `consultas_terapeuta_${therapist.name.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}
