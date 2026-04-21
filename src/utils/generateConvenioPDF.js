import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  PDF_BLUE, PDF_DARK, PDF_LIGHT, PDF_GRAY,
  CLINIC_ADDRESS_SHORT, CLINIC_LOCAL,
  loadLogo, addPageHeader, addPageFooter, sectionBlock,
  fmtDatePDF, fmtCurrencyPDF,
} from './pdfShared'

export { MONTHS, formatMesLabel } from './pdfShared'

function pageBreak(doc, y, needed, logoData, subtitle, versionLabel, companySettings) {
  if (y + needed > doc.internal.pageSize.height - 28) {
    doc.addPage()
    addPageHeader(doc, logoData, subtitle, companySettings, versionLabel)
    return 28
  }
  return y
}

function buildDatasStr(sessions) {
  if (!sessions.length) return '—'
  const allSameMonth = sessions.every(s => s.date?.slice(0, 7) === sessions[0].date?.slice(0, 7))
  const parts = allSameMonth
    ? sessions.map(s => s.date.split('-')[2])
    : sessions.map(s => fmtDatePDF(s.date))
  if (parts.length === 1) return parts[0]
  return parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1]
}

function buildSessionTimeGroups(sessions, fallbackHorario) {
  const groups = new Map()
  for (const s of sessions) {
    const key = (s.time || fallbackHorario || '').trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  return [...groups.entries()].map(([time, grp]) => ({ time, datasStr: buildDatasStr(grp) }))
}

// ─── Relatório ao Convênio ──────────────────────────────────────

export async function generateRelatórioConvenioPDF({
  patientName, diagnosticoText, specialtyLabel,
  terapeutaNome, terapeutaRegistro, mesLabel,
  sessions, sessionValue, horario,
  encaminhamento, objetivos, desempenho,
  versionLabel = '', returnBlob = false, companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const contentW = pageW - margin * 2
  const subtitle = 'Relatório ao Convênio'

  const logoData = await loadLogo()
  addPageHeader(doc, logoData, subtitle, companySettings, versionLabel)
  let y = 28

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_DARK)
  doc.text('Relatório ao Convênio', pageW / 2, y + 4, { align: 'center' })
  y += 12

  // ── Identificação ──
  y = sectionBlock(doc, 'Identificação', y, { uppercase: false })
  const terapeutaLine = terapeutaRegistro
    ? `${terapeutaNome} - ${terapeutaRegistro}`
    : terapeutaNome

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: [
      [{ content: 'Paciente:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: patientName, colSpan: 3 }],
      [{ content: 'Diagnóstico:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: diagnosticoText || '—', colSpan: 3 }],
      [{ content: 'Especialidade:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: specialtyLabel, colSpan: 3 }],
      [{ content: 'Terapeuta responsável:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: terapeutaLine, colSpan: 3 }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: PDF_DARK },
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: contentW - 48 } },
    tableLineColor: [200, 210, 220], tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Atendimentos do Mês ──
  y = pageBreak(doc, y, 50, logoData, subtitle, versionLabel, companySettings)
  y = sectionBlock(doc, 'Atendimentos do Mês', y, { uppercase: false })
  const timeGroups = buildSessionTimeGroups(sessions, horario)
  const total = sessions.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0)
  const datasRows = timeGroups.map(({ time, datasStr }) => [
    { content: 'Datas e Horários:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } },
    { content: time ? `${datasStr} às ${time}` : datasStr, colSpan: 3 },
  ])

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: [
      [{ content: 'Mês de referência:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: mesLabel, colSpan: 3 }],
      ...datasRows,
      [
        { content: 'Valor de sessão:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: fmtCurrencyPDF(sessionValue) },
        { content: 'Total:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: fmtCurrencyPDF(total) },
      ],
      [{ content: 'Local dos atendimentos:', styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } }, { content: CLINIC_LOCAL, colSpan: 3 }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: PDF_DARK },
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 54 }, 2: { cellWidth: 22 }, 3: { cellWidth: contentW - 124 } },
    tableLineColor: [200, 210, 220], tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 10

  // ── Encaminhamento ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_DARK)
  doc.text('Encaminhamento', margin, y); y += 7
  for (const line of doc.splitTextToSize(encaminhamento || '—', contentW)) {
    y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_DARK)
    doc.text(line, margin, y); y += 5
  }
  y += 6

  // ── Objetivos de Intervenção ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_DARK)
  doc.text('Objetivos de Intervenção', margin, y); y += 7
  const objLines = (objetivos || '').split('\n').map(l => l.trim()).filter(Boolean)
  if (objLines.length === 0) {
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
    doc.text('—', margin, y); y += 5
  } else {
    for (const linha of objLines) {
      y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_DARK)
      for (const bl of doc.splitTextToSize('• ' + linha, contentW - 6)) {
        doc.text(bl, margin + 4, y); y += 5
      }
    }
  }
  y += 6

  // ── Desempenho e Conclusão ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_DARK)
  doc.text('Desempenho e Conclusão', margin, y); y += 7
  for (const line of doc.splitTextToSize(desempenho || '—', contentW)) {
    y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_DARK)
    doc.text(line, margin, y); y += 5
  }
  y += 8

  y = pageBreak(doc, y, 12, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...PDF_DARK)
  doc.text('Sem mais, coloco-me à disposição para esclarecimentos.', margin, y)
  y += 18

  // ── Assinatura ──
  y = pageBreak(doc, y, 28, logoData, subtitle, versionLabel, companySettings)
  const boxW = 80, boxH = 24, boxX = pageW - margin - boxW
  doc.setDrawColor(100, 100, 120)
  doc.rect(boxX, y, boxW, boxH)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_DARK)
  doc.text(terapeutaNome, boxX + boxW / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(specialtyLabel, boxX + boxW / 2, y + 14, { align: 'center' })
  if (terapeutaRegistro) {
    doc.setFontSize(8.5)
    doc.text(terapeutaRegistro, boxX + boxW / 2, y + 20, { align: 'center' })
  }

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i); addPageFooter(doc, i, totalPages, { full: true })
  }

  if (returnBlob) return doc.output('blob')
  const safe = patientName.replace(/[^\w]/g, '_')
  doc.save(`relatorio_convenio_${safe}_${mesLabel.replace('/', '_')}.pdf`)
}

// ─── Lista de Presença ──────────────────────────────────────────

export async function generateListaPresencaPDF({
  patientName, terapeutaNome, terapeutaRegistro,
  specialtyLabel, mesLabel, sessions, responsavel,
  versionLabel = '', returnBlob = false, companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const contentW = pageW - margin * 2
  const subtitle = 'Lista de Presença'

  const logoData = await loadLogo()
  addPageHeader(doc, logoData, subtitle, companySettings, versionLabel)
  let y = 28

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: [
      [
        { content: `Beneficiário: ${patientName}`, styles: { fontStyle: 'bold', fillColor: PDF_LIGHT } },
        { content: `Mês: ${mesLabel}` },
      ],
      [
        { content: `Profissional: ${terapeutaNome}` },
        { content: `Terapia: ${specialtyLabel}` },
        { content: `Registro: ${terapeutaRegistro || '—'}` },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: PDF_DARK },
    tableLineColor: [200, 210, 220], tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 6

  const totalValue = sessions.reduce((s, r) => s + (parseFloat(r.value) || 0), 0)
  const bodyRows = sessions.map(s => [
    fmtDatePDF(s.date), fmtCurrencyPDF(s.value), CLINIC_ADDRESS_SHORT, s.time || '—', '', '',
  ])
  bodyRows.push([
    { content: 'Total', styles: { fontStyle: 'bold' } },
    { content: fmtCurrencyPDF(totalValue), styles: { fontStyle: 'bold' } },
    { content: '', colSpan: 4 },
  ])

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['Data da Sessão', 'Valor', 'Local', 'Horário', 'Assinatura Profissional', 'Assinatura Responsável']],
    body: bodyRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_BLUE, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8, cellPadding: 4, textColor: PDF_DARK, minCellHeight: 12 },
    columnStyles: {
      0: { cellWidth: 25 }, 1: { cellWidth: 22 }, 2: { cellWidth: 56 },
      3: { cellWidth: 22 }, 4: { cellWidth: 28.5 }, 5: { cellWidth: contentW - 153.5 },
    },
    tableLineColor: [200, 210, 220], tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 14

  const sigY = y + 4
  doc.setDrawColor(80, 80, 80)
  doc.line(margin, sigY, margin + 72, sigY)
  doc.line(pageW / 2 + 5, sigY, pageW / 2 + 5 + 72, sigY)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_GRAY)
  doc.text(`Assinatura do Profissional: ${terapeutaNome}`, margin, sigY + 5)
  doc.text(`Responsável legal: ${responsavel || '___________________________'}`, pageW / 2 + 5, sigY + 5)

  addPageFooter(doc, 1, 1, { full: true })

  if (returnBlob) return doc.output('blob')
  const safe = patientName.replace(/[^\w]/g, '_')
  doc.save(`lista_presenca_${safe}_${mesLabel.replace('/', '_')}.pdf`)
}