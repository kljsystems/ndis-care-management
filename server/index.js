require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// Routes
const clientRoutes      = require('./routes/clients')
const appointmentRoutes = require('./routes/appointments')
const invoicePDFRoutes  = require('./routes/invoices_pdf')
const invoiceRoutes     = require('./routes/invoices')
const sessionNoteRoutes = require('./routes/sessionNotes')
const incidentRoutes    = require('./routes/incidents')
const reportRoutes      = require('./routes/reports')
const searchRoutes      = require('./routes/search')
const alertRoutes       = require('./routes/alerts')

app.use('/api/clients',       clientRoutes)
app.use('/api/appointments',  appointmentRoutes)
app.use('/api/invoices',      invoicePDFRoutes)
app.use('/api/invoices',      invoiceRoutes)
app.use('/api/session-notes', sessionNoteRoutes)
app.use('/api/incidents',     incidentRoutes)
app.use('/api/reports',       reportRoutes)
app.use('/api/search',        searchRoutes)
app.use('/api/alerts',        alertRoutes)

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'NDIS Care Management API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
})