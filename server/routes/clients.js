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

// POST create client
router.post('/', async (req, res) => {
  const {
    full_name, ndis_number, date_of_birth, address,
    phone, email, emergency_contact_name, emergency_contact_phone
  } = req.body

  const { data, error } = await supabase
    .from('clients')
    .insert([{
      full_name, ndis_number, date_of_birth, address,
      phone, email, emergency_contact_name, emergency_contact_phone
    }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

// PUT update client
router.put('/:id', async (req, res) => {
  const {
    full_name, ndis_number, date_of_birth, address,
    phone, email, emergency_contact_name, emergency_contact_phone
  } = req.body

  const { data, error } = await supabase
    .from('clients')
    .update({
      full_name, ndis_number, date_of_birth, address,
      phone, email, emergency_contact_name, emergency_contact_phone
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST add rate to client  ← was incorrectly nested inside PUT above
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