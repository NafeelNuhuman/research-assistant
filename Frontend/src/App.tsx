import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import "./App.css"

type Message = {
  role : "user" | "assistant";
  content : string;
}

function App() {
    const [query, setQuery] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [sessionId, setSessionId] = useState<string>("")
    const [streamedResponse, setStreamedResponse] = useState<string>("")
    const [messages, setMessages] = useState<Array<Message>>([])
    
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

    const handleResearch = async () => {
        setIsLoading(true)
        let message : Message = { role: "user", content: query}
        setMessages([...messages,message])
        let assistantMsg: Message = { role: 'assistant', content: ''}
        setMessages(prev=>[...prev,assistantMsg])
        try {
            const res = await fetch("http://localhost:8000/research/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: query,session_id: sessionId })
            })
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()

            while(true){
              const { done, value } = await reader.read()
              if(done) break
              const chunk = decoder.decode(value)
              setMessages(prev => [
                ...prev.slice(0, -1),
                { ...prev[prev.length - 1], content: prev[prev.length - 1].content + chunk }
              ])
            }
        } catch (error) {
            console.error("Error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // UI goes here
    return (
    <div className="container">
      <h1>Research Assistant</h1>
      {isLoading && <p className="loading">Researching, please wait...</p>}
        <div className="results">
          <div className="summary">
            {messages.map((message, index) => message.role === "user" ?
              <div key={index}>
                <div>User</div>
                <div><ReactMarkdown>{message.content}</ReactMarkdown></div>
              </div>
              : <div key={index}>
                <div>Assistant</div>
                <div><ReactMarkdown>{message.content}</ReactMarkdown></div>
              </div>)}
          </div>
        </div>
        <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a research topic..."
        />
        <button onClick={handleResearch} disabled={isLoading}>
          {isLoading ? "Researching..." : "Research"}
        </button>
      </div>
    </div>
  )
}

export default App;
