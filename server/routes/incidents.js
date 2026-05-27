const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET incidents for a client
router.get('/client/:clientId', async (req, res) => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('client_id', req.params.clientId)
    .order('occurred_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST create incident
router.post('/', async (req, res) => {
  const { appointment_id, client_id, type, description, actions_taken } = req.body

  const { data, error } = await supabase
    .from('incidents')
    .insert([{ appointment_id, client_id, type, description, actions_taken }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

module.exports = router