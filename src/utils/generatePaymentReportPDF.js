import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  addPageHeader, addAllPageFooters, loadLogo,
  fmtDatePDF, fmtCurrencyPDF,
  PDF_BLUE, PDF_DARK, PDF_GRAY, PDF_LIGHT,
} from './pdfShared'

const STATUS_LABEL = { ISSUED: 'Emitida', PAID: 'Paga', CANCELLED: 'Cancelada' }

function periodFilterLabel(dateFrom, dateTo) {
  if (dateFrom && dateTo) return `${fmtDatePDF(dateFrom)} a ${fmtDatePDF(dateTo)}`
  if (dateFrom) return `A partir de ${fmtDatePDF(dateFrom)}`
  if (dateTo) return `Até ${fmtDatePDF(dateTo)}`
  return 'Todos os períodos'
}

function grandTotal(invoices) {
  return invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
}

function invoicePatientName(inv) {
  return inv.patients?.full_name || inv.snapshot?.patientName || '—'
}

// ─── PDF Resumo ───────────────────────────────────────────────────────────────

export async function generatePaymentSummaryPDF({ invoices, dateFrom, dateTo, status, companySettings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadLogo()
  const subtitle = 'Relatório de Faturas — Resumo'

  addPageHeader(doc, logoData, subtitle, companySettings)

  // Filter info
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_GRAY)
  const statusTxt = status ? (STATUS_LABEL[status] || status) : 'Todos os status'
  doc.text(
    `Período: ${periodFilterLabel(dateFrom, dateTo)}   ·   Status: ${statusTxt}   ·   ${invoices.length} fatura(s)`,
    14, 27,
  )

  let firstPage = true
  autoTable(doc, {
    startY: 32,
    head: [['NF', 'Paciente', 'Período', 'Status', 'Emissão', 'Total']],
    body: invoices.map(inv => [
      inv.nf_number || '—',
      invoicePatientName(inv),
      inv.snapshot?.period || '—',
      STATUS_LABEL[inv.status] || inv.status,
      fmtDatePDF(inv.nf_issue_date),
      fmtCurrencyPDF(inv.total_amount),
    ]),
    foot: [[
      { content: `Total Geral (${invoices.length} fatura${invoices.length !== 1 ? 's' : ''})`, colSpan: 5, styles: { halign: 'right' } },
      fmtCurrencyPDF(grandTotal(invoices)),
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: PDF_DARK },
    headStyles: { fillColor: PDF_BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: PDF_LIGHT, textColor: PDF_DARK, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 52 },
      2: { cellWidth: 36 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 26, halign: 'right' },
    },
    margin: { top: 30, left: 14, right: 14, bottom: 18 },
    willDrawPage: () => {
      if (firstPage) { firstPage = false; return }
      addPageHeader(doc, logoData, subtitle, companySettings)
    },
  })

  addAllPageFooters(doc, { full: false })

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  doc.save(`faturas_resumo_${today}.pdf`)
}

// ─── PDF Detalhado ────────────────────────────────────────────────────────────

export async function generatePaymentDetailPDF({ invoices, dateFrom, dateTo, status, companySettings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadLogo()
  const subtitle = 'Relatório de Faturas — Detalhado'

  addPageHeader(doc, logoData, subtitle, companySettings)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_GRAY)
  const statusTxt = status ? (STATUS_LABEL[status] || status) : 'Todos os status'
  doc.text(
    `Período: ${periodFilterLabel(dateFrom, dateTo)}   ·   Status: ${statusTxt}   ·   ${invoices.length} fatura(s)`,
    14, 27,
  )

  // Build flat body: invoice-header rows + consultation rows per invoice
  const body = []
  const invoiceHeaderIndices = new Set()

  for (const inv of invoices) {
    const snap = inv.snapshot || {}
    const consultations = snap.consultations || []
    const patientName = invoicePatientName(inv)
    const nfLabel = inv.nf_number ? `NF ${inv.nf_number}` : 'Sem NF'
    const statusLabel = STATUS_LABEL[inv.status] || inv.status
    const emissao = inv.nf_issue_date ? `  ·  Emissão ${fmtDatePDF(inv.nf_issue_date)}` : ''

    invoiceHeaderIndices.add(body.length)
    body.push([
      {
        content: `${patientName}   ·   ${snap.period || '—'}   ·   ${nfLabel}${emissao}   ·   ${statusLabel}`,
        colSpan: 5,
        styles: { fontStyle: 'bold', fontSize: 8, textColor: [255, 255, 255], fillColor: PDF_BLUE },
      },
      {
        content: fmtCurrencyPDF(inv.total_amount),
        styles: { fontStyle: 'bold', fontSize: 8, halign: 'right', textColor: [255, 255, 255], fillColor: PDF_BLUE },
      },
    ])

    if (consultations.length === 0) {
      body.push([
        {
          content: 'Nenhum atendimento no snapshot desta fatura.',
          colSpan: 6,
          styles: { textColor: PDF_GRAY, fontStyle: 'italic', fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 4, right: 4 } },
        },
      ])
    } else {
      for (const c of consultations) {
        body.push([
          fmtDatePDF(c.date),
          c.time ? c.time.slice(0, 5) : '—',
          c.specialtyLabel || c.specialty || '—',
          c.therapistName || '—',
          c.statusName || '—',
          c.paymentType === 'POST_MONTHLY'
            ? 'Mensal'
            : c.paymentType === 'PREPAID_PACKAGE'
            ? 'Pré-pago'
            : c.patientValue != null ? fmtCurrencyPDF(c.patientValue) : '—',
        ])
      }
    }
  }

  // Grand total row
  body.push([
    {
      content: `Total Geral (${invoices.length} fatura${invoices.length !== 1 ? 's' : ''})`,
      colSpan: 5,
      styles: { fontStyle: 'bold', fontSize: 8, halign: 'right', fillColor: PDF_LIGHT, textColor: PDF_DARK },
    },
    {
      content: fmtCurrencyPDF(grandTotal(invoices)),
      styles: { fontStyle: 'bold', fontSize: 8, halign: 'right', fillColor: PDF_LIGHT, textColor: PDF_DARK },
    },
  ])

  let firstPage = true
  autoTable(doc, {
    startY: 32,
    head: [['Data', 'Horário', 'Especialidade', 'Terapeuta', 'Status', 'Valor']],
    body,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_DARK },
    headStyles: { fillColor: [50, 80, 160], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 19 },
      1: { cellWidth: 15 },
      2: { cellWidth: 43 },
      3: { cellWidth: 43 },
      4: { cellWidth: 30 },
      5: { cellWidth: 24, halign: 'right' },
    },
    margin: { top: 30, left: 14, right: 14, bottom: 18 },
    willDrawPage: () => {
      if (firstPage) { firstPage = false; return }
      addPageHeader(doc, logoData, subtitle, companySettings)
    },
  })

  addAllPageFooters(doc, { full: false })

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  doc.save(`faturas_detalhado_${today}.pdf`)
}
