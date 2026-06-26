const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/reports/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/earnings', async (req, res) => {
  const { from, to } = req.query

  let query = supabase
    .from('invoice_items')
    .select('hours, rate_per_hour, rate_label, amount, invoices(created_at, status)')

  if (from) query = query.gte('invoices.created_at', new Date(from).toISOString())
  if (to)   query = query.lte('invoices.created_at', new Date(to + 'T23:59:59').toISOString())

  const { data: items, error } = await query

  if (error) return res.status(400).json({ error: error.message })

  // Filter by invoice date in JS (Supabase FK filters can be inconsistent)
  const filtered = items.filter(item => {
    if (!item.invoices?.created_at) return false
    const d = item.invoices.created_at
    if (from && d < new Date(from).toISOString()) return false
    if (to   && d > new Date(to + 'T23:59:59').toISOString()) return false
    return true
  })

  const totalHours  = Math.round(filtered.reduce((s, i) => s + (Number(i.hours) || 0), 0) * 100) / 100
  const totalAmount = Math.round(filtered.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100

  // Group by rate_label
  const byRate = {}
  for (const item of filtered) {
    const label = item.rate_label || 'Standard'
    if (!byRate[label]) byRate[label] = { label, hours: 0, amount: 0 }
    byRate[label].hours  = Math.round((byRate[label].hours  + (Number(item.hours)  || 0)) * 100) / 100
    byRate[label].amount = Math.round((byRate[label].amount + (Number(item.amount) || 0)) * 100) / 100
  }

  res.json({
    total_hours:  totalHours,
    total_amount: totalAmount,
    by_rate: Object.values(byRate).sort((a, b) => b.amount - a.amount)
  })
})

module.exports = router
