const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET all clients
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET single client with rates
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*, client_rates(*)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET client history — session notes + incidents joined chronologically (ITP126ON4-146)
router.get('/:id/history', async (req, res) => {
  const clientId = req.params.id

  // Fetch session notes via appointments for this client
  const { data: notes, error: notesError } = await supabase
    .from('session_notes')
    .select('*, appointments!inner(date, start_time, end_time, client_id)')
    .eq('appointments.client_id', clientId)
    .order('created_at', { ascending: false })

  // Fetch incidents for this client
  const { data: incidents, error: incidentsError } = await supabase
    .from('incidents')
    .select('*')
    .eq('client_id', clientId)
    .order('occurred_at', { ascending: false })

  if (notesError && incidentsError) {
    return res.status(400).json({ error: notesError.message })
  }

  // Merge and sort by date descending
  const history = [
    ...(notes || []).map(n => ({ ...n, record_type: 'session_note', sort_date: n.created_at })),
    ...(incidents || []).map(i => ({ ...i, record_type: 'incident', sort_date: i.occurred_at }))
  ].sort((a, b) => new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime())

  res.json(history)
})

// POST create client
router.post('/', async (req, res) => {
  const { full_name, ndis_number, date_of_birth, address, phone, email, emergency_contact_name, emergency_contact_phone } = req.body
  const { data, error } = await supabase
    .from('clients')
    .insert([{ full_name, ndis_number, date_of_birth, address, phone, email, emergency_contact_name, emergency_contact_phone }])
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT update client
router.put('/:id', async (req, res) => {
  const { full_name, ndis_number, date_of_birth, address, phone, email, emergency_contact_name, emergency_contact_phone } = req.body
  const { data, error } = await supabase
    .from('clients')
    .update({ full_name, ndis_number, date_of_birth, address, phone, email, emergency_contact_name, emergency_contact_phone })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST add rate to client
router.post('/:id/rates', async (req, res) => {
  const { rate_type, label, amount_per_hour } = req.body
  const { data, error } = await supabase
    .from('client_rates')
    .insert([{ client_id: req.params.id, rate_type, label, amount_per_hour }])
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

module.exports = router
