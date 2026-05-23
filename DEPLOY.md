# Deploying Bookly to Production

**Stack:** Backend → Render (free) | Frontend → Vercel (free) | Database → Render PostgreSQL (free)

Estimated time: **15–20 minutes**

---

## Step 1 — Required production accounts/keys

Prepare these before deploying:

- **Resend** API key for email delivery (`RESEND_API_KEY`)
- **Stripe** secret key and webhook signing secret (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- **Stripe** publishable key for Vercel (`VITE_STRIPE_PUBLIC_KEY`)
- A strong admin support password (`ADMIN_SUPPORT_PASSWORD`)
- Your Firebase project id (`FIREBASE_PROJECT_ID`)

---

## Step 2 — Push code to GitHub

```bash
cd "/Users/admin/Desktop/bookng app"

# Initialize git
git init
git add .
git commit -m "Initial Bookly commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/bookly.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy Backend on Render

1. Go to **render.com** → Sign up (free)
2. Click **New** → **Blueprint** (this reads `render.yaml` automatically)
3. Connect your GitHub repo
4. Render will create:
   - `bookly-api` web service (Node.js)
   - `bookly-db` PostgreSQL database
5. After the first deploy completes, go to **bookly-api → Environment** and add:

   | Key | Value |
   |-----|-------|
   | `ADMIN_SUPPORT_PASSWORD` | strong unique password |
   | `ADMIN_EMAIL` | your admin notification email |
   | `RESEND_API_KEY` | your Resend API key |
   | `EMAIL_FROM` | `BookAm <noreply@your-domain.com>` |
   | `STRIPE_SECRET_KEY` | Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
   | `FIREBASE_PROJECT_ID` | your Firebase project id |
   | `FRONTEND_URL` | fill after Step 4 |

6. Go to **Events** tab → click **Manual Deploy → Deploy latest commit**

7. After deploy, run migrations:
   - Open the **Shell** tab on Render
   - Run: `npm run migrate`
   - Optionally: `npm run seed` (adds demo account)

8. Copy your API URL: `https://bookly-api.onrender.com` (yours will be different)

---

## Step 4 — Deploy Frontend on Vercel

1. Go to **vercel.com** → Sign up with GitHub (free)
2. Click **Add New Project** → Import your GitHub repo
3. Set:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://bookly-api.onrender.com` ← your Render URL |
   | `BACKEND_URL` | `https://bookly-api.onrender.com` ← same Render URL for the Vercel proxy |
   | `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key |
5. Click **Deploy**
6. Copy your Vercel URL: `https://bookly-xyz.vercel.app`

---

## Step 5 — Connect frontend URL to backend

1. Go back to Render → **bookly-api → Environment**
2. Set `FRONTEND_URL` = `https://bookly-xyz.vercel.app` (your Vercel URL)
3. Click **Save Changes** → service redeploys automatically

---

## Done! Your live URLs:

| URL | What it is |
|-----|-----------|
| `https://bookly-xyz.vercel.app/admin/login` | Business owner login |
| `https://bookly-xyz.vercel.app/book/smoothcuts` | Demo booking page |
| `https://bookly-api.onrender.com/health` | API health check |

---

## Important notes

- **Render free tier sleeps** after 15 min inactivity. First request after sleep takes ~30s.
  Upgrade to Render Starter ($7/mo) to keep it awake 24/7.
- **Database backups:** Render free PostgreSQL has no automatic backups.
  Upgrade to paid or set up a cron backup.
- **File uploads (logos):** Currently stored on the server. For production, migrate to
  Cloudinary or AWS S3 so files survive redeploys. (I can build this for you.)
- **Stripe webhook:** Add a Stripe webhook endpoint pointing to
  `https://your-api.onrender.com/api/payments/webhook` and paste its signing secret
  into `STRIPE_WEBHOOK_SECRET`.

---

## Local development (always works, no internet needed)

```bash
# Terminal 1 — Backend
cd backend && npm run dev     # port 5001, SQLite

# Terminal 2 — Frontend  
cd frontend && npm run dev    # port 5173
```
