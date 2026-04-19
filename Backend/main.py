import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import uuid
import agent
import config as app_config
import database
import re

@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str
    session_id: str 

class ResearchResponse(BaseModel):
    summary: str
    sources: list[str]

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/session")
async def getSessionId():
    session_id = str(uuid.uuid4())
    database.create_session(session_id=session_id)
    return {"session_id":session_id}


@app.get("/sessions")
async def getSessions():
    return {"sessions": database.get_sessions()}


@app.get("/session/{session_id}/messages")
async def getSessionMessages(session_id: str):
    return {"messages": database.get_messages(session_id)}


@app.post("/research/",  response_model=ResearchResponse)
async def research( request: ResearchRequest):
    output = agent.research(topic=request.topic, session_id=request.session_id)

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

@app.post("/research/stream")
async def research_stream(request: ResearchRequest):
    async def stream_and_save():
        accumulated = ""
        for chunk in agent.research_stream(
            topic=request.topic,
            session_id=request.session_id
        ):
            yield chunk
            try:
                data = json.loads(chunk.strip())
                if data.get("type") == "content":
                    accumulated += data.get("content", "")
            except (json.JSONDecodeError, AttributeError):
                pass

        if accumulated:
            next_position = database.get_max_position(request.session_id) + 1
            database.save_message(request.session_id, "user", request.topic, next_position)
            database.save_message(request.session_id, "assistant", accumulated, next_position + 1)

    return StreamingResponse(stream_and_save(), media_type="text/event-stream")
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=app_config.FASTAPI_PORT)