# Transplant App

This app aggrigates reforestation data for the sake of transparency, to share who is planting what trees and where. This makes tree planting competative and greatly reduces fraud / greenwashing etc. It is the spirit of open source environmental movement (OSEM🤘🌲).
The app takes in CSV's of reforestation data and maps them to a database. The data contains tree crops, and land, planting numbers, dates and stakeholders. It uses GPS 'pins' and polygons. It also cleans up poorly formatted or loosely defined data types by recognizing the types and reformatting them where possible, disposing of the rest.
If you're interested to help please let me know if you have any questions info@osemsauce.com

## Werk 💪🏼️🌲️

There is a very active [Github Issues](https://github.com/OSEMSAUCE/transplant/issues) board. Please lmk if you have any questions.

## Project Overview

Transplant is an open-source platform for aggregating and verifying reforestation data. By collecting and sharing detailed information about who is planting which trees, where, and when, Transplant increases transparency, fosters healthy competition, and helps eliminate fraud and greenwashing in the reforestation sector. The project is part of the Open Source Environmental Movement (OSEM).

---

## Tech Stack

- **Frontend:** [Svelte 5](https://svelte.dev/) & [SvelteKit](https://kit.svelte.dev/) (TypeScript-first)
- **Styling:** [Pico CSS](https://picocss.com/) (with custom overrides)
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Deployment:** [Vercel](https://vercel.com/) ([adapter-vercel](https://kit.svelte.dev/docs/adapter-vercel))
  d- **Utilities:** PapaParse, @zerodevx/svelte-toast
- **Linting/Formatting:** ESLint, Prettier, svelte-check

---

## Features

- Upload, clean, and map CSV reforestation data to a central database
- Handles tree crop, land, planting numbers, dates, and stakeholder data
- Supports GPS pins and polygons for accurate geospatial mapping
- Automatic data cleaning and type recognition
- Visual mapping of planting sites
- Designed for extensibility and open collaboration
- TypeScript throughout for type safety
- Modern, accessible UI with Pico CSS and custom styling
- Robust developer tooling and linting

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OSEMSAUCE/transplant.git
   cd transplant
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

---

## Usage

- **Start the development server:**
  ```bash
  npm run dev
  # or
  yarn dev
  ```
- **Open your browser:**
  Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).

- **Database Sync:**
  To sync the ORM with your database:

  ```bash
  npm run db:sync:prod
  ```

- **Production Build:**

  ```bash
  npm run build
  npm run preview
  ```

- **Lint & Format:**

  ```bash
  npm run lint
  npm run format
  npm run check
  ```

- **Common Gotchas:**
  - When running `npm run db:pull`, you may need to:
    1. Add `: any` to `export const land`
    2. Search for `""` and replace with `"` (remove extra quotes)

## Project Structure

```
transplant/
├── src/                # SvelteKit source files (routes, lib/components, etc.)
├── prisma/             # Prisma schema and migrations
├── static/             # Static assets
├── data/               # Data files
├── docs/               # Documentation
├── .env.dev            # Dev environment variables
├── .env.production     # Production environment variables
├── svelte.config.js    # SvelteKit config
├── vite.config.ts      # Vite config
├── tsconfig.json       # TypeScript config
└── ...
```

---

## Environment Variables

You will need to configure environment variables for local development and deployment. See `.env.dev` and `.env.production` for examples.

**Common variables:**

- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase public anon key
- `DATABASE_URL` — Postgres connection string (used by Prisma)
- Any other secrets required by your deployment or integrations

---

## Deployment

This project is designed for [Vercel](https://vercel.com/) deployment using `@sveltejs/adapter-vercel`.

- Push to your main branch and Vercel will auto-deploy.
- Ensure all required environment variables are set in your Vercel dashboard.
- For local production builds, use:
  ```bash
  npm run build
  npm run preview
  ```

---

## Contributing

We welcome contributions of all kinds! To get started:

1. Check the [GitHub Issues](https://github.com/OSEMSAUCE/transplant/issues) board for open tasks and feature requests.
2. Fork the repository and create a new branch for your feature or bugfix.
3. Submit a pull request with a clear description of your changes.
4. For questions, ideas, or support, email us at info@osemsauce.com.

## Contributors

Thank you to everyone who has contributed to Transplant! If you’d like to join the project, please reach out or open a pull request.

- [Chris Harris](mailto:info@osemsauce.com) — Project Lead
- [Your Name Here]

---

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.
