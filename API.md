# API

Base: `http://localhost:3000/api` (port from `PORT`).

Use `Content-Type: application/json` for POST bodies.

## `GET /`

Returns `Hello World!` as plain text.

## `POST /auth/users`

Register. Body: `first_name`, `last_name`, `username` (3–20 chars, alphanumeric and `@ . + - _`), `email`, `password` and `confirmPassword` (≥8 chars with upper, lower, number, special char), `terms` (must be `true`). Passwords must match.

Sends a verification email to the provided address.

**200/201:** `{ "message": "Registration successful", "user": { id, first_name, last_name, username, email, is_verified, verified_at, created_at } }`

**400:** validation / passwords don’t match / terms not accepted. **409:** username or email taken.

## `GET /auth/verify?token=...`

Verifies the user email using the 15-minute link from email.

## `POST /auth/resend-verification`

Resends verification email (only if user is **not verified** and the **previous token is expired**).

Body: `{ "identifier": "<email or username>" }`

## `POST /auth/login`

Body: `{ "identifier": "<email or username>", "password": "<password>" }`

**200:** `{ "access_token": "<jwt (7d)>", "token_type": "Bearer", "expires_in": 604800, "user": { id, first_name, last_name, username, email, is_verified, created_at } }`

**401:** invalid email/username or password

**403:** email not verified (sign-in blocked until verification; applies whether you sign in with email or username)
