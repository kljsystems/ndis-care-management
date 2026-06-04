// server/routes/invoices_pdf.js
// Adds GET /api/invoices/:id/pdf  — streams a generated PDF to the browser
// ─────────────────────────────────────────────────────────────────────────────
// SETUP:
//   cd server && npm install pdfkit
//
// REGISTER in server/index.js — add these TWO lines before the existing
// invoiceRoutes line:
//
//   const invoicePDFRoutes = require('./routes/invoices_pdf')
//   app.use('/api/invoices', invoicePDFRoutes)
//
// (keep the existing `app.use('/api/invoices', invoiceRoutes)` line too)
// ─────────────────────────────────────────────────────────────────────────────

const express  = require('express')
const router   = express.Router()
const PDFDocument = require('pdfkit')
const supabase = require('../supabase')

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function fmtCurrency(amount) {
  return `$${Number(amount ?? 0).toFixed(2)}`
}

function fmtTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildInvoicePDF(doc, invoice) {
  const PAGE_LEFT   = 50
  const PAGE_RIGHT  = 545
  const PAGE_WIDTH  = PAGE_RIGHT - PAGE_LEFT
  const BRAND       = '#2563eb'   // matches app nav blue
  const MUTED       = '#6b7280'
  const DARK        = '#111827'
  const LINE        = '#e5e7eb'

  // ── Blue header band ───────────────────────────────────────────────────────
  doc.rect(0, 0, 595, 90).fill(BRAND)

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff')
     .text('INVOICE', PAGE_LEFT, 28)

  doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe')
     .text('NDIS Care Management', PAGE_LEFT, 54)

  // top-right meta
  const metaX = 360
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
     .text(`Invoice #${invoice.id.slice(0, 8).toUpperCase()}`, metaX, 28, { width: 185, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe')
     .text(`Issued: ${fmtDate(invoice.created_at)}`, metaX, 44, { width: 185, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe')
     .text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, metaX, 58, { width: 185, align: 'right' })

  // ── Billed to / Provider ──────────────────────────────────────────────────
  let y = 110

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('BILLED TO', PAGE_LEFT, y)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(invoice.clients?.full_name ?? 'Client', PAGE_LEFT, y + 14)
  if (invoice.clients?.ndis_number) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
       .text(`NDIS #: ${invoice.clients.ndis_number}`, PAGE_LEFT, y + 28)
  }

  const provX = 330
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('SERVICE PROVIDER', provX, y)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text('NDIS Support Worker', provX, y + 14)
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Independent Support Worker', provX, y + 28)

  // ── Divider ────────────────────────────────────────────────────────────────
  y += 68
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).lineWidth(1).strokeColor(LINE).stroke()
  y += 14

  // ── Table header ──────────────────────────────────────────────────────────
  const COL = {
    date:   PAGE_LEFT,
    desc:   PAGE_LEFT + 80,
    hours:  PAGE_LEFT + 285,
    rate:   PAGE_LEFT + 350,
    amount: PAGE_LEFT + 430
  }

  doc.rect(PAGE_LEFT, y, PAGE_WIDTH, 22).fill('#f9fafb')
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED)
  doc.text('DATE',        COL.date   + 4, y + 7)
     .text('DESCRIPTION', COL.desc   + 4, y + 7)
     .text('HRS',         COL.hours  + 4, y + 7)
     .text('RATE/HR',     COL.rate   + 4, y + 7)
     .text('AMOUNT',      COL.amount + 4, y + 7)
  y += 28

  // ── Table rows ─────────────────────────────────────────────────────────────
  const items = invoice.invoice_items ?? []
  let subtotal = 0

  items.forEach((item, i) => {
    const rowH  = 24
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, rowH).fill(i % 2 === 1 ? '#f9fafb' : '#ffffff')

    const appt    = item.appointments
    const dateStr = fmtDate(appt?.date)
    const start   = fmtTime(appt?.actual_start || appt?.start_time)
    const end     = fmtTime(appt?.actual_end   || appt?.end_time)
    const timeStr = start && end ? `${start} – ${end}` : ''
    const label   = item.rate_label || 'Support session'
    const hours   = Number(item.hours ?? 0)
    const rate    = Number(item.rate_per_hour ?? 0)
    const amount  = Number(item.amount ?? hours * rate)
    subtotal += amount

    doc.font('Helvetica').fontSize(9).fillColor(DARK)
    doc.text(dateStr,             COL.date   + 4, y + 8)
       .text(`${label}${timeStr ? ' · ' + timeStr : ''}`, COL.desc + 4, y + 8, { width: 190, ellipsis: true })
       .text(hours.toFixed(2),   COL.hours  + 4, y + 8)
       .text(fmtCurrency(rate),  COL.rate   + 4, y + 8)
       .text(fmtCurrency(amount),COL.amount + 4, y + 8)

    y += rowH
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  doc.moveTo(PAGE_LEFT, y + 6).lineTo(PAGE_RIGHT, y + 6).lineWidth(1).strokeColor(LINE).stroke()
  y += 18

  const TOTAL_X = COL.amount - 90

  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
     .text('Subtotal', TOTAL_X, y, { width: 90, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor(DARK)
     .text(fmtCurrency(subtotal), COL.amount + 4, y)
  y += 16

  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
     .text('GST (NDIS exempt)', TOTAL_X, y, { width: 90, align: 'right' })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
     .text('$0.00', COL.amount + 4, y)
  y += 20

  // total box
  doc.rect(TOTAL_X - 8, y - 4, PAGE_RIGHT - TOTAL_X + 8, 26).fill(BRAND)
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
     .text('TOTAL DUE', TOTAL_X, y + 4, { width: 90, align: 'right' })
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff')
     .text(fmtCurrency(invoice.total ?? subtotal), COL.amount + 4, y + 3)

  y += 46

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('NOTES', PAGE_LEFT, y)
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
       .text(invoice.notes, PAGE_LEFT, y + 14, { width: PAGE_WIDTH })
    y += 40
  }

  // ── Footer band ────────────────────────────────────────────────────────────
  doc.rect(0, 780, 595, 61).fill('#f3f4f6')
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
     .text(
       'Thank you for your trust. Questions? Contact your support worker directly.',
       PAGE_LEFT, 793, { width: PAGE_WIDTH, align: 'center' }
     )
  doc.font('Helvetica').fontSize(7).fillColor(MUTED)
     .text('Generated by NDIS Care Management App', PAGE_LEFT, 808, { width: PAGE_WIDTH, align: 'center' })
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get('/:id/pdf', async (req, res) => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(full_name, ndis_number),
        invoice_items(
          *,
          appointments(date, start_time, end_time, actual_start, actual_end)
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const filename = `invoice-${invoice.id.slice(0, 8).toUpperCase()}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    doc.pipe(res)
    buildInvoicePDF(doc, invoice)
    doc.end()

  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

module.exports = router