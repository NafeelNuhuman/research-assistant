import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ResearchResponse {
    summary: string
    sources: string[]
}

function App() {
    const [query, setQuery] = useState<string>("")
    const [response, setResponse] = useState<ResearchResponse | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const handleResearch = async () => {
        setIsLoading(true)
        try {
            const res = await fetch("http://localhost:8000/research/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: query })
            })
            const data = await res.json()
            setResponse(data)
        } catch (error) {
            console.error("Error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // UI goes here
    return (
        <div>
          <h1> Research Assistant</h1>
           <input 
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Enter a research topic...'
            />
            <button type="button" onClick={handleResearch} disabled={isLoading}>
              {isLoading ? "Researching..." : "Research"}
            </button>
            {isLoading && <p>Researching, please wait...</p>}
            {response && (
              <div>
                <ReactMarkdown>{response.summary}</ReactMarkdown>
              </div>
            )}
            {response && (
              <ul>
                  {response.sources.map((source, index) => (
                      <li key={index}>
                          <a href={source} target="_blank">{source}</a>
                      </li>
                  ))}
              </ul>
            )}
            
        </div>
    )
}

export default App;
