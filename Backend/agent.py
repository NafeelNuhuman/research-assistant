import json

from langchain_ollama import ChatOllama
from langchain.agents import create_agent
from langchain_core.tools import tool
from bs4 import BeautifulSoup
from langchain_community.tools import DuckDuckGoSearchResults
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessageChunk
import requests
import config as app_config

checkpointer = MemorySaver()

@tool
def fetch_page_content(url:str) -> str:
    """Fetch and return the text content of a webpage given its URL. 
    Use this to read the full content of a page found during search."""
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        return soup.get_text()[:5000] 
    except Exception as e:
        return f"Error fetching page content: {str(e)}"
    
@tool
def search_wikipedia(query: str) -> str:
    """Search Wikipedia for a query and return a summary of the top result.
    Use this to get encyclopedic background information on a topic."""
    try:
        search_url = "https://en.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": 1,
        }
        search_resp = requests.get(search_url, params=search_params)
        search_resp.raise_for_status()
        results = search_resp.json().get("query", {}).get("search", [])
        if not results:
            return "No Wikipedia results found."
        title = results[0]["title"]
        summary_params = {
            "action": "query",
            "prop": "extracts",
            "exintro": True,
            "explaintext": True,
            "titles": title,
            "format": "json",
        }
        summary_resp = requests.get(search_url, params=summary_params)
        summary_resp.raise_for_status()
        pages = summary_resp.json().get("query", {}).get("pages", {})
        page = next(iter(pages.values()))
        extract = page.get("extract", "No content available.")
        page_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
        return f"**{title}**\n{extract[:3000]}\n\nSource: {page_url}"
    except Exception as e:
        return f"Error fetching Wikipedia content: {str(e)}"

@tool
def search_web(query:str) -> str:
    """Search the web for a query and return a summary of the top results.
    Use this to find relevant information and sources for the research question."""
    try:
        search = DuckDuckGoSearchResults()
        return search.run(query)
    except Exception as e:
        return f"Error during web search: {str(e)}"
    

def get_agent():
    llm = ChatOllama(model=app_config.LLM_MODEL)
    tools = [search_web, search_wikipedia, fetch_page_content]
    prompt = """You are a research assistant. When given a topic, 
        use your tools to search the web and read relevant sources. 
        Produce a structured summary with these sections:
        1. Overview
        2. Key Findings
        3. Conflicting Information (if any)
        4. Sources (Structure sources as [text](url))
        Base your answer strictly on what you found. If you cannot find 
        sufficient information, state that clearly."""
    return create_agent(model = llm, tools=tools, system_prompt=prompt,checkpointer=checkpointer)

def research(topic:str, session_id:str) -> str:
    agent = get_agent()
    result = agent.invoke(
    {"messages": [{"role": "user", "content": topic}]},
    config={"recursion_limit": app_config.MAX_ITERATIONS,
            "configurable":{"thread_id":session_id}}
    )
    return result["messages"][-1].content

def research_stream(topic:str, session_id:str):
    agent =  get_agent()
    for chunk in agent.stream(
        {"messages": [{"role": "user", "content": topic}]},
        config={"recursion_limit": app_config.MAX_ITERATIONS,
                "configurable":{"thread_id":session_id}},
        stream_mode="messages"        
    ):
        message = chunk[0]
        if isinstance(message, AIMessageChunk):
            if (not message.tool_calls) and message.content: 
                yield json.dumps({"type":"content","content": message.content}) + "\n"
            else:
                for call in message.tool_calls:
                    if 'name' in call and 'args' in call:
                        yield json.dumps({ "type": "tool_call", "tool": call["name"], "args": call["args"] }) + "\n"

