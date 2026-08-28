# BookAm Business — App Store listing draft

Bundle ID: `business.bookam.app`
Version: 1.0.1 (build 5)
Primary category: Business  ·  Secondary: Lifestyle

---

## Name (30 char max)
BookAm Business

## Subtitle (30 char max)
Bookings, calendar & clients

## Promotional text (170 char max, editable anytime without review)
Run your service business from your pocket — take bookings 24/7, manage your
calendar, and keep every client in one place.

## Description (4000 char max)
BookAm Business is the all-in-one booking app for salons, barbers, makeup
artists, nail techs, cleaners, trainers and every other appointment-based
business.

Get a booking page in minutes and let clients book you around the clock — no
phone tag, no double-bookings.

WHAT YOU CAN DO
• Accept appointments 24/7 through your own BookAm page
• See your day at a glance on the dashboard — appointments, revenue, pending
  confirmations and cancellations
• Manage bookings by status: pending, confirmed, completed, cancelled
• Work from a day, week or month calendar with colour-coded appointment states
• Keep a full client list with history, notes and quick rebooking
• Get discovered in Explore and the Feed by nearby customers
• Message clients in the built-in inbox
• Track staff, services and resources with real conflict checking
• Send reminders so clients show up

WHY BOOKAM
• Free to start
• Built for real service businesses, not generic scheduling
• Works alongside the BookAm customer app so clients can find and rebook you

Download BookAm Business and take your first booking today.

## Keywords (100 char max, comma-separated, no spaces)
booking,appointment,salon,barber,scheduler,calendar,clients,beauty,bookings,CRM,booksy,fresha

## Support URL
https://bookam.business/support   (confirm this resolves)

## Marketing URL (optional)
https://bookam.business

## Privacy Policy URL (REQUIRED)
https://bookam.business/privacy   (must be live before submission)

---

## App Review notes
This app requires an account. Demo credentials:

  Business login (tab: "Business Sign In")
  Email:    demo.business.20260828@bookam.business
  Password: <FILL IN>

How to test:
1. Launch the app, choose "Business Sign In", enter the credentials above.
2. The dashboard opens — tap Bookings, Calendar and Messages in the bottom bar
   to review core features.
3. "Sign in as Customer" on the login screen switches to the customer
   experience (Explore / Feed / booking flow) if you want to see both sides.

Contact for review questions: <FILL IN email>

---

## App Privacy — data to declare in App Store Connect
Third-party SDKs in the build and what they touch:

| SDK                       | Purpose                     | Declare |
|---------------------------|-----------------------------|---------|
| Sentry                    | Crash / performance logs    | Diagnostics; may capture Identifiers / usage data |
| Google Analytics (gtag)   | Product analytics           | Usage data, Identifiers |
| Firebase                  | Push messaging / backend    | Identifiers (device token), Usage data |
| Stripe                    | Payments                    | Payment info, Purchase history (collected by Stripe) |
| Capacitor Push            | Notifications               | Device token (Identifier) |
| Location (when in use)    | "Available now" / distance  | Coarse/precise location, not linked to identity if not stored |

Account data collected: name, email, phone, booking history (Contact Info,
User Content, linked to identity).

Adjust each entry to match what your backend actually stores and whether it is
used for tracking.

---

## Pre-submit checklist
- [ ] Privacy Policy URL live
- [ ] Support URL live
- [ ] Demo password filled into review notes
- [ ] Build 5 uploaded and processed in App Store Connect
- [ ] Screenshots uploaded (store/screenshots/iphone-6.9/)
- [ ] App Privacy questionnaire completed
- [ ] Age rating questionnaire completed
- [ ] Primary category set
- [ ] (Consider) seed demo account with a few bookings, then add dashboard /
      bookings screenshots
