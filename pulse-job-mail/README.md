# PulseJobMail

PulseJobMail is a full-stack job alert and market-intelligence workspace built with:

- Backend: Node.js, Express, TypeScript, MongoDB, Google OAuth, Gmail API, Nodemailer, Gemini
- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-style UI components, Axios, React Query

It lets you:

- log in with email/password, Google OAuth, or magic link
- connect Gmail inboxes and sync job alert emails
- run job crawling from saved preferences
- pull filtered hiring/news trend feeds
- manage delivery rules for dashboard-only, full-email, or smart-summary digests

## Project structure

```text
pulse-job-mail/
├── backend/                 # Express + TypeScript API
├── frontend/                # React + Vite + Tailwind dashboard
├── .env.example             # Backend environment template
├── docker-compose.yml       # MongoDB + backend + frontend
└── README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (only if you want the one-command Docker setup)
- MongoDB locally if you are not using Docker
- A Google Cloud project for OAuth + Gmail API
- A Gemini API key if you want AI summaries

## One-command run

1. Copy the backend env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Copy the frontend env file:

```bash
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

3. Fill in your real secrets in `.env`.

4. Run everything:

```bash
docker compose up --build
```

After startup:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000`
- backend health: `http://localhost:4000/api/v1/health`
- MongoDB: `mongodb://localhost:27017`

## Manual run

### Backend

```bash
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Google OAuth setup

Use a single Google Cloud OAuth client for both sign-in and Gmail connection flows.

### 1. Enable APIs

Enable these in Google Cloud:

- Gmail API
- Google OAuth consent screen for your project

### 2. Create OAuth credentials

Create an OAuth 2.0 Client ID of type `Web application`.

### 3. Add authorized JavaScript origins

Use these during local development:

- `http://localhost:5173`
- `http://localhost:4000`

### 4. Add authorized redirect URIs

Add these exact backend callback URLs:

- `http://localhost:4000/api/v1/auth/oauth2callback`
- `http://localhost:4000/api/v1/gmail/callback`

### 5. Configure exact scopes

#### Google login scopes

- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/userinfo.email`

#### Gmail connect scopes

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/userinfo.email`

### 6. Put the credentials into `.env`

Set:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GMAIL_REDIRECT_URI`

## Backend environment variables

Create `.env` in the project root using `.env.example`.

```env
PORT=4000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/pulsejobmail

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/oauth2callback
GMAIL_REDIRECT_URI=http://localhost:4000/api/v1/gmail/callback

ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRY=30d
REFRESH_TOKEN_SECRET=replace_with_a_second_long_random_secret
REFRESH_TOKEN_EXPIRY=60d

ENCRYPTION_SECRET=replace_with_a_32_character_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_email
EMAIL_PASS=your_smtp_password_or_app_password
EMAIL_FROM=noreply@pulsejobmail.com
MAGIC_LINK_EXPIRY=15m
FRONTEND_URL=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key

AUTH_WINDOW_MS=900000
AUTH_MAX_REQUESTS=10
USER_PREFERENCES_WINDOW_MS=900000
USER_PREFERENCES_MAX_REQUESTS=10
GMAIL_WINDOW_MS=300000
GMAIL_MAX_REQUESTS=20
JOB_CRAWL_WINDOW_MS=900000
JOB_CRAWL_MAX_REQUESTS=50
AI_WINDOW_MS=300000
AI_MAX_REQUESTS=30

JOB_CRAWL_CRON=*/15 * * * *
```

## Frontend environment variables

Create `frontend/.env` using `frontend/.env.example`.

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Runtime notes

- Google sign-in starts from the frontend, completes on the backend, then redirects back to `frontend` with tokens.
- Gmail connect starts from the frontend, completes on the backend, then redirects back to the dashboard callback screen.
- Magic-link emails now point to the frontend verification route, which calls the backend verify endpoint.
- The digest preview button triggers the backend preview endpoint immediately.

## Useful local URLs

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/google`
- `POST /api/v1/auth/magic-link`
- `GET /api/v1/gmail/accounts`
- `POST /api/v1/gmail/sync`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs/crawl`
- `GET /api/v1/news`
- `POST /api/v1/news/pull`
- `GET /api/v1/preferences`
- `PUT /api/v1/preferences`

## How to push `pulse-job-mail` into your local `mini` repo and push to GitHub

If your local clone of `https://github.com/Srakshin/mini` is the repo root:

1. Make sure the `pulse-job-mail/` folder sits directly inside that `mini/` repo.
2. From the `mini/` repo root, run:

```bash
git add pulse-job-mail
git commit -m "Add PulseJobMail full-stack project"
git push origin main
```

If `pulse-job-mail/` is currently outside your repo, move or copy the entire folder into the root of the `mini` repository first, then run the same `git add`, `git commit`, and `git push` commands.

## Recommended local workflow

1. Fill `.env`
2. Fill `frontend/.env`
3. Run `docker compose up --build`
4. Open `http://localhost:5173`
5. Register or log in
6. Connect Gmail
7. Save preference filters
8. Sync Gmail, crawl jobs, and pull news from the dashboard
