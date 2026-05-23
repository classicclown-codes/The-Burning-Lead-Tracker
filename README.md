# Burning Lead Tracker

A React + Vite + Tailwind CRM pipeline for moving WhatsApp DMs through to closed marketing clients.

## Setup

1. Copy `.env.example` to `.env` and add your Supabase URL and anon key.
2. Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.
3. Install and run:

```bash
npm install
npm run dev
```

The app uses Supabase email/password auth and row-level security so each user only sees their own leads.

## Public Intake Form

Leads can submit themselves at:

```text
/intake
```

The page calls the Supabase Edge Function in `supabase/functions/create-lead`. The function uses the service role key server-side and inserts new submissions under one owner account, so table RLS stays locked down.

Set these Supabase function secrets before deploying the function:

```bash
supabase secrets set BURNING_LEAD_OWNER_ID=your_auth_user_uuid
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then deploy:

```bash
supabase functions deploy create-lead --no-verify-jwt
```

You can find your owner user UUID in Supabase under `Authentication` -> `Users`.
