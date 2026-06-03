const API = import.meta.env.VITE_API_URL

export const getInvoices = async () => {
  const res = await fetch(`${API}/invoices`)
  return res.json()
}

export const getInvoice = async (id: string) => {
  const res = await fetch(`${API}/invoices/${id}`)
  return res.json()
}

export const createInvoice = async (data: any) => {
  const res = await fetch(`${API}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export const markAsPaid = async (id: string) => {
  const res = await fetch(`${API}/invoices/${id}/paid`, { method: 'PATCH' })
  return res.json()
}