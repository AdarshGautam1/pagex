# Supabase Setup Guide — PAGEX

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Set project name: `pagex`
4. Set a strong database password (save it securely)
5. Select region closest to your users
6. Wait for provisioning to complete

## 2. Collect Credentials

Go to **Project Settings → API** and note:

| Key | Where to use |
|-----|-------------|
| `Project URL` | Both server `.env` and mobile `.env` as `SUPABASE_URL` |
| `anon / public` key | Mobile `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY` and server `.env` as `SUPABASE_ANON_KEY` |
| `service_role` key | Server `.env` ONLY as `SUPABASE_SERVICE_ROLE_KEY` — **NEVER** in mobile app |

## 3. Configure Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. For development: disable **Confirm email** under Email provider settings
4. For production: re-enable email confirmation
5. Under **URL Configuration**, set Site URL if needed

## 4. Run Database Schema

1. Go to **SQL Editor**
2. Click **New query**
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run**
5. Verify all tables appear under **Table Editor**

## 5. Create Storage Buckets

1. Go to **Storage**
2. Click **New bucket**
   - Name: `covers`
   - Public bucket: **Yes**
3. Click **New bucket** again
   - Name: `pdfs`
   - Public bucket: **No** (private)
4. Click **New bucket** again
   - Name: `community-notes`
   - Public bucket: **No** (private)

### Storage Policies

For the **covers** bucket:
- Go to **Policies** tab
- Add policy: Allow authenticated users to SELECT (read)
- Add policy: Allow authenticated admins to INSERT, UPDATE, DELETE

For the **pdfs** and **community-notes** buckets:
- No public read policies
- All access is through server-generated signed URLs using the service-role key


## 6. Verify RLS

1. Go to **Database → Tables**
2. Confirm RLS is enabled on every table (green shield icon)
3. Click each table to verify policies are applied

## 7. Promote First Admin

After registering your first user through the app:

### Option A: Using the promotion script
```bash
cd server
npm run promote-admin your-admin@email.com
```

### Option B: Manual via Supabase Dashboard
1. Go to **Table Editor → profiles**
2. Find your user row
3. Change `role` from `student` to `admin`
4. Click **Save**

## 8. Seed Demo Books

Once your Supabase credentials are configured in `server/.env`, populate the library with the 5 pre-generated demo books and artwork:

```bash
cd server
npm run seed-books
```

This will automatically:
- Upload the 5 book cover images to the `covers` bucket
- Upload the 5 multi-page PDF documents to the `pdfs` bucket
- Populate the `books` table with categories, descriptions, and page counts
