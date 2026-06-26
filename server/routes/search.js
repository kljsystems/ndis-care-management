const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/search?q=<term>
// Returns { clients, appointments, invoices } grouped results.
// Minimum 2 characters required to avoid returning everything.
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 2) {
    return res.json({ clients: [], appointments: [], invoices: [] })
  }

  const lowerQ = q.toLowerCase()

  const [clientsRes, apptsRes, invoicesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name')
      .ilike('full_name', `%${q}%`)
      .limit(5),

    // Date is stored as YYYY-MM-DD so partial strings like "2026-06" work naturally
    supabase
      .from('appointments')
      .select('id, date, clients(full_name)')
      .ilike('date', `%${q}%`)
      .limit(5),

    // Fetch all invoices with client name; filter by short ID or client name in JS
    // (PostgREST doesn't support ilike on embedded foreign-key columns)
    supabase
      .from('invoices')
      .select('id, clients(full_name)')
      .limit(200)
  ])

  const clients = (clientsRes.data || []).map(c => ({
    id: c.id,
    name: c.full_name
  }))

  const appointments = (apptsRes.data || []).map(a => ({
    id: a.id,
    date: a.date,
    clientName: a.clients?.full_name || ''
  }))

  const invoices = (invoicesRes.data || [])
    .filter(inv =>
      inv.id.toLowerCase().includes(lowerQ) ||
      (inv.clients?.full_name || '').toLowerCase().includes(lowerQ)
    )
    .slice(0, 5)
    .map(inv => ({
      id: inv.id,
      invoiceNumber: inv.id.slice(0, 8).toUpperCase(),
      clientName: inv.clients?.full_name || ''
    }))

  res.json({ clients, appointments, invoices })
})

module.exports = router
