const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET all invoices
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(full_name)')
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET single invoice with items
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(full_name, ndis_number), invoice_items(*, appointments(date, start_time, end_time))')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST generate invoice
router.post('/', async (req, res) => {
  const { client_id, appointment_ids } = req.body

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('*, client_rates(amount_per_hour, label)')
    .in('id', appointment_ids)

  if (apptError) return res.status(400).json({ error: apptError.message })

  const items = appointments.map(appt => {
    const start = new Date(appt.actual_start || `${appt.date}T${appt.start_time}`)
    const end = new Date(appt.actual_end || `${appt.date}T${appt.end_time}`)
    const hours = Math.round(((end - start) / 3600000) * 100) / 100
    const rate = appt.client_rates?.amount_per_hour || 0
    return {
      appointment_id: appt.id,
      hours,
      rate_per_hour: rate,
      rate_label: appt.client_rates?.label || 'Standard',
      amount: Math.round(hours * rate * 100) / 100
    }
  })

  const total = items.reduce((sum, item) => sum + item.amount, 0)

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert([{ client_id, total: Math.round(total * 100) / 100, status: 'draft' }])
    .select()
    .single()

  if (invError) return res.status(400).json({ error: invError.message })

  const itemsWithInvoiceId = items.map(item => ({ ...item, invoice_id: invoice.id }))

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(itemsWithInvoiceId)

  if (itemsError) return res.status(400).json({ error: itemsError.message })

  res.status(201).json(invoice)
})

// PATCH mark as paid
router.patch('/:id/paid', async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router