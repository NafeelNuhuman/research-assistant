import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import "./App.css"

function App() {
    const [query, setQuery] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [sessionId, setSessionId] = useState<string>("")
    const [streamedResponse, setStreamedResponse] = useState<string>("")
    
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
        setStreamedResponse("")
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
              setStreamedResponse(prev => prev + chunk)
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
      {isLoading && <p className="loading">Researching, please wait...</p>}
      {streamedResponse && (
        <div className="results">
          <div className="summary">
            <ReactMarkdown>{streamedResponse}</ReactMarkdown>
          </div>
        </div>
        )}
    </div>
  )
}

export default App;
