# Kalashala

Password-only course website using Next.js, Supabase and YouTube.

Students do not create accounts, enter names, provide email addresses, or track progress. They receive the course link and a shared course password. The browser uses Supabase Anonymous Sign-In only to persist that access on the same device.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` in this folder:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run `supabase/schema.sql` in Supabase SQL Editor.

Enable Supabase Anonymous Sign-Ins.

Create one admin user in Supabase Authentication, then set its profile role:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-ADMIN-USER-UUID';
```

Admin URL:

`/revatigawandeadmin`

Students use `/login` and enter only the shared course password.
