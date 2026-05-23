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
