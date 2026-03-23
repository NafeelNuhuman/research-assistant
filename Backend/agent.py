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
    tools = [search_web, fetch_page_content]
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
        if isinstance(message, AIMessageChunk) and message.content:
            if not message.tool_calls: 
                yield message.content

