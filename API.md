# API

Base: `http://localhost:3001/api` (port from `PORT`).

Aligned with the `astra-frontend` `tayyab-dev` branch. Use `Content-Type: application/json` and `withCredentials: true` for auth requests.

## `POST /auth/users/`

Register. Body: `first_name`, `last_name`, `username`, `email`, `country` (ISO country code, e.g. `PK`, `US`), `password`, `confirmPassword`, `terms` (must be `true`).

Default `currency` and `timezone` are set automatically from the selected country (e.g. `PK` → `PKR` + `Asia/Karachi`). Default `theme` is `neon`.

**200:** `{ "message": "Registration successful", "otp_token": "<uuid>" }`

**400:** field errors as `{ "field": ["message"] }`. **409:** username or email taken.

## `GET /otp/:token/status/`

OTP countdown for the verify page. **200:** `{ "remaining_time_seconds": 300, "user_id": "<uuid>" }`

## `POST /otp/verify/`

Body: `{ "user_id": "<uuid>", "otp_code": "123456" }`

**200:** `{ "message": "OTP verified successfully" }`

**400:** invalid OTP with `{ "otp_code", "attempts_used", "max_attempts", "remaining_attempts", "error_type" }`.

## `POST /otp/create/`

Resend OTP after expiry. Body: `{ "user_id": "<uuid>" }`

**200:** `{ "otp": { "token": "<new-uuid>" } }`

## `POST /otp/resend-login/`

Resend or continue OTP flow from login for unverified users. Body: `{ "login": "<email or username>", "password": "<password>" }`

**200:** `{ "message": "...", "otp": { "token": "<uuid>" }, "resent": true | false }`

If the current code is still valid, returns the existing token without sending a new email (`resent: false`).

## `POST /auth/jwt/create/`

Login. Body: `{ "login": "<email or username>", "password": "<password>" }`

**200:** `{ "access": "<jwt>", "refresh": "<jwt>", "user": { id, username, email, first_name, last_name, currency, country, timezone, theme } }`

**401:** `{ "non_field_errors": ["Incorrect username/email or password. Please try again."] }` or `{ "non_field_errors": ["Email is not verified."], "is_unverified": true, "user_id": "<uuid>", "otp_token": "<uuid|null>", "otp_still_valid": true|false }`

## `GET /auth/me/`

Requires auth. Returns the current user profile.

**200:** `{ "id", "username", "email", "first_name", "last_name", "currency", "country", "timezone", "theme" }`

## `PATCH /auth/me/`

Requires auth. Update profile fields. Body (all optional):

```json
{
  "first_name": "Tayyab",
  "last_name": "Ahmad",
  "currency": "PKR",
  "timezone": "Asia/Karachi",
  "theme": "neon"
}
```

`currency` must be a 3-letter ISO code (e.g. `USD`, `EUR`, `PKR`).
`timezone` must be an IANA timezone (e.g. `Asia/Karachi`, `America/New_York`).
`theme` must be one of: `light`, `dark`, `neon` (default on signup: `neon`).

**200:** updated user object (same shape as `GET /auth/me/`).

**404:** `{ "detail": "User not found." }`

## `POST /auth/jwt/refresh/`

Body: `{ "refresh": "<refresh-jwt>" }` — **200:** `{ "access": "<jwt>" }`

## `POST /auth/jwt/verify/`

Body: `{ "token": "<access-jwt>" }` — **200:** `{}` if valid.

Use `Authorization: JWT <access>` on protected routes.

## `POST /auth/password/forgot/`

Request a password reset link. Body: `{ "email": "user@example.com" }`

**200:** `{ "message": "If an account exists with that email, a reset link has been sent.", "sent": true }`

When a reset link was already sent and is still valid (within 10 minutes): `{ "message": "A recovery link was already sent and is still valid. Check your inbox.", "sent": false, "remaining_time_seconds": 540 }`

Always returns the same generic message for unknown emails (`sent: true`).

