# Deploying Verdant AI Support to Vercel

You can deploy the app to Vercel in either **Separated** (two separate Vercel projects) or **Unified** (one single project) mode. Both configurations are pre-wired.

---

## Option 1: Separated Deployment (Recommended if you want separate domains)

### Step 1: Deploy Backend (Project 1)
1. In your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** > **Project**.
2. Select your repository.
3. In **Project Settings**:
   - **Root Directory**: Click edit and set to `backend`.
   - **Framework Preset**: Select `Other`.
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave default.
4. In **Environment Variables**, add:
   - `WEBHOOK_SECRET`: your secure webhook secret string (e.g. `verdant-demo-secret-2026`)
   - `GEMINI_API_KEY`: your Google AI Studio API key (`AIzaSy...`)
   - `GEMINI_MODEL`: `gemini-3.8-flash`
   - `FRONTEND_URL`: `https://<your-frontend-project>.vercel.app` (or `*` for testing)
   - `SUPABASE_URL`: (optional if using Supabase DB)
   - `SUPABASE_ANON_KEY`: (optional)
   - `SUPABASE_SERVICE_ROLE_KEY`: (optional)
5. Click **Deploy**.
6. Copy the assigned backend URL (e.g. `https://verdant-backend.vercel.app`).

---

### Step 2: Deploy Frontend (Project 2)
1. In your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** > **Project**.
2. Select the **same repository**.
3. In **Project Settings**:
   - **Root Directory**: Click edit and set to `frontend`.
   - **Framework Preset**: `Vite` (automatically detected).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: paste your backend URL from Step 1 (e.g. `https://verdant-backend.vercel.app`)
   - `VITE_WEBHOOK_SECRET`: (optional, pre-fills the Webhook Tester tool)
5. Click **Deploy**.

---

## Option 2: Unified 1-Click Deployment (Single Vercel Project)

If you prefer to have **both frontend and backend under the same Vercel domain** (e.g. `https://verdant.vercel.app` for UI, and `/api/*` + `/webhook` automatically routed to the serverless Express backend):

1. In Vercel, import the repository root (do **not** change the Root Directory).
2. The root `vercel.json` and `api/index.ts` automatically route:
   - `/api/*` -> Express backend
   - `/webhook` -> Webhook listener
   - `/*` -> Vite SPA with React Router
3. Add backend environment variables (`WEBHOOK_SECRET`, `GEMINI_API_KEY`, etc.) in Vercel settings.
4. Click **Deploy**.
