const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET session notes for an appointment
router.get('/:appointmentId', async (req, res) => {
  const { data, error } = await supabase
    .from('session_notes')
    .select('*, medications(*)')
    .eq('appointment_id', req.params.appointmentId)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST create session note
router.post('/', async (req, res) => {
  const { appointment_id, notes, medications } = req.body

  const { data: note, error: noteError } = await supabase
    .from('session_notes')
    .insert([{ appointment_id, notes }])
    .select()
    .single()

  if (noteError) return res.status(400).json({ error: noteError.message })

  if (medications && medications.length > 0) {
    const medsWithNoteId = medications.map(med => ({
      ...med, session_note_id: note.id
    }))
    const { error: medError } = await supabase
      .from('medications')
      .insert(medsWithNoteId)
    if (medError) return res.status(400).json({ error: medError.message })
  }

  res.status(201).json(note)
})

module.exports = router