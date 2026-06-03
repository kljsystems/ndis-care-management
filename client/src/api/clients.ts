const API = import.meta.env.VITE_API_URL

export const getClients = async () => {
  const res = await fetch(`${API}/clients`)
  return res.json()
}

export const getClient = async (id: string) => {
  const res = await fetch(`${API}/clients/${id}`)
  return res.json()
}

export const createClient = async (data: any) => {
  const res = await fetch(`${API}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export const updateClient = async (id: string, data: any) => {
  const res = await fetch(`${API}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}