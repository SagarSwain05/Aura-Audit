# Deployment Checklist

Use this when audits fail in production.

## Health URLs

```bash
curl https://<backend-host>/health
curl https://<ai-engine-host>/health
curl https://<ai-engine-host>/ready
```

Expected:

- Backend returns `{"status":"ok", ...}`.
- AI `/health` returns `status: "ok"`.
- AI `/ready` returns `status: "ready"` when at least one Gemini or Groq key is configured.

## Required Production Environment

Backend on Render:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `AI_ENGINE_URL`
- `CLIENT_URL`

AI engine:

- `GEMINI_API_KEY` or one of `GEMINI_KEY_1` through `GEMINI_KEY_9`
- Optional fallback: `GROQ_API_KEY` or `GROQ_KEY_1` through `GROQ_KEY_9`
- Optional live jobs: `SERPAPI_KEY`
- Optional resources/vector search: `YOUTUBE_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`

Frontend:

- `NEXT_PUBLIC_API_URL` set to the active backend host, with no `/api` suffix
- `NEXT_PUBLIC_AI_URL` set to the active AI engine host

## Target Production URLs

- Frontend: `https://aura-audit-app.vercel.app`
- Backend: `https://aura-audit-server.onrender.com`
- AI engine: `https://aura-audit-ai.onrender.com`

Update Vercel `NEXT_PUBLIC_API_URL` and backend `AI_ENGINE_URL` if these Render service slugs change.
