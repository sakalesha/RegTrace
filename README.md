# RegTrace

AI agent pipeline that ingests SEBI Master Circulars for Stock Brokers, parses them,
extracts regulatory obligations, generates compliance tasks, collects evidence, and
produces an audit-ready compliance report.

## Tech stack

- **Backend:** FastAPI + Motor (async MongoDB), Cloudinary for file storage, Groq for LLM steps.
- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS, React Router.

## Monorepo layout

```
backend/    FastAPI API (deployed as a Vercel Python serverless function)
frontend/   React + Vite SPA (deployed as a static Vercel project)
context/    Design docs and agent specifications
```

## Local development

### Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
# create backend/.env (see keys below)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# create frontend/.env with VITE_API_URL=http://localhost:8000/api
npm run dev
```

### Required environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | backend | MongoDB connection string |
| `DATABASE_NAME` | backend | Database name |
| `CLOUDINARY_CLOUD_NAME` | backend | Cloudinary account |
| `CLOUDINARY_API_KEY` | backend | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | backend | Cloudinary API secret |
| `GROQ_API_KEY` | backend | Groq LLM key |
| `VITE_API_URL` | frontend | Base URL of the backend API (e.g. `https://<backend>.vercel.app/api`) |

## Deploying on Vercel

Create **two** Vercel projects from this single repository.

### 1. Backend (`backend/`)

- **Root Directory:** `backend`
- **Build Command:** *(leave empty — handled by `vercel.json`)*
- **Output:** serverless function (no static output)
- Add the backend env vars above in the Vercel project settings.
- `backend/vercel.json` routes all requests to `api/index.py`, which serves the
  FastAPI app through Mangum (ASGI adapter).

### 2. Frontend (`frontend/`)

- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Set `VITE_API_URL` to the deployed backend URL (`https://<backend>.vercel.app/api`).
- `frontend/vercel.json` rewrites all paths to `index.html` for SPA client-side routing.

> Note: OCR on scanned PDFs uses `pytesseract`/`pdf2image`, which need the
> `tesseract` and `poppler` system binaries. These are not available on Vercel, so
> OCR gracefully degrades to text extraction only — text-based PDFs parse fully.
