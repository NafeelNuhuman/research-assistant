import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import "./App.css"

type Message = {
  role : "user" | "assistant";
  content : string;
}

type Session = {
  session_id: string;
  created_at: string;
}

function App() {
    const [query, setQuery] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [sessionId, setSessionId] = useState<string>("")
    const [messages, setMessages] = useState<Array<Message>>([])
    const bottomRef = useRef<HTMLDivElement>(null)
    const [toolStatus, setToolStatus] = useState<string>("")
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

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const loadSessions = async () => {
      try {
        const res = await fetch("http://localhost:8000/sessions")
        const data = await res.json()
        setSessions(data.sessions)
      } catch (error) {
        console.error("Error loading sessions:", error)
      }
    }

    const loadHistory = async (sid: string) => {
      try {
        const res = await fetch(`http://localhost:8000/session/${sid}/messages`)
        const data = await res.json()
        setMessages(data.messages)
      } catch (error) {
        console.error("Error loading history:", error)
      }
    }

    const handleNewChat = async () => {
      if (isLoading) return
      try {
        const res = await fetch("http://localhost:8000/session")
        const data = await res.json()
        setSessionId(data.session_id)
        setMessages([])
        setQuery("")
        await loadSessions()
      } catch (error) {
        console.error("Error creating new chat:", error)
      }
    }

    const handleSelectSession = async (sid: string) => {
      if (isLoading || sid === sessionId) return
      setSessionId(sid)
      setMessages([])
      await loadHistory(sid)
    }

    const handleResearch = async () => {
        if (!query.trim() || isLoading) return
        setIsLoading(true)
        const userQuery = query
        setQuery("")
        let message : Message = { role: "user", content: userQuery }
        setMessages(prev => [...prev, message])
        let assistantMsg: Message = { role: 'assistant', content: ''}
        setMessages(prev => [...prev, assistantMsg])
        try {
            const res = await fetch("http://localhost:8000/research/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: userQuery, session_id: sessionId })
            })
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()

            while(true){
              const { done, value } = await reader.read()
              if(done) break
              const chunk = decoder.decode(value)
              const chunks = chunk.split("\n")
              for(let line of chunks)
              {
                if (!line.trim()) continue
                const json = JSON.parse(line)
                switch(json.type) {
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

    // Pair messages into exchanges: each user message + following assistant reply
    const exchanges: Array<{ user: Message; assistant: Message | null }> = []
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") {
        const next = messages[i + 1]
        exchanges.push({
          user: messages[i],
          assistant: next?.role === "assistant" ? next : null,
        })
        if (next?.role === "assistant") i++
      }
    }

    return (
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">Research Assistant</div>
          <button className="new-chat-btn" onClick={handleNewChat} disabled={isLoading}>
            + New Chat
          </button>
          <div className="session-list">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className={`session-item${s.session_id === sessionId ? " active" : ""}`}
                onClick={() => handleSelectSession(s.session_id)}
                title={s.created_at}
              >
                {s.session_id.slice(0, 8)}…
              </div>
            ))}
          </div>
        </aside>

        {/* Main chat */}
        <div className="container">
          <div className="chat-window">
            {exchanges.map((exchange, index) => (
              <div key={index} className="exchange">
                <div className="bubble user-bubble">{exchange.user.content}</div>
                {exchange.assistant !== null && (
                  <div className="bubble assistant-bubble">
                    {exchange.assistant.content === "" && isLoading
                      ? toolStatus.length === 0
                        ? <span className="typing-indicator">Researching…</span>
                        : <span className="typing-indicator">{toolStatus}</span>
                      : <ReactMarkdown remarkPlugins={[remarkGfm]}>{exchange.assistant.content}</ReactMarkdown>
                    }
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="input-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a research topic..."
            />
            <button onClick={handleResearch} disabled={isLoading}>
              {isLoading ? "Researching..." : "Research"}
            </button>
          </div>
        </div>
      </div>
    )
}

export default App;
