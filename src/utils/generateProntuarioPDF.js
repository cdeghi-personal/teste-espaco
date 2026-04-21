import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  PDF_BLUE, PDF_LIGHT,
  loadLogo, addPageHeader, addAllPageFooters,
  sectionBlock, labelValue, fmtDatePDF,
} from './pdfShared'

function age(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

export async function generateProntuarioPDF({
  patient, guardians, exams, medications, conducts,
  consultations, therapists, consultationStatuses,
  appointmentTypes, rooms, specialtiesData,
  companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14

  const logoData = await loadLogo()
  const now = new Date()
  const geradoEm = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  addPageHeader(doc, logoData, 'Prontuário Clínico', companySettings, geradoEm)

  let y = 30

  // ── Dados do Paciente ──
  y = sectionBlock(doc, 'Dados do Paciente', y)
  const primaryTherapist = therapists.find(t => t.id === patient.therapistId)
  const patientAge = age(patient.dateOfBirth)
  const specialtyLabels = (patient.specialties || [])
    .map(s => { const k = s?.key ?? s; return specialtiesData.find(sd => sd.key === k)?.label || k })
    .join(', ')

  const col1x = margin, col2x = pageW / 2 + 5
  let y1 = y, y2 = y
  y1 = labelValue(doc, 'Nome Completo', patient.fullName, col1x, y1, 80) + 2
  y1 = labelValue(doc, 'Data de Nascimento',
    patient.dateOfBirth ? `${fmtDatePDF(patient.dateOfBirth)}${patientAge ? ` (${patientAge} anos)` : ''}` : null,
    col1x, y1, 80) + 2
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

  // ── Responsáveis ──
  if (guardians.length > 0) {
    y = sectionBlock(doc, 'Responsáveis', y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Nome', 'Parentesco', 'Telefone', 'E-mail', 'CPF']],
      body: guardians.map(g => [g.fullName || '—', g.relationship || '—', g.phone || '—', g.email || '—', g.cpf || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 25 }, 2: { cellWidth: 28 }, 3: { cellWidth: 45 }, 4: { cellWidth: 25 } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Exames Complementares ──
  if (exams.length > 0) {
    y = sectionBlock(doc, 'Exames Complementares', y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Descrição', 'Data', 'Observações']],
      body: exams.map(e => [e.description || '—', fmtDatePDF(e.examDate), e.notes || '—']),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 22 }, 2: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Medicamentos ──
  if (medications.length > 0) {
    y = sectionBlock(doc, 'Medicamentos', y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Medicamento', 'Data Início', 'Status', 'Observações']],
      body: medications.map(m => [
        m.medication || '—', fmtDatePDF(m.startDate),
        m.status === 'ativa' ? 'Ativa' : m.status === 'interrompida' ? 'Interrompida' : (m.status || '—'),
        m.notes || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 22 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Conduta & Objetivo Terapêutico ──
  if (conducts.length > 0) {
    y = sectionBlock(doc, 'Conduta & Objetivo Terapêutico', y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Terapeuta', 'Especialidade', 'Conduta', 'Objetivo', 'Status']],
      body: conducts.map(c => [
        c.therapistName || therapists.find(t => t.id === c.therapistId)?.name || '—',
        specialtiesData.find(s => s.key === c.specialty)?.label || c.specialty || '—',
        c.conduct || '—', c.objective || '—',
        c.status ? { nao_iniciada: 'Não Iniciada', em_andamento: 'Em Andamento', encerrada: 'Encerrada', cancelada: 'Cancelada' }[c.status] || c.status : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 28 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 }, 4: { cellWidth: 22 } },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Histórico de Atendimentos ──
  if (consultations.length > 0) {
    y = sectionBlock(doc, `Histórico de Atendimentos (${consultations.length})`, y)
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [['Data', 'Horário', 'Especialidade', 'Terapeuta', 'Tipo', 'Status', 'Sala']],
      body: consultations.map(c => {
        const therapist = therapists.find(t => t.id === c.therapistId)
        const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
        const type = appointmentTypes.find(t => t.id === c.appointmentTypeId)
        const room = rooms.find(r => r.id === c.roomId)
        const spec = specialtiesData.find(s => s.key === c.specialty)
        return [
          fmtDatePDF(c.date), c.time ? c.time.slice(0, 5) : '—',
          spec?.label || c.specialty || '—', therapist?.name || '—',
          type?.name || '—', status?.name || '—', room?.name || '—',
        ]
      }),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: PDF_LIGHT },
      columnStyles: {
        0: { cellWidth: 18 }, 1: { cellWidth: 14 }, 2: { cellWidth: 30 },
        3: { cellWidth: 35 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 }, 6: { cellWidth: 'auto' },
      },
    })
  }

  addAllPageFooters(doc)

  const fileName = `prontuario_${patient.fullName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}