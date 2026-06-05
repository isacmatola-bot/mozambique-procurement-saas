# API Overview

Base URL: `http://localhost:3001/api`

## Auth

- `POST /auth/login` — login with email/password.
- `GET /auth/me` — current user.

Use the returned JWT as:

```http
Authorization: Bearer <token>
```

## Suppliers

- `GET /suppliers`
- `POST /suppliers`
- `GET /suppliers/:id`
- `PATCH /suppliers/:id`
- `DELETE /suppliers/:id`

## Tenders

- `GET /tenders`
- `POST /tenders`
- `GET /tenders/:id`
- `PATCH /tenders/:id`
- `POST /tenders/:id/bids`
- `GET /tenders/:id/bids`

## Contracts

- `GET /contracts`
- `POST /contracts/generate`
- `GET /contracts/:id`
- `PATCH /contracts/:id/status`

## Invoices

- `GET /invoices`
- `POST /invoices/generate`
- `GET /invoices/:id`
- `PATCH /invoices/:id/status`

## AI

- `POST /ai/extract-contract`

Body:

```json
{
  "documentText": "Contract text here..."
}
```

## Reports

- `GET /reports/dashboard`
