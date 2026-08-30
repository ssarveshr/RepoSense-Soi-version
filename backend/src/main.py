from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.services.search_service import engine
from src.services.summarizer_service import RepoSummarizer
from src.integrations.github import GitHubAnalyzer
from src.services.analytics_service import analytics_service
import os
import requests

app = FastAPI(
    title="RepoSense AI API",
    description="Intelligent Repository Discovery & Semantic Search API"
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows your React frontend (running on port 5173/3000) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "message": "RepoSense AI Engine is running",
        "capabilities": ["Semantic Search", "Hybrid Ranking", "GitHub Discovery"]
    }

import requests

@app.get("/search")
async def search_repositories(q: str = Query(..., min_length=1)):
    """
    Live GitHub Search + AI Reranking.
    Fetches the best matches from GitHub and then uses Sentence-Transformers
    to sort them by actual semantic meaning.
    """
    try:
        # 1. Fetch from GitHub Search API (Top 30 results)
        github_url = f"https://api.github.com/search/repositories?q={q}&sort=stars&order=desc"
        response = requests.get(github_url, headers={'Accept': 'application/vnd.github.v3+json'})
        
        if response.status_code != 200:
            return {"error": "GitHub API error", "results": []}

        items = response.json().get('items', [])
        
        # 2. Format for our engine
        candidates = []
        for item in items[:30]:
            candidates.append({
                "id": item['id'],
                "name": item['name'],
                "description": item['description'] or "No description provided.",
                "url": item['html_url'],
                "stars": item['stargazers_count'],
                "category": item.get('language', 'Universal')
            })

        # 3. AI Reranking
        # This is where the magic happens: sorting by meaning, not just stars
        results = engine.rank_results(q, candidates, limit=10)
        
        return {
            "query": q,
            "count": len(results),
            "results": results,
            "source": "live_github"
        }
    except Exception as e:
        return {"error": str(e), "results": []}

@app.get("/trending")
async def get_trending_repos():
    """Returns top trending repos globally across all of GitHub."""
    try:
        url = "https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc"
        response = requests.get(url)
        items = response.json().get('items', [])
        
        results = []
        for item in items[:6]:
            results.append({
                "id": item['id'],
                "name": item['name'],
                "description": item['description'],
                "url": item['html_url'],
                "stars": item['stargazers_count'],
                "category": "Trending"
            })
        return results
    except Exception as e:
        return []

@app.get("/categories/{category_name}")
async def get_by_category(category_name: str):
    """Fetches live results based on a category/topic."""
    return await search_repositories(category_name)

# Request model for GitHub summarization
class GitHubSummarizeRequest(BaseModel):
    github_url: str

@app.post("/summarize-github")
async def summarize_github_repo(request: GitHubSummarizeRequest):
    """
    Analyze a GitHub repository URL and generate an AI-powered summary WITHOUT cloning.
    """
    try:
        # Initialize analyzers
        github_analyzer = GitHubAnalyzer()
        summarizer = RepoSummarizer()
        
        # Step 1: Extract data from GitHub APIs
        analysis_data = github_analyzer.analyze_github_repo(request.github_url)
        
        # Step 2: Generate AI summary using Ollama
        summary = summarizer.generate_summary(analysis_data)
        
        # Merge GitHub metadata with AI summary
        summary['name'] = analysis_data.get('name', '')
        summary['description'] = analysis_data.get('description', '')
        summary['stars'] = analysis_data.get('stars', 0)
        summary['language'] = analysis_data.get('language', '')
        
        return {
            "status": "success",
            "summary": summary,
            "raw_analysis": {
                "file_tree": analysis_data.get('file_tree', []),
                "tech_stack": analysis_data.get('tech_stack', []),
                "dependencies": analysis_data.get('dependencies', [])
            }
        }
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- NEW ANALYTICS, KNOWLEDGE SEARCH & RAG CHATBOT ENDPOINTS ---

class TrackRequest(BaseModel):
    path: str
    event_type: str  # 'view', 'click', 'search'
    element_id: str = None
    query: str = None
    session_id: str = None

class ChatbotRequest(BaseModel):
    query: str
    session_id: str = None

