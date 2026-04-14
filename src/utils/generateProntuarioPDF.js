import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Cores da identidade visual
const BLUE  = [30, 64, 175]   // brand-blue
const YELLOW = [250, 204, 21] // brand-yellow
const GRAY  = [107, 114, 128]
const DARK  = [17, 24, 39]
const LIGHT = [249, 250, 251]

function formatDate(str) {
  if (!str) return '—'
  try {
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
  } catch { return str }
}

function age(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...BLUE)
  doc.rect(14, y, doc.internal.pageSize.width - 28, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 17, y + 5)
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

export async function generateProntuarioPDF({
  patient,
  guardians,
  exams,
  medications,
  conducts,
  consultations,
  therapists,
  consultationStatuses,
  appointmentTypes,
  rooms,
  specialtiesData,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const margin = 14

  // ─── Cabeçalho ────────────────────────────────────────────────
  // Barra azul superior
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 22, 'F')

  // Logo
  try {
    const logoUrl = `${window.location.origin}/logo.jpg`
    const resp = await fetch(logoUrl)
    const blob = await resp.blob()
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    doc.addImage(dataUrl, 'JPEG', margin, 2, 18, 18)
  } catch {
    // Logo falhou — continua sem ela
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Espaço Casa Amarela', margin + 21, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Prontuário Clínico', margin + 21, 16)

  // Data de geração
  const now = new Date()
  const geradoEm = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  doc.setFontSize(7)
  doc.setTextColor(200, 210, 255)
  doc.text(geradoEm, pageW - margin, 18, { align: 'right' })

  let y = 30

  // ─── Dados do Paciente ─────────────────────────────────────────
  y = sectionTitle(doc, 'Dados do Paciente', y)

  const primaryTherapist = therapists.find(t => t.id === patient.therapistId)
  const patientAge = age(patient.dateOfBirth)
  const specialtyLabels = (patient.specialties || [])
    .map(s => { const k = s?.key ?? s; return specialtiesData.find(sd => sd.key === k)?.label || k })
    .join(', ')

  const col1x = margin
  const col2x = pageW / 2 + 5

  let y1 = y
  let y2 = y

  y1 = labelValue(doc, 'Nome Completo', patient.fullName, col1x, y1, 80) + 2
  y1 = labelValue(doc, 'Data de Nascimento', patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)}${patientAge ? ` (${patientAge} anos)` : ''}` : null, col1x, y1, 80) + 2
  y1 = labelValue(doc, 'CPF', patient.cpf, col1x, y1, 80) + 2
  y1 = labelValue(doc, 'Sexo', patient.gender, col1x, y1, 80) + 2

  y2 = labelValue(doc, 'Telefone', patient.phone, col2x, y2, 80) + 2
  y2 = labelValue(doc, 'E-mail', patient.email, col2x, y2, 80) + 2
  y2 = labelValue(doc, 'Terapeuta Principal', primaryTherapist?.name, col2x, y2, 80) + 2
  y2 = labelValue(doc, 'Especialidades em Atendimento', specialtyLabels || null, col2x, y2, 80) + 2

  y = Math.max(y1, y2) + 4
  y = labelValue(doc, 'Diagnóstico Principal', patient.diagnosis, col1x, y, pageW - 28) + 2
  if (patient.notes) y = labelValue(doc, 'Observações', patient.notes, col1x, y, pageW - 28) + 2

  y += 4

  // ─── Responsáveis ─────────────────────────────────────────────
  if (guardians.length > 0) {
    y = sectionTitle(doc, 'Responsáveis', y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Nome', 'Parentesco', 'Telefone', 'E-mail', 'CPF']],
      body: guardians.map(g => [g.fullName || '—', g.relationship || '—', g.phone || '—', g.email || '—', g.cpf || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 25 }, 2: { cellWidth: 28 }, 3: { cellWidth: 45 }, 4: { cellWidth: 25 } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Exames Complementares ────────────────────────────────────
  if (exams.length > 0) {
    y = sectionTitle(doc, 'Exames Complementares', y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descrição', 'Data', 'Observações']],
      body: exams.map(e => [e.description || '—', formatDate(e.examDate), e.notes || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 22 }, 2: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Medicamentos ─────────────────────────────────────────────
  if (medications.length > 0) {
    y = sectionTitle(doc, 'Medicamentos', y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Medicamento', 'Data Início', 'Status', 'Observações']],
      body: medications.map(m => [
        m.medication || '—',
        formatDate(m.startDate),
        m.status === 'ativa' ? 'Ativa' : m.status === 'interrompida' ? 'Interrompida' : (m.status || '—'),
        m.notes || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 22 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Conduta & Objetivo Terapêutico ───────────────────────────
  if (conducts.length > 0) {
    y = sectionTitle(doc, 'Conduta & Objetivo Terapêutico', y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Terapeuta', 'Especialidade', 'Conduta', 'Objetivo', 'Status']],
      body: conducts.map(c => [
        c.therapistName || therapists.find(t => t.id === c.therapistId)?.name || '—',
        specialtiesData.find(s => s.key === c.specialty)?.label || c.specialty || '—',
        c.conduct || '—',
        c.objective || '—',
        c.status ? { nao_iniciada: 'Não Iniciada', em_andamento: 'Em Andamento', encerrada: 'Encerrada', cancelada: 'Cancelada' }[c.status] || c.status : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 28 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 }, 4: { cellWidth: 22 } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Histórico de Atendimentos ────────────────────────────────
  if (consultations.length > 0) {
    y = sectionTitle(doc, `Histórico de Atendimentos (${consultations.length})`, y)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Data', 'Horário', 'Especialidade', 'Terapeuta', 'Tipo', 'Status', 'Sala']],
      body: consultations.map(c => {
        const therapist = therapists.find(t => t.id === c.therapistId)
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        const room = rooms.find(r => r.id === c.roomId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        return [
          formatDate(c.date),
          c.time ? c.time.slice(0, 5) : '—',
          spec?.label || c.specialty || '—',
          therapist?.name || '—',
          type?.name || '—',
          status?.name || '—',
          room?.name || '—',
        ]
      }),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 14 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 28 },
        5: { cellWidth: 28 },
        6: { cellWidth: 'auto' },
      },
    })
  }

  // ─── Rodapé em todas as páginas ───────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text('Espaço Casa Amarela — Documento confidencial', margin, pageH - 7)
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' })
  }

  // ─── Download ─────────────────────────────────────────────────
  const fileName = `prontuario_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}
