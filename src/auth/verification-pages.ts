const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function verificationSuccessPage(loginHref: string): string {
  const safeHref = escapeHtml(loginHref);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email verified — ASTRA</title>
  <style>
    :root {
      --bg: #0c0f14;
      --card: #141a22;
      --border: #1e2733;
      --text: #e8edf4;
      --muted: #8b98a8;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --success: #34d399;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(ellipse 120% 80% at 50% 0%, #172033 0%, var(--bg) 55%);
      color: var(--text);
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px 36px 36px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(52, 211, 153, 0.12);
      color: var(--success);
      font-size: 28px;
      line-height: 1;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 28px;
      font-size: 0.95rem;
      line-height: 1.55;
      color: var(--muted);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      color: #fff;
      background: linear-gradient(180deg, var(--accent) 0%, var(--accent-hover) 100%);
      border: none;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    .brand {
      margin-top: 28px;
      text-align: center;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge" aria-hidden="true">&#10003;</div>
    <h1>Email verified</h1>
    <p>Your account is ready. You can log in to ASTRA with the email you signed up with.</p>
    <a class="btn" href="${safeHref}">Log in to ASTRA</a>
    <p class="brand">ASTRA</p>
  </div>
</body>
</html>`;
}

export function verificationErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verification failed — ASTRA</title>
  <style>
    :root {
      --bg: #0c0f14;
      --card: #141a22;
      --border: #1e2733;
      --text: #e8edf4;
      --muted: #8b98a8;
      --warn: #fbbf24;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(ellipse 120% 80% at 50% 0%, #2a1f17 0%, var(--bg) 55%);
      color: var(--text);
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px 36px 36px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(251, 191, 36, 0.12);
      color: var(--warn);
      font-size: 26px;
      line-height: 1;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.55;
      color: var(--muted);
    }
    .brand {
      margin-top: 28px;
      text-align: center;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge" aria-hidden="true">&#9888;</div>
    <h1>Link invalid or expired</h1>
    <p>This verification link can’t be used anymore. Request a new one from the app or sign up again if needed.</p>
    <p class="brand">ASTRA</p>
  </div>
</body>
</html>`;
}
