## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4


## Development Setup

- **Server Port**: The Astro development server runs on port 3000 (configured in `astro.config.mjs` under `server: { port: 3000 }`).
- **Running the Server**: Use `npm run dev` (or equivalent in your package.json) to start the development server at `http://localhost:3000`.
- **Environment Variables**: Ensure `.env.local` includes required keys like `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for local development.
- **API Testing**: API endpoints under `src/pages/api` are accessible at `http://localhost:3000/api/...` during development.
- **Always Check Config Files**: Before assuming defaults (e.g., ports, adapters), refer to `astro.config.mjs`, `package.json`, and environment files for project-specific overrides.


## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/components` - client-side components written in Astro (static) and React (dynamic)
- `./src/assets` - static internal assets
- `./public` - public assets
