import React from 'react';
import { useSession } from './hooks/useSession';
import { useResearch } from './hooks/useResearch';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import "./App.css"

function App() {
  const session = useSession()
  const research = useResearch(session.sessionId, session.loadSessions)

  const handleNewChat = async () => {
    if (research.isLoading) return
    try {
      const res = await fetch("http://localhost:8000/session")
      const data = await res.json()
      session.setSessionId(data.session_id)
      research.setMessages([])
      research.setQuery("")
      await session.loadSessions()
    } catch (error) {
      console.error("Error creating new chat:", error)
    }
  }

  const handleSelectSession = async (sid: string) => {
    if (research.isLoading || sid === session.sessionId) return
    session.setSessionId(sid)
    research.setMessages([])
    await research.loadHistory(sid)
  }

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation()
    if (research.isLoading) return
    await fetch(`http://localhost:8000/session/${sid}`, { method: "DELETE" })
    if (sid === session.sessionId) {
      const res = await fetch("http://localhost:8000/session")
      const data = await res.json()
      session.setSessionId(data.session_id)
      research.setMessages([])
    }
    await session.loadSessions()
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessionId={session.sessionId}
        sessions={session.sessions}
        isLoading={research.isLoading}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />
      <div className="container">
        <ChatWindow
          messages={research.messages}
          isLoading={research.isLoading}
          toolStatus={research.toolStatus}
          bottomRef={research.bottomRef}
        />
        <InputBar
          query={research.query}
          setQuery={research.setQuery}
          isLoading={research.isLoading}
          handleResearch={research.handleResearch}
          handleKeyDown={research.handleKeyDown}
        />
      </div>
    </div>
  )
}

export default App;
