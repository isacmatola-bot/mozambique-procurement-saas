# Build Verification

Generated on 2026-06-05.

## Commands run

```bash
npm install --ignore-scripts
npm run build
npm audit --json
```

## Result

- Backend TypeScript build: passed.
- Frontend TypeScript + Vite production build: passed.
- npm audit: 0 vulnerabilities after updating Vite/plugin-react.

## Notes

The database migration and seed scripts require a running PostgreSQL/Supabase database. Use either:

```bash
docker compose up --build
```

or:

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