## `GET /auth/password/:token/status/`

Reset token countdown for the reset-password page. **200:** `{ "remaining_time_seconds": 600 }`

**404:** `{ "detail": "Invalid reset token." }`

## `POST /auth/password/reset/`

Set a new password. Body: `{ "token": "<uuid>", "password": "...", "confirmPassword": "..." }`

**200:** `{ "message": "Password reset successful" }`

**400:** invalid/expired token or validation errors as `{ "field": ["message"] }`.

---

## Wealth (requires auth)

All wealth routes require `Authorization: JWT <access>`. Data is scoped to the logged-in user.

### `GET /wealth/`

Filtered dashboard. Defaults to the current month when query params are omitted.

**Month filter:** `?mode=month&year=2026&month=6`

**Year filter:** `?mode=year&start_year=2024&end_year=2026`

**200:**
```json
{
  "filter": { "mode": "month", "year": 2026, "month": 6 },
  "net_worth": 4500,
  "monthly_income": 5200,
  "monthly_expenses": 3850,
  "net_savings": 1350,
  "waste_spending": 420,
  "savings_balance": 4500,
  "transactions": [
    {
      "id": "<uuid>",
      "description": "Grocery Store",
      "amount": -85.5,
      "category": "Food & Dining",
      "date": "2026-06-15"
    }
  ],
  "savings": [
    {
      "id": "<uuid>",
      "amount": 1350,
      "month": "June 2026",
      "type": "deposit"
    }
  ],
  "category_totals": [
    { "value": "food", "label": "Food & Dining", "total": 85.5 }
  ],
  "income_category_totals": [
    { "value": "salary", "label": "Salary", "total": 2600 },
    { "value": "freelancing", "label": "Freelancing", "total": 0 },
    { "value": "bonus", "label": "Bonus", "total": 0 },
    { "value": "gift", "label": "Gift", "total": 0 },
    { "value": "income_other", "label": "Other", "total": 0 }
  ]
}
```

### `POST /wealth/transactions/`

Create a transaction. Body:
```json
{
  "description": "Grocery Store",
  "amount": 85.5,
  "category": "food",
  "date": "2026-06-15"
}
```

`amount` is always positive in the request. The backend signs it: positive for income categories, negative for expense categories.

**Expense categories:** `food`, `transport`, `housing`, `shopping`, `entertainment`, `waste`, `other`

**Income categories:** `salary`, `freelancing`, `bonus`, `gift`, `income_other` (legacy `income` still accepted)

**200:** serialized transaction object (same shape as items in `transactions` above).

### `PATCH /wealth/transactions/:id/`

Update a transaction. Same fields as create, all optional.

**404:** `{ "detail": "Transaction not found." }`

### `DELETE /wealth/transactions/:id/`

**200:** `{ "message": "Transaction deleted" }`

### `POST /wealth/savings/`

Add a savings deposit. Body:
```json
{
  "amount": 1350,
  "month": "2026-06"
}
```

**200:** serialized saving object.

### `POST /wealth/savings/withdraw/`

Withdraw from savings. Body:
```json
{
  "amount": 300,
  "month": "2026-05",
  "reason": "Emergency car repair"
}
```

**400:** `{ "amount": ["You only have X available to extract."] }` when balance is insufficient.

Also creates a linked expense transaction with category `other`, amount equal to the withdrawal, description set to `reason`, and date set to the first day of the selected month.

### `PATCH /wealth/savings/:id/`

Update a savings entry (deposit or withdrawal). Body (all optional):
```json
{
  "amount": 500,
  "month": "2026-06",
  "reason": "Updated reason"
}
```

For withdrawals, `reason` must remain non-empty when provided. Increasing a withdrawal amount validates available balance.

**200:** serialized saving object. **404:** saving not found.

### `DELETE /wealth/savings/:id/`

Delete a savings entry.

**200:** `{ "message": "Saving deleted" }`
