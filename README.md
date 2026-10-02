# PAGEX — Secure Gamified E-Library

**PAGEX** is a production-ready, cross-platform digital library designed for college environments. It pairs robust digital content protection with habit-forming gamification (reading streaks, knowledge XP, achievements, and weekly leaderboards) wrapped in an editorial literary aesthetic.

---

## 🏛️ Architecture Overview

```
React Native + Expo (Mobile Client)
              │
              │ HTTPS (Bearer Supabase JWT)
              ▼
    Express.js REST API
   (Auth, Business Logic, Anti-Abuse, Rate-Limiting)
              │
              ├───────────────────────────────────┐
              │                                   │
              ▼                                   ▼
      Supabase Auth & Database           Supabase Storage
   (PostgreSQL with Zero-Client-Write     ├── `covers` (Public)
    Least-Privilege RLS Enforced)         └── `pdfs` (Private, Signed URLs)
```

### Security & Access Control Model
- **Zero Client Direct Writes**: All application tables (`profiles`, `books`, `categories`, `reading_sessions`, `daily_activities`, `user_stats`, `user_achievements`, `bookmarks`, `audit_logs`) block direct client `INSERT`, `UPDATE`, and `DELETE` via Supabase RLS.
- **Server Least-Privilege Verification**: The Express API verifies the user's Supabase JWT on every request, checks role authorization, executes anti-cheat validation, and uses the server-only `service-role` client to perform atomic updates.
- **Protected PDF Access**: Book PDFs reside in a private Supabase bucket. The mobile client receives a short-lived (1 hour) cryptographically signed URL generated upon starting a session. Private URLs are never exposed to external document viewers.
- **Time Tracking Anti-Drift**: Active reading duration is measured server-side using 30-second heartbeat pings with 120-second interval caps. A minimum of 300 active seconds (5 minutes) is required to qualify for daily streak and XP rewards.

---

## 🎨 Editorial Design Aesthetics

- **Warm Paper Surfaces**: `#F2EEE6` (Background), `#EAE5DB` (Surface), `#E0DAD0` (Active)
- **Ink & Contrast**: `#181716` (Deep Ink), `#777169` (Muted Warm Gray)
- **Literary Accents**: `#7A3030` (Oxblood Primary), `#727A68` (Dusty Sage)
- **Typography**: `Outfit` (Bold headlines), `Inter` (Legible body text)

---

## 📁 Repository Structure

```
PAGEX/
├── server/                   # Express.js + TypeScript Backend
│   ├── src/
│   │   ├── index.ts          # Express application entry point & middleware stack
│   │   ├── lib/              # Supabase clients & error handler
│   │   ├── middleware/       # JWT auth, admin check, rate limiting, validation, multer
│   │   ├── routes/           # Auth, Books, Reading, Stats, Bookmarks, Admin routes
│   │   ├── services/         # Reading lifecycle, streaks, XP award, achievements, audit
│   │   └── types/            # Database and API type definitions
│   ├── seed-assets/          # Generated book covers & multi-page PDF books
│   ├── scripts/
│   │   ├── promote-admin.ts  # CLI tool to promote users to admin
│   │   ├── seed-demo-books.ts# Uploads demo covers & PDFs to Supabase
│   │   └── prepare-demo-assets.ts
│   └── tests/                # 16 Unit & Integration Tests (Health, Auth, Reading, Security)
├── mobile/                   # React Native + Expo Mobile Application
│   ├── app/
│   │   ├── _layout.tsx       # Root layout with fonts & AuthProvider
│   │   ├── index.tsx         # Auth-state entry router
│   │   ├── (auth)/           # Login & Registration screens
│   │   ├── (student)/        # Home, Library, Reader, Leaderboard, Profile, Bookmarks
│   │   └── (admin)/          # Admin Dashboard, Books, Categories, Audit Trail
│   ├── components/           # Button, Input, BookCard, StatCard, Header, AchievementBadge
│   ├── constants/            # Theme tokens, colors, fonts, spacing
│   ├── context/              # AuthContext & Session management
│   └── services/             # Centralized API client & Supabase client
└── supabase/
    ├── schema.sql            # PostgreSQL schema, triggers, and least-privilege RLS policies
    └── setup-guide.md        # Step-by-step setup guide for Supabase project
```

---

## 🚀 Quick Start Guide

### 1. Database & Supabase Setup
1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run `supabase/schema.sql`.
3. Under **Storage**, create two buckets:
   - `covers` (Public: **Yes**)
   - `pdfs` (Public: **No**)
4. Follow [`supabase/setup-guide.md`](file:///c:/Users/DESKTOP-ADARSH/.gemini/antigravity/scratch/PAGEX/supabase/setup-guide.md) for full details.

### 2. Configure Backend Server
```bash
cd server
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
npm install
npm test            # Runs 16 automated tests (Auth, Security, Gamification)
npm run seed-books  # Uploads 5 demo books and artwork to Supabase
npm run dev         # Starts server on http://localhost:4000
```

### 3. Launch Mobile Application
```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_API_URL
npx expo start
```
Scan the QR code with the **Expo Go** app on your Android or iOS device, or run `npx expo start --android`.

---

## 🛡️ Admin Promotion
To promote any registered user to the Admin role:
```bash
cd server
npm run promote-admin your-email@college.edu
```

---

## 🧪 Test Suite Results
```
PASS tests/reading.test.ts
PASS tests/security.test.ts
PASS tests/auth.test.ts
PASS tests/health.test.ts

Test Suites: 4 passed, 4 total
Tests:       16 passed, 16 total
```
