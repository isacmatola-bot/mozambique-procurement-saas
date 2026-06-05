# Launch Checklist

## Technical

- [ ] `.env` values are production-safe.
- [ ] `JWT_SECRET` is unique and at least 32 random characters.
- [ ] Database uses Supabase pooled connection or managed PostgreSQL.
- [ ] `database/001_schema.sql` has been applied successfully.
- [ ] Seed users have been replaced or passwords changed.
- [ ] Frontend is deployed with `VITE_API_URL` pointing to the production API.
- [ ] Backend CORS `FRONTEND_URL` matches the production frontend domain.
- [ ] HTTPS is enabled.
- [ ] Backups are enabled.
- [ ] Error monitoring is configured.

## Procurement/legal

- [ ] Contract template language reviewed by a qualified Mozambique procurement/legal specialist.
- [ ] Tender evaluation scoring rules validated by the institute.
- [ ] Beneficial ownership threshold and local-content preference values confirmed for current regulations.
- [ ] Retention policy approved by finance/admin team.
- [ ] User roles approved by the institute.

## Business/demo

- [ ] Demo supplier data replaced with real suppliers.
- [ ] Institute logo and colors added.
- [ ] First tender created and tested end-to-end.
- [ ] First generated invoice reviewed by finance team.
- [ ] First AI extraction output reviewed against a real contract.
