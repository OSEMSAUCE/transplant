# Forest Info

A tool for mapping CSV data to forest management database.

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env`
3. Add your database credentials to `.env`
4. Run `npm install`
5. Run `npm run dev`

## Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `DATABASE_URL`: Your database connection string
