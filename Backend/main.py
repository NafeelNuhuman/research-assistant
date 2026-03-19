from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import agent
import config as app_config
import re

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
    print("RAW OUTPUT:", output)  # add this temporarily

    # Split summary and sources
    if "Sources" in output:
        parts = output.split("Sources")
        # Remove the trailing "4." or "## 4." from the summary
        summary = re.sub(r'#+\s*4\.?\s*$', '', parts[0]).strip()
        # Extract URLs from markdown links [text](url)
        sources = re.findall(r'\(https?://[^\)]+\)', parts[1])
        # Clean the parentheses off
        sources = [s.strip('()') for s in sources]
    else:
        summary = output
        sources = []

    return ResearchResponse(summary=summary,sources=sources)    
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=app_config.FASTAPI_PORT)