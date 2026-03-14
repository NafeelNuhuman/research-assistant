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