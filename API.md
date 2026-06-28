# API

Base: `http://localhost:3001/api` (port from `PORT`).

Aligned with the `astra-frontend` `tayyab-dev` branch. Use `Content-Type: application/json` and `withCredentials: true` for auth requests.

## `POST /auth/users/`

Register. Body: `first_name`, `last_name`, `username`, `email`, `password`, `confirmPassword`, `terms` (must be `true`).

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

**200:** `{ "access": "<jwt>", "refresh": "<jwt>", "user": { id, username, email, first_name, last_name } }`

**401:** `{ "non_field_errors": ["Unable to log in with provided credentials."] }` or `{ "non_field_errors": ["Email is not verified."], "is_unverified": true, "user_id": "<uuid>", "otp_token": "<uuid|null>", "otp_still_valid": true|false }`

## `POST /auth/jwt/refresh/`

Body: `{ "refresh": "<refresh-jwt>" }` — **200:** `{ "access": "<jwt>" }`

## `POST /auth/jwt/verify/`

Body: `{ "token": "<access-jwt>" }` — **200:** `{}` if valid.

Use `Authorization: JWT <access>` on protected routes.
