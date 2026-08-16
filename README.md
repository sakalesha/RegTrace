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

Deploy the whole repository as a **single Vercel project** using the root
`vercel.json`. It builds two artifacts:

- A Python serverless function from `api/index.py` (serving the FastAPI app via
  Mangum) for everything under `/api/*`.
- A static build of the Vite frontend from `frontend/` (output `frontend/dist`)
  for all other routes, with a catch-all rewrite to `index.html` for SPA routing.

Setup:

1. **Root Directory:** the repository root.
2. **Framework Preset:** leave as "Other" (the `vercel.json` drives the build).
3. Add the backend env vars above (`MONGODB_URI`, `DATABASE_NAME`, `CLOUDINARY_*`,
   `GROQ_API_KEY`) in the Vercel project settings.
4. Set `VITE_API_URL` to the project's own URL, e.g.
   `https://<project>.vercel.app/api`, so the frontend calls the bundled backend.

> Note: OCR on scanned PDFs uses `pytesseract`/`pdf2image`, which need the
> `tesseract` and `poppler` system binaries. These are not available on Vercel, so
> OCR gracefully degrades to text extraction only — text-based PDFs parse fully.
