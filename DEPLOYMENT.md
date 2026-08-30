# RepoSense Deployment Guide

This guide provides step-by-step instructions to configure and deploy the RepoSense platform on free cloud servers and custom domains.

---

## 1. Frontend Deployment (Vercel)

Vercel is free, offers automatic SSL, and supports custom domain linking (e.g. from GoDaddy).

### Configuration
1. Create a `frontend/.env.production` file:
   ```env
   VITE_API_BASE_URL=https://your-backend-server.onrender.com
   ```
2. Modify `frontend/src/services/api.js` to read from the environment variable:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
   ```

### Steps to Deploy
1. Push your code to a GitHub/GitLab repository.
2. Sign in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select your RepoSense repository.
4. Set the **Root Directory** to `frontend/`.
5. Under **Environment Variables**, add:
   - Key: `VITE_API_BASE_URL`
   - Value: (Your live backend URL)
6. Click **Deploy**.

### Linking Custom Domain (GoDaddy)
1. In Vercel, navigate to your Project Settings > **Domains**.
2. Type your domain (e.g. `reposense-compare.com`) and click **Add**.
3. Log into your GoDaddy DNS Control Panel and configure the records:
   - For apex domain (e.g. `reposense-compare.com`): Create an **A Record** pointing to `76.76.21.21`.
   - For subdomains (e.g. `www.reposense-compare.com`): Create a **CNAME Record** pointing to `cname.vercel-dns.com`.

---

## 2. Backend Deployment (Render / Railway)

FastAPI can be hosted for free on Render. Render handles SSL certificate generation automatically.

### Configuration
We configure uvicorn to listen on `0.0.0.0` and bind to the `PORT` environment variable provided by Render.

### Steps to Deploy (Render)
1. Go to [Render](https://render.com/) and log in.
2. Create a new **Web Service**.
3. Connect your repository.
4. Select the environment: **Python 3**.
5. Set **Root Directory** to `backend/`.
6. Set **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
7. Set **Start Command**:
   ```bash
   python -m src.main
   ```
8. Under **Environment Variables**, add:
   - `PORT`: `8000`
9. Click **Deploy**.

> [!IMPORTANT]
> **Ollama LLM (llama3:8b) Hosting:**
> Since free-tier servers lack GPU power to run large models, you have two options:
> 1. **Local Hybrid Setup**: Run backend/Ollama on your local machine and let the deployed frontend connect to `http://localhost:8000`.
> 2. **Cloud LLM API**: Swap Ollama in `summarizer_service.py` and `main.py` with an external free-tier API provider (e.g., Groq API, OpenRouter, or Hugging Face Inference API) by using the OpenAI Python SDK, configuring `api_key` and `base_url` as environment variables.
