import { useState, useEffect, useRef } from 'react';
import { Message } from '../types';

export function useResearch(sessionId: string, loadSessions: () => Promise<void>) {
  const [messages, setMessages] = useState<Array<Message>>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [toolStatus, setToolStatus] = useState<string>("")
  const [query, setQuery] = useState<string>("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadHistory = async (sid: string) => {
    try {
      const res = await fetch(`http://localhost:8000/session/${sid}/messages`)
      const data = await res.json()
      setMessages(data.messages)
    } catch (error) {
      console.error("Error loading history:", error)
    }
  }

  const handleResearch = async () => {
    if (!query.trim() || isLoading) return
    setIsLoading(true)
    const userQuery = query
    setQuery("")
    setMessages(prev => [...prev, { role: "user", content: userQuery }])
    setMessages(prev => [...prev, { role: "assistant", content: "" }])
    try {
      const res = await fetch("http://localhost:8000/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: userQuery, session_id: sessionId })
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split("\n")) {
          if (!line.trim()) continue
          const json = JSON.parse(line)
          switch (json.type) {
            case 'tool_call':
              setToolStatus("using " + json.tool + " tool...")
              break
            case 'content':
              setToolStatus("")
              setMessages(prev => [
                ...prev.slice(0, -1),
                { ...prev[prev.length - 1], content: prev[prev.length - 1].content + json.content }
              ])
              break
          }
        }
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
      setToolStatus("")
      await loadSessions()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleResearch()
    }
  }

  return {
    messages, setMessages,
    isLoading,
    toolStatus,
    query, setQuery,
    bottomRef,
    loadHistory,
    handleResearch,
    handleKeyDown,
  }
}