@app.post("/api/analytics/track")
async def track_event(request: TrackRequest, req: Request):
    ip = req.client.host
    user_agent = req.headers.get("user-agent", "unknown")
    
    if request.event_type == 'view':
        analytics_service.log_page_view(request.path, request.session_id, ip, user_agent)
    elif request.event_type == 'click':
        analytics_service.log_click(request.path, request.element_id, request.session_id)
    elif request.event_type == 'search':
        analytics_service.log_search(request.query, request.element_id or "repositories", request.session_id)
        
    return {"status": "success"}

@app.get("/api/analytics/report")
async def get_analytics_report():
    return analytics_service.get_analytics_report()

@app.get("/api/search-knowledge")
async def search_knowledge(q: str = Query(..., min_length=1)):
    """Search comparison and guide documentation semantically."""
    try:
        results = engine.search_documentation(q, limit=6)
        return {"query": q, "results": results}
    except Exception as e:
        return {"error": str(e), "results": []}

@app.post("/api/chatbot")
async def chatbot_chat(request: ChatbotRequest):
    """
    RAG-powered Chatbot. Finds relevant Git comparison documents in ChromaDB
    and synthesizes an answer using the local Ollama LLM.
    """
    try:
        query = request.query
        
        # 1. Search the RAG vector database for context
        context_results = engine.search_documentation(query, limit=4)
        
        # 2. Build context text
        context_text = ""
        references = []
        seen_refs = set()
        
        for idx, res in enumerate(context_results):
            context_text += f"\nDocument [{idx+1}]: {res['title']}\nSource: {res['source']}\nContent:\n{res['content']}\n"
            
            ref_key = (res['title'], res['url'], res['file_path'])
            if ref_key not in seen_refs:
                seen_refs.add(ref_key)
                references.append({
                    "title": res['title'],
                    "source": res['source'],
                    "url": res['url'],
                    "file_path": res['file_path']
                })
        
        # 3. Create prompt for local LLM
        system_prompt = (
            "You are an expert AI Assistant specialized in comparing version control systems, primarily GitHub vs GitLab. "
            "Your task is to answer user queries using the provided RAG Context documents. "
            "Be technical, clear, and objective. If the context does not contain the answer, use your own pre-trained knowledge to answer, "
            "but clearly state that the information comes from your own knowledge base rather than the uploaded documentation."
        )
        
        prompt = f"""System: {system_prompt}

RAG Context Documents:
{context_text if context_text else "No documentation found for this query."}

User Query: {query}

Provide a comprehensive, formatted markdown response. Include code blocks or command line scripts where appropriate:"""

        # 4. Call local Ollama
        ollama_url = "http://localhost:11434"
        ollama_model = "llama3:8b" # default
        
        # Check if Ollama has standard llama3 or llama3:8b
        try:
            models_response = requests.get(f"{ollama_url}/api/tags", timeout=3)
            if models_response.status_code == 200:
                available_models = [m['name'] for m in models_response.json().get('models', [])]
                if "llama3:latest" in available_models or "llama3" in available_models:
                    ollama_model = "llama3"
                elif available_models:
                    ollama_model = available_models[0].split(':')[0]
        except:
            pass
            
        try:
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": ollama_model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120
            )
            
            if response.status_code == 200:
                answer = response.json().get('response', '')
            else:
                answer = f"Error calling Ollama API ({response.status_code}): {response.text}"
        except requests.exceptions.ConnectionError:
            answer = (
                "⚠️ RAG Chatbot Offline: Could not connect to local Ollama. "
                "Ensure Ollama is running (`ollama serve`) and the `llama3` model is pulled (`ollama pull llama3`)."
            )
            
        return {
            "query": query,
            "answer": answer,
            "references": references
        }
    except Exception as e:
        return {"error": str(e), "answer": f"An error occurred: {str(e)}", "references": []}

@app.get("/api/docs/content")
async def get_doc_content(file_path: str):
    """Safely reads and returns full markdown document content."""
    try:
        normalized_path = os.path.normpath(file_path)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        pipeline_dir = os.path.abspath(os.path.join(os.path.dirname(base_dir), "Knowledge-Ingestion-Pipeline"))
        
        # Security check: ensure path is within Knowledge-Ingestion-Pipeline
        if not normalized_path.startswith(pipeline_dir) and not "Knowledge-Ingestion-Pipeline" in normalized_path:
            return {"error": "Access denied: Unauthorized directory access."}
            
        if not os.path.exists(normalized_path) or not os.path.isfile(normalized_path):
            return {"error": f"File not found: {os.path.basename(normalized_path)}"}
            
        with open(normalized_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("[Server] RepoSense API is starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
