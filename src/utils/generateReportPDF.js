import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  PDF_BLUE, PDF_DARK, PDF_LIGHT, PDF_GRAY,
  MONTHS, loadLogo, addPageHeader, addAllPageFooters,
  sectionBlock, labelValue, fmtDatePDF, fmtCurrencyPDF,
} from './pdfShared'

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

// ─── Relatório 1: Consultas por Paciente ──────────────────────

export async function generateConsultasPacientePDF({
  patient, guardians, consultations, therapists,
  consultationStatuses, appointmentTypes, specialtiesData,
  filter, companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildReportHeader(doc, 'Relatório de Consultas por Paciente', period, companySettings)

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
    let totalValue = 0
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Terapeuta', 'Especialidade', 'Conselho', 'Status', 'Tipo', 'Valor (R$)', 'Objetivo da Sessão']],
      body: consultations.map(c => {
        const therapist = therapists.find(t => t.id === c.therapistId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        const specCredential = therapist?.therapistSpecialties?.find(s => s.specialty === c.specialty)?.credential || '—'
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        const specValue = patient.specialties?.find(s => s.key === c.specialty)?.patientValue
        const value = specValue != null && specValue !== '' ? parseFloat(specValue) : 0
        totalValue += isNaN(value) ? 0 : value
        return [
          fmtDatePDF(c.date), c.time ? c.time.slice(0, 5) : '—',
          therapist?.name || '—', spec?.label || c.specialty || '—',
          specCredential, status?.name || '—', type?.name || '—',
          fmtCurrencyPDF(value), c.mainObjective || '—',
        ]
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 12 }, 2: { cellWidth: 28 },
        3: { cellWidth: 22 }, 4: { cellWidth: 18 }, 5: { cellWidth: 20 },
        6: { cellWidth: 20 }, 7: { cellWidth: 20, halign: 'right' }, 8: { cellWidth: 'auto' },
      },
    })
    y = doc.lastAutoTable.finalY + 4
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_BLUE)
    doc.text(`Total de atendimentos: ${consultations.length}`, margin, y + 4)
    doc.text(`Total do período: ${fmtCurrencyPDF(totalValue)}`, pageW - margin, y + 4, { align: 'right' })
  }

  addAllPageFooters(doc)
  const fileName = `consultas_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
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
    let totalValue = 0
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Paciente', 'Especialidade', 'Status', 'Tipo', 'Valor (R$)', 'Objetivo da Sessão']],
      body: consultations.map(c => {
        const patient = patients.find(p => p.id === c.patientId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        const specValue = patient?.specialties?.find(s => s.key === c.specialty)?.therapistValue
        const value = specValue != null && specValue !== '' ? parseFloat(specValue) : 0
        totalValue += isNaN(value) ? 0 : value
        return [
          fmtDatePDF(c.date), c.time ? c.time.slice(0, 5) : '—',
          patient?.fullName || '—', spec?.label || c.specialty || '—',
          status?.name || '—', type?.name || '—',
          fmtCurrencyPDF(value), c.mainObjective || '—',
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
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_BLUE)
    doc.text(`Total de atendimentos: ${consultations.length}`, margin, y + 4)
    doc.text(`Total do período: ${fmtCurrencyPDF(totalValue)}`, pageW - margin, y + 4, { align: 'right' })
  }

  addAllPageFooters(doc)
  const fileName = `consultas_terapeuta_${therapist.name.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}