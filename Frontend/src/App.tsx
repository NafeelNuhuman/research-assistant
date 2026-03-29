import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import "./App.css"

interface Message {
  query: string
  response: string
  streaming: boolean
}

function App() {
  const [query, setQuery] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("http://localhost:8000/session")
        const data = await res.json()
        setSessionId(data.session_id)
      } catch (error) {
        console.error("Error fetching session:", error)
      }
    }
    fetchSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleResearch = async () => {
    if (!query.trim() || isLoading) return
    const currentQuery = query
    setQuery("")
    setIsLoading(true)

    setMessages(prev => [...prev, { query: currentQuery, response: "", streaming: true }])

    try {
      const res = await fetch("http://localhost:8000/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: currentQuery, session_id: sessionId })
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            response: updated[updated.length - 1].response + chunk
          }
          return updated
        })
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          response: "An error occurred. Please try again."
        }
        return updated
      })
    } finally {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false }
        return updated
      })
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleResearch()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Research Assistant</h1>
      </header>

      <main className="chat-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Ask me anything to get started.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="message-pair">
            <div className="bubble user-bubble">
              {msg.query}
            </div>
            <div className="bubble assistant-bubble">
              {msg.response
                ? <ReactMarkdown>{msg.response}</ReactMarkdown>
                : <span className="typing-indicator"><span/><span/><span/></span>
              }
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </main>

      <div className="input-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a research topic..."
          disabled={isLoading}
        />
        <button onClick={handleResearch} disabled={isLoading || !query.trim()}>
          {isLoading ? "Researching…" : "Research"}
        </button>
      </div>
    </div>
  )
}

export default App;
