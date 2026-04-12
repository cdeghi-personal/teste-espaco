import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE  = [30, 64, 175]
const GRAY  = [107, 114, 128]
const DARK  = [17, 24, 39]
const LIGHT = [249, 250, 251]

function formatDate(str) {
  if (!str) return '—'
  try { const [y, m, d] = str.split('-'); return `${d}/${m}/${y}` }
  catch { return str }
}

function formatPeriod(filter) {
  if (filter.type === 'month') {
    const [y, m] = filter.month.split('-')
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    return `${months[parseInt(m) - 1]}/${y}`
  }
  return `${formatDate(filter.from)} a ${formatDate(filter.to)}`
}

async function buildHeader(doc, subtitle, period) {
  const pageW = doc.internal.pageSize.width
  const margin = 14

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 22, 'F')

  try {
    const resp = await fetch(`${window.location.origin}/logo.jpg`)
    const blob = await resp.blob()
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    doc.addImage(dataUrl, 'JPEG', margin, 2, 18, 18)
  } catch { /* continua sem logo */ }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Espaço Casa Amarela', margin + 21, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, margin + 21, 16)

  const now = new Date()
  doc.setFontSize(7)
  doc.setTextColor(200, 210, 255)
  doc.text(
    `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pageW - margin, 18, { align: 'right' }
  )

  // Período em destaque
  doc.setFillColor(245, 247, 255)
  doc.setDrawColor(220, 225, 255)
  doc.roundedRect(margin, 26, pageW - margin * 2, 9, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text(`Período: ${period}`, margin + 3, 32)
  doc.setTextColor(...DARK)

  return 42
}

function sectionTitle(doc, text, y) {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  doc.setFillColor(...BLUE)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), margin + 3, y + 5)
  doc.setTextColor(...DARK)
  return y + 12
}

function labelValue(doc, label, value, x, y, maxWidth = 80) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  const lines = doc.splitTextToSize(value || '—', maxWidth)
  doc.text(lines, x, y + 4)
  return y + 4 + lines.length * 4
}

function addFooters(doc) {
  const total = doc.internal.getNumberOfPages()
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const margin = 14
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Espaço Casa Amarela — Documento confidencial', margin, pageH - 7)
    doc.text(`Página ${i} de ${total}`, pageW - margin, pageH - 7, { align: 'right' })
  }
}

// ─── Relatório 1: Consultas por Paciente ──────────────────────
export async function generateConsultasPacientePDF({
  patient,
  guardians,
  consultations,
  therapists,
  consultationStatuses,
  appointmentTypes,
  specialtiesData,
  filter,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildHeader(doc, 'Relatório de Consultas por Paciente', period)

  // ── Dados do Paciente ──
  y = sectionTitle(doc, 'Dados do Paciente', y)
  const col1 = margin, col2 = pageW / 2 + 5
  let y1 = y, y2 = y
  y1 = labelValue(doc, 'Nome Completo', patient.fullName, col1, y1, 80) + 2
  y1 = labelValue(doc, 'Data de Nascimento', formatDate(patient.dateOfBirth), col1, y1, 80) + 2
  y1 = labelValue(doc, 'CPF', patient.cpf, col1, y1, 80) + 2
  y2 = labelValue(doc, 'Diagnóstico Principal', patient.diagnosis, col2, y2, 80) + 2
  y = Math.max(y1, y2) + 6

  // ── Responsáveis (pai e mãe) ──
  const paiMae = guardians.filter(g =>
    ['pai', 'mãe', 'mae', 'pai/mãe', 'mãe/pai'].some(rel =>
      (g.relationship || '').toLowerCase().includes(rel.replace('ã', 'a').replace('ã', 'a'))
    ) ||
    ['pai', 'mãe', 'mae'].includes((g.relationship || '').toLowerCase())
  )
  // fallback: mostra todos os responsáveis se não encontrar pai/mãe
  const guardiansToShow = paiMae.length > 0 ? paiMae : guardians.slice(0, 2)

  if (guardiansToShow.length > 0) {
    y = sectionTitle(doc, 'Dados dos Responsáveis', y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Nome', 'CPF', 'Parentesco']],
      body: guardiansToShow.map(g => [g.fullName || '—', g.cpf || '—', g.relationship || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Atendimentos ──
  y = sectionTitle(doc, `Atendimentos Realizados no Período: ${period}`, y)

  if (consultations.length === 0) {
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Terapeuta', 'Especialidade', 'Conselho', 'Status', 'Tipo', 'Objetivo da Sessão']],
      body: consultations.map(c => {
        const therapist = therapists.find(t => t.id === c.therapistId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        const specCredential = therapist?.therapistSpecialties?.find(s => s.specialty === c.specialty)?.credential || '—'
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        return [
          formatDate(c.date),
          c.time ? c.time.slice(0, 5) : '—',
          therapist?.name || '—',
          spec?.label || c.specialty || '—',
          specCredential,
          status?.name || '—',
          type?.name || '—',
          c.mainObjective || '—',
        ]
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 12 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 'auto' },
      },
    })
    y = doc.lastAutoTable.finalY + 4

    // Totalizador
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(`Total de atendimentos no período: ${consultations.length}`, margin, y + 4)
  }

  addFooters(doc)

  const fileName = `consultas_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}

// ─── Relatório 2: Consultas por Terapeuta ─────────────────────
export async function generateConsultasTerapeutaPDF({
  therapist,
  consultations,
  patients,
  consultationStatuses,
  appointmentTypes,
  specialtiesData,
  filter,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const period = formatPeriod(filter)

  let y = await buildHeader(doc, 'Relatório de Consultas por Terapeuta', period)

  // ── Dados do Terapeuta ──
  y = sectionTitle(doc, 'Dados do Terapeuta', y)

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
  y = sectionTitle(doc, `Atendimentos Realizados no Período: ${period}`, y)

  if (consultations.length === 0) {
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('Nenhum atendimento encontrado no período selecionado.', margin, y + 4)
    y += 12
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Data', 'Hora', 'Paciente', 'Especialidade', 'Status', 'Tipo', 'Objetivo da Sessão']],
      body: consultations.map(c => {
        const patient = patients.find(p => p.id === c.patientId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        return [
          formatDate(c.date),
          c.time ? c.time.slice(0, 5) : '—',
          patient?.fullName || '—',
          spec?.label || c.specialty || '—',
          status?.name || '—',
          type?.name || '—',
          c.mainObjective || '—',
        ]
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 12 },
        2: { cellWidth: 38 },
        3: { cellWidth: 28 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 'auto' },
      },
    })
    y = doc.lastAutoTable.finalY + 4

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(`Total de atendimentos no período: ${consultations.length}`, margin, y + 4)
  }

  addFooters(doc)

  const fileName = `consultas_terapeuta_${therapist.name.replace(/\s+/g, '_').toLowerCase()}_${period.replace(/\//g, '-').replace(/\s/g, '_')}.pdf`
  doc.save(fileName)
}
