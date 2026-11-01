# TaskFlow – Task Manager (Hairdrama Tech assignment)

Create tasks, assign them to teammates, track them on a dashboard, and get email notifications. Sign-in is Google OAuth 2.0.

**Live URL:** _add after deployment_

## Stack
| Layer | Tech |
|---|---|
| Database | Supabase (Postgres) |
| Backend | Flask (Python), runs as a Vercel serverless function |
| Frontend | Next.js 14 + TypeScript (App Router) |
| Auth | Google OAuth 2.0 (authorization-code flow) |
| Email | EmailJS (REST API, called from Flask) |
| Hosting | **One Vercel project** for frontend + backend, Supabase for the DB |

## Architecture

```
                         one Vercel project / one domain
 ┌──────────────────────────────────────────────────────────────────────┐
 │  Next.js (app/, components/)          Flask (backend/) via api/index.py │
 │  ─────────────────────────            ───────────────────────────────── │
 │  /            login page              /api/auth/google/login  ─▶ Google │
 │  /dashboard   dashboard UI            /api/auth/google/callback ◀─ code │
 │       │                                  ├─ exchange code → tokens      │
 │       │  fetch("/api/...")               ├─ upsert user ───────▶ Supabase│
 │       └──(HttpOnly session cookie)──▶    └─ set JWT cookie              │
 │                                       /api/tasks, /api/users, ...       │
 │                                          ├─ read/write ────────▶ Supabase│
 │                                          └─ mailer ───────────▶ EmailJS │
 └──────────────────────────────────────────────────────────────────────┘
```

**Key decisions**
- **Same origin.** `vercel.json` routes `/api/*` to the Flask function, so the browser only talks to one domain. No CORS, and the session can live in an **HttpOnly, Secure, SameSite=Lax cookie** (JavaScript can't read it).
- OAuth runs on the backend, so the Google client secret never reaches the browser. The `state` parameter is signed and expires after 10 minutes (CSRF protection on login).
- Our own 7-day HS256 JWT identifies the user; Google tokens are only used for sign-in.
- **Email:** EmailJS sends the notifications (REST API, called from Flask). Creating a task emails the assignee; completing a task emails the creator. Recipients are the Google sign-in emails stored for each user. Keys live only in environment variables, never in code.
- The backend uses Supabase's `service_role` key. RLS is enabled with no policies, so the public anon key can access nothing.
- Everyone on the team sees all tasks, but only the creator or assignee can change a task (checked on the server).
- Email failures are logged and never block creating or completing a task.
- "Overdue" is derived (open task whose due date has passed), not stored.
- Local dev: Next.js rewrites `/api/*` to Flask on port 5000, which mirrors production routing.

## Folder structure
```
api/index.py        Vercel entrypoint (exports the Flask app)
backend/            Flask app, Supabase client, EmailJS mailer
app/, components/   Next.js pages and UI components
lib/                shared types, helpers, fetch wrapper
migrations/         SQL, run in order in the Supabase SQL editor
vercel.json         routes /api/* to the Flask function
launch.bat          one-click install + run on Windows
```

## Run locally (Windows)
1. **Supabase:** create a project, run `migrations/001_init.sql` then `migrations/002_dashboard.sql` in the SQL editor. Copy the Project URL and `service_role` key.
2. **Google Cloud Console:** create a project, then
   - OAuth consent screen: the default email/profile scopes are enough. While the app is in *Testing* mode, add every account that will log in as a **test user** (including reviewers).
   - Credentials → OAuth client ID (Web). Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` and `https://YOUR-APP.vercel.app/api/auth/google/callback`.
3. Double-click **`launch.bat`**. First run creates `.env` and opens it; fill it in and run it again. It creates a virtualenv, installs pip and npm packages, checks the Supabase connection settings, then runs Flask (5000) and Next.js (3000) together in one window and opens http://localhost:3000. Press Ctrl+C to stop.

## Deploy to Vercel (frontend + backend together)
1. Push the repo to GitHub, then **Add New → Project** in Vercel and import it (root directory = repo root; framework is detected as Next.js, and the Python function in `api/` is picked up automatically).
2. Add the environment variables from `.env.example`, with `GOOGLE_REDIRECT_URI=https://YOUR-APP.vercel.app/api/auth/google/callback`.
3. Deploy, then add that redirect URI in Google Cloud.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/google/login` | start OAuth |
| GET | `/api/auth/google/callback` | finish OAuth, set session cookie |
| POST | `/api/auth/logout` | clear the cookie |
| GET | `/api/me` | current user (+ whether EmailJS is configured) |
| GET | `/api/users` | team members |
| GET | `/api/tasks` | all tasks |
| POST | `/api/tasks` | create task, email assignee |
| PATCH | `/api/tasks/<id>/status` | change status; completing emails the creator |
| GET | `/api/activity` | recent activity feed |

## Known trade-offs
- Email is sent synchronously inside the request. A job queue would scale better.
- Sidebar items Projects, Reports and Settings are placeholders and show "Coming soon".
- The trend chart shows tasks created per day (no history table), not a cumulative total.

## EmailJS setup
1. EmailJS dashboard: connect an email service (note its **Service ID**) and create a template using the variables `{{to_email}}`, `{{subject}}` and `{{message}}` (To Email = `{{to_email}}`, Subject = `{{subject}}`, Content = `{{message}}`). Tip: wrap the content as `<div style="white-space:pre-line">{{message}}</div>` to keep line breaks.
2. **Account → Security:** turn on *Allow EmailJS API for non-browser applications*, because Flask calls the REST API from the server.
3. Set `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` in `.env` locally and in Vercel project settings.
