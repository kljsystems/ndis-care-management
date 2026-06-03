const API = import.meta.env.VITE_API_URL

export const getAppointments = async () => {
  const res = await fetch(`${API}/appointments`)
  return res.json()
}

export const createAppointment = async (data: any) => {
  const res = await fetch(`${API}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export const clockIn = async (id: string) => {
  const res = await fetch(`${API}/appointments/${id}/clock-in`, { method: 'PATCH' })
  return res.json()
}

export const clockOut = async (id: string) => {
  const res = await fetch(`${API}/appointments/${id}/clock-out`, { method: 'PATCH' })
  return res.json()
}

export const completeAppointment = async (id: string) => {
  const res = await fetch(`${API}/appointments/${id}/complete`, { method: 'PATCH' })
  return res.json()
}

export const cancelAppointment = async (id: string) => {
  const res = await fetch(`${API}/appointments/${id}/cancel`, { method: 'PATCH' })
  return res.json()
}