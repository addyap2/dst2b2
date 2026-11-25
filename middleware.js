// Password gate for the whole site, run by Vercel before any file is served.
// The login comes from the DST_USER and DST_PASSWORD environment variables set in the
// Vercel project, so it never appears in this public repository. Without them the site stays locked.

export const config = {
  // Everything except the stylesheet, the logo and robots.txt, which the password page needs.
  matcher: ['/((?!styles\\.css$|assets/|robots\\.txt$).*)'],
};

const COOKIE = 'dst2b2_auth';
const MAX_AGE = 60 * 60 * 12; // 12 hours: one exam day

async function tokenFor(user, password) {
  const bytes = new TextEncoder().encode(`dst2b2:${user}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(/;\s*/).find(part => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function page(message, status) {
  const error = message ? `<p class="login-error" role="alert">${message}</p>` : '';
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>DST 2 Oral · Accès réservé</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="login-page">
  <main class="login-card">
    <img class="login-logo" src="/assets/edj-nice-logo.webp" alt="L’école du journalisme de Nice" width="436" height="188">
    <h1>DST 2 ORAL</h1>
    <p class="login-intro">Accès réservé aux enseignants et aux surveillants.</p>
    <form method="post" action="/">
      <label for="user">Identifiant</label>
      <input id="user" name="user" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
      <label for="password">Mot de passe</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      ${error}
      <button class="spin-button" type="submit">Entrer</button>
    </form>
  </main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });
}

export default async function middleware(request) {
  const env = (globalThis.process && process.env) || {};
  const user = env.DST_USER || '';
  const password = env.DST_PASSWORD || '';
  if (!user || !password) return page('L’identifiant et le mot de passe ne sont pas encore configurés sur le serveur.', 503);

  const expected = await tokenFor(user, password);
  if (sameText(readCookie(request, COOKIE), expected)) return undefined; // let the request through

  if (request.method === 'POST') {
    let givenUser = '';
    let givenPassword = '';
    try {
      const form = await request.formData();
      givenUser = String(form.get('user') || '').trim().toLowerCase();
      givenPassword = String(form.get('password') || '');
    } catch { /* not a form */ }
    if (givenPassword && sameText(await tokenFor(givenUser, givenPassword), await tokenFor(user.toLowerCase(), password))) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'cache-control': 'no-store',
          'set-cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return page('Identifiant ou mot de passe incorrect.', 401);
  }

  return page('', 401);
}
