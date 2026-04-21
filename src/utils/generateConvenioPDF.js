import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE  = [30, 64, 175]
const GRAY  = [107, 114, 128]
const DARK  = [17, 24, 39]
const LIGHT = [249, 250, 251]

const CLINIC_NAME         = 'Espaço Casa Amarela'
const CLINIC_ADDRESS      = 'Rua Almirante Protógenes, 143, Jardim, Santo André - SP | CEP 09090-760'
const CLINIC_ADDRESS_SHORT = 'R: Almirante Protógenes, 143, Jardim, Santo André - SP | 09090-760'
const CLINIC_CONTACT      = 'Contatos: 11 97579-9590 / contatocasa.amarela2024@gmail.com'
const CLINIC_LOCAL        = 'Espaço Casa Amarela – Rua Almirante Protógenes, 143 – Santo André/SP'

export const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function formatMesLabel(yearMonth) {
  const [y, m] = yearMonth.split('-')
  return `${MONTHS[parseInt(m) - 1]}/${y}`
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function fmtCurrency(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 'R$ 0,00'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadLogo() {
  try {
    const resp = await fetch(`${window.location.origin}/logo.jpg`)
    const blob = await resp.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

function addHeader(doc, logoData, subtitle, versionLabel, companySettings) {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 22, 'F')
  if (logoData) doc.addImage(logoData, 'JPEG', margin, 2, 18, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(CLINIC_NAME, margin + 21, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, margin + 21, 16)
  doc.setFontSize(7)
  doc.setTextColor(200, 210, 255)
  if (companySettings?.razaoSocial) {
    doc.text(companySettings.razaoSocial, pageW - margin, 8, { align: 'right' })
    if (companySettings.cnpj) {
      doc.text(`CNPJ: ${companySettings.cnpj}`, pageW - margin, 13, { align: 'right' })
    }
    doc.text(versionLabel || '', pageW - margin, 18, { align: 'right' })
  } else {
    doc.text(versionLabel || '', pageW - margin, 18, { align: 'right' })
  }
  // Reset to body defaults — critical to avoid font bleed after page breaks
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
}

function addFooter(doc, pageNum, totalPages) {
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const margin = 14
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, pageH - 18, pageW - margin, pageH - 18)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.text('ESPAÇO CASA AMARELA', margin, pageH - 13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(CLINIC_ADDRESS, margin, pageH - 9)
  doc.text(CLINIC_CONTACT, margin, pageH - 5)
  doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' })
}

function sectionBar(doc, text, y) {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  doc.setFillColor(...BLUE)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text, margin + 3, y + 5)
  // Reset to body defaults after section bar
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
  return y + 11
}

function pageBreak(doc, y, needed, logoData, subtitle, versionLabel, companySettings) {
  const pageH = doc.internal.pageSize.height
  if (y + needed > pageH - 28) {
    doc.addPage()
    addHeader(doc, logoData, subtitle, versionLabel, companySettings)
    return 28
  }
  return y
}

function buildDatasStr(sessions) {
  if (!sessions.length) return '—'
  const allSameMonth = sessions.every(s => s.date?.slice(0, 7) === sessions[0].date?.slice(0, 7))
  const parts = allSameMonth
    ? sessions.map(s => s.date.split('-')[2])
    : sessions.map(s => fmtDate(s.date))
  if (parts.length === 1) return parts[0]
  return parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1]
}

// ─── Relatório ao Convênio ──────────────────────────────────────

export async function generateRelatórioConvenioPDF({
  patientName,
  diagnosticoText,
  specialtyLabel,
  terapeutaNome,
  terapeutaRegistro,
  mesLabel,
  sessions,
  sessionValue,
  horario,
  encaminhamento,
  objetivos,
  desempenho,
  versionLabel = '',
  returnBlob = false,
  companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const contentW = pageW - margin * 2
  const subtitle = 'Relatório ao Convênio'

  const logoData = await loadLogo()
  addHeader(doc, logoData, subtitle, versionLabel, companySettings)
  let y = 28

  // Título centralizado
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Relatório ao Convênio', pageW / 2, y + 4, { align: 'center' })
  y += 12

  // ── Identificação ──
  y = sectionBar(doc, 'Identificação', y)
  const terapeutaLine = terapeutaRegistro
    ? `${terapeutaNome} - ${terapeutaRegistro}`
    : terapeutaNome

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [{ content: 'Paciente:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: patientName, colSpan: 3 }],
      [{ content: 'Diagnóstico:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: diagnosticoText || '—', colSpan: 3 }],
      [{ content: 'Especialidade:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: specialtyLabel, colSpan: 3 }],
      [{ content: 'Terapeuta responsável:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: terapeutaLine, colSpan: 3 }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: contentW - 48 },
    },
    tableLineColor: [200, 210, 220],
    tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Atendimentos do Mês ──
  y = pageBreak(doc, y, 50, logoData, subtitle)
  y = sectionBar(doc, 'Atendimentos do Mês', y)

  const datasStr = buildDatasStr(sessions)
  const total = parseFloat(sessionValue) * sessions.length

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [{ content: 'Mês de referência:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: mesLabel, colSpan: 3 }],
      [{ content: 'Datas:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: datasStr, colSpan: 3 }],
      [{ content: 'Horário:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: horario || '—', colSpan: 3 }],
      [
        { content: 'Valor de sessão:', styles: { fontStyle: 'bold', fillColor: LIGHT } },
        { content: fmtCurrency(sessionValue) },
        { content: 'Total:', styles: { fontStyle: 'bold', fillColor: LIGHT } },
        { content: fmtCurrency(total) },
      ],
      [{ content: 'Local dos atendimentos:', styles: { fontStyle: 'bold', fillColor: LIGHT } }, { content: CLINIC_LOCAL, colSpan: 3 }],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 54 },
      2: { cellWidth: 22 },
      3: { cellWidth: contentW - 124 },
    },
    tableLineColor: [200, 210, 220],
    tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 10

  // ── Encaminhamento ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Encaminhamento', margin, y)
  y += 7
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
  const encLines = doc.splitTextToSize(encaminhamento || '—', contentW)
  for (const line of encLines) {
    y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(line, margin, y); y += 5
  }
  y += 6

  // ── Objetivos de Intervenção ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Objetivos de Intervenção', margin, y)
  y += 7
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
  const objLines = (objetivos || '').split('\n').map(l => l.trim()).filter(Boolean)
  if (objLines.length === 0) {
    doc.text('—', margin, y); y += 5
  } else {
    for (const linha of objLines) {
      y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      const wrapped = doc.splitTextToSize('• ' + linha, contentW - 6)
      for (const bl of wrapped) { doc.text(bl, margin + 4, y); y += 5 }
    }
  }
  y += 6

  // ── Desempenho e Conclusão ──
  y = pageBreak(doc, y, 22, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Desempenho e Conclusão', margin, y)
  y += 7
  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal')
  const desLines = doc.splitTextToSize(desempenho || '—', contentW)
  for (const line of desLines) {
    y = pageBreak(doc, y, 6, logoData, subtitle, versionLabel, companySettings)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(line, margin, y); y += 5
  }
  y += 8

  // "Sem mais..."
  y = pageBreak(doc, y, 12, logoData, subtitle, versionLabel, companySettings)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...DARK)
  doc.text('Sem mais, coloco-me à disposição para esclarecimentos.', margin, y)
  y += 18

  // ── Assinatura ──
  y = pageBreak(doc, y, 28, logoData, subtitle, versionLabel, companySettings)
  const boxW = 80, boxH = 24, boxX = pageW - margin - boxW
  doc.setDrawColor(100, 100, 120)
  doc.rect(boxX, y, boxW, boxH)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text(terapeutaNome, boxX + boxW / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text(specialtyLabel, boxX + boxW / 2, y + 14, { align: 'center' })
  if (terapeutaRegistro) {
    doc.setFontSize(8.5)
    doc.text(terapeutaRegistro, boxX + boxW / 2, y + 20, { align: 'center' })
  }

  // Footers
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); addFooter(doc, i, totalPages) }

  if (returnBlob) return doc.output('blob')
  const safe = patientName.replace(/[^\w]/g, '_')
  doc.save(`relatorio_convenio_${safe}_${mesLabel.replace('/', '_')}.pdf`)
}

// ─── Lista de Presença ──────────────────────────────────────────

export async function generateListaPresencaPDF({
  patientName,
  terapeutaNome,
  terapeutaRegistro,
  specialtyLabel,
  mesLabel,
  sessions,
  responsavel,
  versionLabel = '',
  returnBlob = false,
  companySettings = null,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const margin = 14
  const contentW = pageW - margin * 2
  const subtitle = 'Lista de Presença'

  const logoData = await loadLogo()
  addHeader(doc, logoData, subtitle, versionLabel, companySettings)
  let y = 28

  // Info do paciente / profissional
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: `Beneficiário: ${patientName}`, styles: { fontStyle: 'bold', fillColor: LIGHT } },
        { content: `Mês: ${mesLabel}` },
      ],
      [
        { content: `Profissional: ${terapeutaNome}` },
        { content: `Terapia: ${specialtyLabel}` },
        { content: `Registro: ${terapeutaRegistro || '—'}` },
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3.5, textColor: DARK },
    tableLineColor: [200, 210, 220],
    tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 6

  // Tabela de sessões
  const totalValue = sessions.reduce((s, r) => s + (parseFloat(r.value) || 0), 0)

  // col widths: 25 + 22 + 56 + 22 + 28.5 + 28.5 = 182
  const bodyRows = sessions.map(s => [
    fmtDate(s.date),
    fmtCurrency(s.value),
    CLINIC_ADDRESS_SHORT,
    s.time || '—',
    '',
    '',
  ])
  bodyRows.push([
    { content: 'Total', colSpan: 1, styles: { fontStyle: 'bold' } },
    { content: fmtCurrency(totalValue), styles: { fontStyle: 'bold' } },
    { content: '', colSpan: 4 },
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Data da Sessão', 'Valor', 'Local', 'Horário', 'Assinatura Profissional', 'Assinatura Responsável']],
    body: bodyRows,
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8, cellPadding: 4, textColor: DARK, minCellHeight: 12 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 22 },
      2: { cellWidth: 56 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28.5 },
      5: { cellWidth: contentW - 153.5 },
    },
    tableLineColor: [200, 210, 220],
    tableLineWidth: 0.3,
  })
  y = doc.lastAutoTable.finalY + 14

  // Linhas de assinatura
  const sigY = y + 4
  doc.setDrawColor(80, 80, 80)
  doc.line(margin, sigY, margin + 72, sigY)
  doc.line(pageW / 2 + 5, sigY, pageW / 2 + 5 + 72, sigY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Assinatura do Profissional: ${terapeutaNome}`, margin, sigY + 5)
  doc.text(`Responsável legal: ${responsavel || '___________________________'}`, pageW / 2 + 5, sigY + 5)

  // Footer (1 página)
  addFooter(doc, 1, 1)

  if (returnBlob) return doc.output('blob')
  const safe = patientName.replace(/[^\w]/g, '_')
  doc.save(`lista_presenca_${safe}_${mesLabel.replace('/', '_')}.pdf`)
}