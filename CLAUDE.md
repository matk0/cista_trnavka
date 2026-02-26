# Claude Code Instructions

## Deployment

Deploy to Fly.io with:

```bash
fly deploy --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=<token-from-env-local>
```

The Mapbox token must be passed as a build argument (not a runtime secret) because `NEXT_PUBLIC_*` variables are embedded at build time by Next.js.

Get the token from `.env.local` in the project root.

## Project Structure

- `src/app/page.tsx` - Main homepage with map and event lists
- `src/components/` - React components (Map, EventList, CleanupPopup, etc.)
- `src/lib/db.ts` - SQLite database operations
- `src/app/api/` - API routes

## Environment Variables

- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox API token (build-time)
- `ADMIN_PASSWORD` - Admin dashboard password (runtime secret)
- `DATA_PATH` - SQLite database location (set to `/data` in production)
