const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET all appointments
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(full_name)')
    .order('date', { ascending: true })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// GET single appointment
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(full_name, id), client_rates(label, amount_per_hour)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST create appointment
router.post('/', async (req, res) => {
  const { client_id, rate_id, date, end_date, start_time, end_time, notes } = req.body  // fixed: was req.bod

  const { data, error } = await supabase
    .from('appointments')
    .insert([{ client_id, rate_id, date, end_date, start_time, end_time, notes }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT update appointment
router.put('/:id', async (req, res) => {
  const { date, end_date, start_time, end_time, notes, rate_id } = req.body

  const { data, error } = await supabase
    .from('appointments')
    .update({ date, end_date, start_time, end_time, notes, rate_id })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// PATCH mark as complete
router.patch('/:id/complete', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// PATCH cancel appointment
router.patch('/:id/cancel', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// PATCH clock in
router.patch('/:id/clock-in', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ actual_start: new Date().toISOString(), status: 'in-progress' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// PATCH clock out
router.patch('/:id/clock-out', async (req, res) => {
  const actual_end = new Date().toISOString()

  const { data: appt, error: fetchError } = await supabase
    .from('appointments')
    .select('actual_start')
    .eq('id', req.params.id)
    .single()

  if (fetchError) return res.status(400).json({ error: fetchError.message })

  const hours = (new Date(actual_end).getTime() - new Date(appt.actual_start).getTime()) / 3600000

  const { data, error } = await supabase
    .from('appointments')
    .update({ actual_end, status: 'completed' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ ...data, hours_worked: Math.round(hours * 100) / 100 })
})

module.exports = router
