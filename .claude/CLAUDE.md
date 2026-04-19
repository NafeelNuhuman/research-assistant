# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack AI research assistant that runs a ReAct (Reasoning + Acting) loop: takes a user topic, autonomously searches the web via DuckDuckGo and Wikipedia, fetches page content, and streams a structured markdown summary back to a React frontend. Supports multiple persistent chat sessions stored in SQLite.

## Commands

### Backend
```bash
cd Backend
venv/Scripts/activate          # Windows
pip install -r requirements.txt
python main.py                 # starts FastAPI on port 8000
```

Run backend tool tests (no test framework — just a script):
```bash
cd Backend
python test.py
```

### Frontend
```bash
cd Frontend
npm install
npm start          # starts React dev server on port 3000
npm test           # runs Jest tests
npx tsc --noEmit   # type-check without building
```

### Ollama (required)
```bash
ollama signin   # required for cloud models
ollama serve
```

Three processes must run simultaneously: Ollama, FastAPI backend, React frontend.

## Architecture

### Backend (`Backend/`)

- **`main.py`** — FastAPI app. Initialises the DB on startup via `lifespan`. Endpoints:
  - `GET /session` — creates a new UUID session in SQLite, returns `{session_id}`
  - `GET /sessions` — returns all sessions ordered by `created_at DESC`
  - `GET /session/{session_id}/messages` — returns message history for a session
  - `DELETE /session/{session_id}` — deletes session (CASCADE removes its messages)
  - `POST /research/` — blocking research, parses sources from markdown links via regex
  - `POST /research/stream` — preferred; SSE/NDJSON stream, saves messages to DB on completion
  - CORS locked to `localhost:3000`

- **`agent.py`** — LangChain agent. Three `@tool` functions: `search_web` (DuckDuckGo), `search_wikipedia` (Wikipedia REST API, first result intro), `fetch_page_content` (BeautifulSoup scraper, 5000 char limit). `get_agent()` builds the agent with `create_agent` and a shared `MemorySaver` checkpointer for per-session conversation history. `research_stream()` yields NDJSON lines: `{"type":"tool_call","tool":...}` during tool use and `{"type":"content","content":...}` for LLM output chunks. Simple in-memory `_cache` dict (keyed on lowercased topic) short-circuits repeated queries within the same process lifetime.

- **`database.py`** — SQLite via stdlib `sqlite3`. Single module-level `connection` with `PRAGMA foreign_keys = ON`. Two tables: `SESSIONS (session_id PK, created_at)` and `MESSAGES (message_id, session_id FK → CASCADE, role, content, position)`. Functions: `init_db`, `create_session`, `save_message`, `get_messages`, `get_max_position`, `get_sessions`, `delete_session`.

- **`config.py`** — `LLM_MODEL`, `FASTAPI_PORT` (8000), `MAX_ITERATIONS` (LangGraph recursion limit), `MAX_SEARCH_RESULTS`, `SQLITE_DB_PATH`.

### Frontend (`Frontend/src/`)

- **`App.tsx`** — Single-component React app. On mount, fires parallel `Promise.all` fetches for a new session and the full sessions list. Layout: two-column flex — `<aside className="sidebar">` (session list + New Chat button + per-session delete) + `<div className="container">` (chat window + input bar). Session items show first 8 chars of UUID. Streaming: reads NDJSON from `/research/stream` line-by-line; `tool_call` lines update `toolStatus`; `content` lines append to the last assistant message. After stream ends, calls `loadSessions()` to refresh the sidebar. Markdown rendered via `react-markdown` + `remark-gfm`.

- **`App.css`** — `.app-layout` (flex row, 100vh). `.sidebar` (240px, `#1a1a2e`). `.container` (flex: 1). All bubble/exchange/input-bar rules follow.

### Data flow for streaming
```
User input → POST /research/stream → agent.research_stream() generator
  → yields {"type":"tool_call",...} or {"type":"content",...} as NDJSON lines
  → main.py stream_and_save() accumulates content, saves to DB when done
  → frontend parses each line and updates React state incrementally
```

## Key Constraints

- The agent system prompt requires sources formatted as `[text](url)` — the `/research/` (non-streaming) endpoint regex depends on this exact format.
- `MAX_ITERATIONS` in `config.py` is the LangGraph recursion limit — increase it if the agent is cut off on complex topics.
- The `_cache` in `agent.py` is process-scoped (in-memory) — it bypasses the LLM entirely for repeated topics. Clear by restarting the backend.
- `langgraph` is used in `agent.py` (`MemorySaver`) but is not listed in `requirements.txt` — install it separately if missing.
- The `database.py` module opens a single SQLite connection at import time. It is not async-safe; the FastAPI endpoints are synchronous wrappers around it.
