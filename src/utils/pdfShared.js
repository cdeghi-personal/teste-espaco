// Shared constants and utilities for all PDF generators

export const PDF_BLUE  = [30, 64, 175]
export const PDF_GRAY  = [107, 114, 128]
export const PDF_DARK  = [17, 24, 39]
export const PDF_LIGHT = [249, 250, 251]

export const CLINIC_NAME          = 'Espaço Casa Amarela'
export const CLINIC_ADDRESS       = 'Rua Almirante Protógenes, 143, Jardim, Santo André - SP | CEP 09090-760'
export const CLINIC_ADDRESS_SHORT = 'R: Almirante Protógenes, 143, Jardim, Santo André - SP | 09090-760'
export const CLINIC_CONTACT       = 'Contatos: 11 97579-9590 / contatocasa.amarela2024@gmail.com'
export const CLINIC_LOCAL         = 'Espaço Casa Amarela – Rua Almirante Protógenes, 143 – Santo André/SP'

export const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function formatMesLabel(yearMonth) {
  const [y, m] = yearMonth.split('-')
  return `${MONTHS[parseInt(m) - 1]}/${y}`
}

export function fmtDatePDF(str) {
  if (!str) return '—'
  try { const [y, m, d] = str.split('-'); return `${d}/${m}/${y}` }
  catch { return str }
}

export function fmtCurrencyPDF(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 'R$ 0,00'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function loadLogo() {
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

/**
 * Draws the blue header bar on the current page.
 * rightText: "Gerado em…" or versionLabel — shown at bottom-right of bar.
 * Always resets font/size/color to body defaults at end (prevents bleed after page breaks).
 */
export function addPageHeader(doc, logoData, subtitle, companySettings = null, rightText = '') {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  doc.setFillColor(...PDF_BLUE)
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
    if (companySettings.cnpj) doc.text(`CNPJ: ${companySettings.cnpj}`, pageW - margin, 13, { align: 'right' })
  }
  doc.text(rightText || '', pageW - margin, 18, { align: 'right' })
  // Reset to body defaults
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...PDF_DARK)
}

/**
 * Draws the footer on the current page.
 * full: true → three-line footer with address and contact (Convênio).
 * full: false (default) → single-line compact footer (Prontuário / Relatórios).
 */
export function addPageFooter(doc, pageNum, totalPages, { full = false } = {}) {
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const margin = 14
  doc.setDrawColor(220, 220, 220)
  if (full) {
    doc.line(margin, pageH - 18, pageW - margin, pageH - 18)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_BLUE)
    doc.text('ESPAÇO CASA AMARELA', margin, pageH - 13)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_GRAY)
    doc.text(CLINIC_ADDRESS, margin, pageH - 9)
    doc.text(CLINIC_CONTACT, margin, pageH - 5)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' })
  } else {
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_GRAY)
    doc.text('Espaço Casa Amarela — Documento confidencial', margin, pageH - 7)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' })
  }
}

/** Applies addPageFooter to every page in the document. */
export function addAllPageFooters(doc, options = {}) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, total, options)
  }
}

/**
 * Blue section header bar.
 * uppercase: true (default) — text rendered in uppercase.
 * Always resets font to body defaults at end.
 */
export function sectionBlock(doc, text, y, { uppercase = true } = {}) {
  const pageW = doc.internal.pageSize.width
  const margin = 14
  doc.setFillColor(...PDF_BLUE)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(uppercase ? text.toUpperCase() : text, margin + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...PDF_DARK)
  return y + 12
}

/** Renders a label (gray, bold) + value (dark, normal) pair at position (x, y). */
export function labelValue(doc, label, value, x, y, maxWidth = 80) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_GRAY)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_DARK)
  const lines = doc.splitTextToSize(value || '—', maxWidth)
  doc.text(lines, x, y + 4)
  return y + 4 + lines.length * 4
}