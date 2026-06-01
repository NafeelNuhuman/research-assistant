# test_tools.py
from agent import search_web, fetch_page_content

# Test search
print("Testing search...")
result = search_web.invoke("quantum computing")
print(result)
print("---")

# Test fetch
print("Testing fetch...")
result = fetch_page_content.invoke("https://example.com")
print(result)

# Test title column and update_session_title
print("\nTesting session title...")
import uuid
import database

database.init_db()
test_sid = str(uuid.uuid4())
database.create_session(test_sid)

database.update_session_title(test_sid, "Quantum Computing Explained")
sessions = database.get_sessions()
match = next((s for s in sessions if s["session_id"] == test_sid), None)
assert match is not None, "Session not found"
assert match["title"] == "Quantum Computing Explained", f"Expected title, got: {match['title']}"

# New sessions without a title should return None
test_sid2 = str(uuid.uuid4())
database.create_session(test_sid2)
sessions2 = database.get_sessions()
match2 = next((s for s in sessions2 if s["session_id"] == test_sid2), None)
assert match2["title"] is None, f"Expected None, got: {match2['title']}"

database.delete_session(test_sid)
database.delete_session(test_sid2)
print("Session title: PASS")

# Test generate_title fallback (mocks LLM — no Ollama required)
print("\nTesting generate_title fallback...")
from unittest.mock import patch
from agent import generate_title

with patch('agent.ChatOllama') as MockOllama:
    MockOllama.return_value.invoke.side_effect = Exception("connection refused")
    result = generate_title("quantum computing")
    assert result == "quantum computing", f"Expected 'quantum computing', got '{result}'"
print("generate_title fallback: PASS")

# Test generate_title happy path
print("\nTesting generate_title happy path...")
from unittest.mock import MagicMock

with patch('agent.ChatOllama') as MockOllama:
    mock_response = MagicMock()
    mock_response.content = "  Quantum Computing Overview  "
    MockOllama.return_value.invoke.return_value = mock_response
    result = generate_title("quantum computing")
    assert result == "Quantum Computing Overview", f"Got: '{result}'"
print("generate_title happy path: PASS")