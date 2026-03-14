from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import agent
import config as app_config

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

class ResearchResponse(BaseModel):
    summary: str
    sources: list[str]

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/research/",  response_model=ResearchResponse)
async def research( request: ResearchRequest ):
    output = agent.research(request.topic)

    # Split summary and sources
    if "Sources" in output:
        parts = output.split("Sources")
        summary = parts[0].strip()
        # Extract URLs from the source section
        sources = [line.strip() for line in parts[1].splitlines() if "http" in line]
    else:
        summary = output
        sources = []

    return ResearchResponse(summary=summary,sources=sources)    
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=app_config.FASTAPI_PORT)