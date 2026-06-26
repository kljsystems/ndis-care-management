const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

const LONG_SESSION_HOURS = 4
const OVERDUE_DAYS = 14

// GET /api/alerts
// Returns sessions clocked in too long and invoices unpaid too long.
// No state stored — alerts resolve automatically when the underlying record changes.
router.get('/', async (req, res) => {
  const now = Date.now()
  const longRunningCutoff = new Date(now - LONG_SESSION_HOURS * 3_600_000).toISOString()
  const overdueCutoff     = new Date(now - OVERDUE_DAYS     * 86_400_000).toISOString()

  const [sessionsRes, invoicesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, actual_start, clients(full_name)')
      .eq('status', 'in-progress')
      .lt('actual_start', longRunningCutoff),

    supabase
      .from('invoices')
      .select('id, created_at, total, clients(full_name)')
      .neq('status', 'paid')
      .lt('created_at', overdueCutoff)
  ])

  const long_sessions = (sessionsRes.data || []).map(a => ({
    type: 'long_session',
    id: a.id,
    clientName: a.clients?.full_name || 'Unknown',
    actual_start: a.actual_start,
    hours_elapsed: Math.floor((now - new Date(a.actual_start).getTime()) / 3_600_000)
  }))

  const overdue_invoices = (invoicesRes.data || []).map(inv => ({
    type: 'overdue_invoice',
    id: inv.id,
    clientName: inv.clients?.full_name || 'Unknown',
    created_at: inv.created_at,
    total: inv.total,
    days_overdue: Math.floor((now - new Date(inv.created_at).getTime()) / 86_400_000)
  }))

  res.json({ long_sessions, overdue_invoices })
})

module.exports = router
