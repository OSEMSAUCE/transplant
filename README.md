# TransPlant

A tool for merging reforestation 'planting" data from a CSV to OSEM's reforestation database.

You import a CSV which should contain all of **who what where when** from tree planting sites (locations). 
THe table must include, minimum:
- who - planted the trees (or original source of the data)
- what - type of trees and how many(number)
- where - requires at least one GPS point, but idealy a polygon of databpoints. The site's shape.
- when - when approx were the trees planted. Even just the year is great.  


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
