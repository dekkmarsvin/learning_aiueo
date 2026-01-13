# AIUEO Japanese Typing Practice

Three-container setup for a 1:1 Japanese typing practice app with a modular LLM provider.

## Services
- frontend: SvelteKit UI
- backend: Fastify API
- mongo: MongoDB

## Quick start
1) Configure LLM settings in `docker-compose.yml` or create `backend/.env` for local dev.
2) Run Docker:

```bash
docker compose up --build
```

UI: http://localhost:3000
API: http://localhost:8080/api/health

## Local development
Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npm run dev
```

## Tests
Frontend:
```bash
cd frontend
npm test
```

Backend:
```bash
cd backend
npm test
```

## LLM providers
- LM Studio: set `LLM_PROVIDER=lmstudio`, `LLM_BASE_URL=http://host.docker.internal:1234`
- OpenAI: set `LLM_PROVIDER=openai`, `LLM_BASE_URL=https://api.openai.com`, `LLM_API_KEY=...`
- Gemini: set `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=...`, `LLM_MODEL=gemini-1.5-flash`

## Project brain (recent work)
See `project_brain/SUMMARY.md` for a concise changelog of the latest feature work and verification notes.

Highlights:
- Kana hint in the input, prediction chips, and suggestion chips near the chat box.
- Translation panel with "Use this" hint workflow (kanji + reading).
- Furigana preview, hover translation tooltip, and localized analysis/grammar notes.
- Topic suggestions upgraded to full LLM-generated sentences with MongoDB caching.

Supporting sources:
- Detailed plans and walkthroughs: `project_brain/sources/`
- Optional screenshots: `project_brain/assets/brain_media/` (ignored by git)
