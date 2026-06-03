const API = import.meta.env.VITE_API_URL

export const getIncidents = async (clientId: string) => {
  const res = await fetch(`${API}/incidents/client/${clientId}`)
  return res.json()
}

export const createIncident = async (data: any) => {
  const res = await fetch(`${API}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}