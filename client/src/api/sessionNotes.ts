const API = import.meta.env.VITE_API_URL

export const getSessionNote = async (appointmentId: string) => {
  const res = await fetch(`${API}/session-notes/${appointmentId}`)
  return res.json()
}

export const createSessionNote = async (data: any) => {
  const res = await fetch(`${API}/session-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}