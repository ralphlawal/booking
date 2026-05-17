# Bookly — SaaS Appointment Booking Platform

A full-stack, multi-tenant appointment booking SaaS for small businesses (barbers, makeup artists, photographers, tutors, etc.).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT |
| Email | Nodemailer (SMTP) |
| QR Code | qrcode + qrcode.react |

---

## Project Structure

```
booking-app/
├── backend/
│   ├── src/
│   │   ├── config/       # DB connection
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, validation
│   │   ├── models/       # DB query helpers
│   │   ├── routes/       # Express routers
│   │   ├── services/     # Email, slot generation
│   │   ├── utils/        # Reference ID generator
│   │   └── app.js        # Entry point
│   ├── migrations/       # SQL schema
│   └── seeds/            # Demo data
└── frontend/
    └── src/
        ├── components/   # Layout, UI
        ├── context/      # AuthContext
        ├── pages/
        │   ├── admin/    # Dashboard pages
        │   └── public/   # Booking pages
        └── services/     # API layer (axios)
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
# Create database
createdb bookly_db

# Or in psql:
psql -U postgres -c "CREATE DATABASE bookly_db;"
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy env file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Run migrations
npm run migrate

# Seed demo data (optional)
npm run seed

# Start dev server
npm run dev
```

The API runs on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

The app runs on **http://localhost:5173**

---

## Environment Variables (backend/.env)

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/bookly_db

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d

# Optional: Email (leave blank to skip email, use notification log instead)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Bookly <noreply@bookly.com>

FRONTEND_URL=http://localhost:5173
```

---

## Demo Account

After running `npm run seed`:

| Field | Value |
|-------|-------|
| Email | demo@bookly.com |
| Password | demo1234 |
| Booking Page | http://localhost:5173/book/smoothcuts |

---

## Key API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register business owner |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Business
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/business/me | Get owner's business (auth) |
| POST | /api/business | Create business (onboarding) |
| PUT | /api/business/me | Update business info |
| GET | /api/business/:slug | Public business profile |
| GET | /api/business/:slug/services | Public service list |
| GET | /api/business/:slug/check | Check slug availability |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bookings/public/:slug | Create booking (public) |
| GET | /api/bookings/ref/:ref | Get booking by reference (public) |
| GET | /api/bookings | Admin: list bookings |
| PUT | /api/bookings/:id/status | Update booking status |
| PUT | /api/bookings/:id/reschedule | Reschedule booking |

### Availability
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/availability/public/:slug/slots | Get available time slots (public) |
| POST | /api/availability | Save working hours |
| POST | /api/availability/blocked | Block a date/time |

---

## Features

### Customer Side
- Browse business page at `/book/:slug`
- 5-step booking wizard (service → date → time → details → confirm)
- Double-booking prevention
- Success page with WhatsApp shortcut
- Booking reference ID

### Admin Dashboard
- **Dashboard**: Stats overview, recent bookings
- **Bookings**: Table view, filter by status, update status, reschedule
- **Calendar**: Visual calendar with booking dots by status
- **Services**: Create/edit/delete/toggle services
- **Customers**: Auto-built customer list, no-show flag
- **Settings**: Business info, working hours, blocked dates, QR code

---

## Production Deployment

### Backend (Render, Railway, Fly.io)

1. Set environment variables in your platform dashboard
2. Set `NODE_ENV=production`
3. Set `DATABASE_URL` to your production PostgreSQL URL
4. Run migrations: `npm run migrate`

### Frontend (Vercel, Netlify)

1. Set build command: `npm run build`
2. Set output directory: `dist`
3. Add environment variable: `VITE_API_URL=https://your-api.com`

Update `frontend/src/services/api.js` baseURL for production:
```js
baseURL: import.meta.env.VITE_API_URL || '/api'
```

### Vite Proxy (development only)
The `vite.config.js` proxies `/api` → `http://localhost:5000`. In production, configure your hosting platform (or nginx) to route `/api` to the backend.

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire in 7 days
- Rate limiting on auth and booking endpoints
- Helmet.js security headers
- CORS restricted to frontend URL
- Input validation with express-validator
- SQL injection prevented via parameterized queries
