import { useState, useEffect } from 'react';
import { Session } from '../types';

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<Array<Session>>([])

  useEffect(() => {
    const init = async () => {
      try {
        const [sessionRes, sessionsRes] = await Promise.all([
          fetch("http://localhost:8000/session"),
          fetch("http://localhost:8000/sessions"),
        ])
        const sessionData = await sessionRes.json()
        const sessionsData = await sessionsRes.json()
        setSessionId(sessionData.session_id)
        setSessions(sessionsData.sessions)
      } catch (error) {
        console.error("Error initialising:", error)
      }
    }
    init()
  }, [])

  const loadSessions = async () => {
    try {
      const res = await fetch("http://localhost:8000/sessions")
      const data = await res.json()
      setSessions(data.sessions)
    } catch (error) {
      console.error("Error loading sessions:", error)
    }
  }

  return { sessionId, setSessionId, sessions, loadSessions }
}
