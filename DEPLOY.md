# Deploying Bookly to Production

**Stack:** Backend → Render (free) | Frontend → Vercel (free) | Database → Render PostgreSQL (free)

Estimated time: **15–20 minutes**

---

## Step 1 — Gmail App Password (for email notifications)

You need this so the app can send booking confirmation emails.

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** (required for App Passwords)
3. Go to **Security → App Passwords**
4. Select app: **Mail**, device: **Other** → type "Bookly" → **Generate**
5. Copy the 16-character password shown (e.g. `abcd efgh ijkl mnop`)

Keep this ready — you'll paste it into Render in Step 3.

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
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_USER` | `your_gmail@gmail.com` |
   | `SMTP_PASS` | `abcd efgh ijkl mnop` (App Password from Step 1) |
   | `EMAIL_FROM` | `Bookly <your_gmail@gmail.com>` |
   | `FRONTEND_URL` | *(leave blank for now — fill after Step 4)* |

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

---

## Local development (always works, no internet needed)

```bash
# Terminal 1 — Backend
cd backend && npm run dev     # port 5001, SQLite

# Terminal 2 — Frontend  
cd frontend && npm run dev    # port 5173
```
