import test from 'node:test';
import assert from 'node:assert';
import middleware, { config } from '../middleware.js';

const URL = 'https://example.test/';
const form = (user, password) => new Request(URL, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ user, password }),
});

test('locked when the login is not configured', async () => {
  delete process.env.DST_USER;
  delete process.env.DST_PASSWORD;
  const res = await middleware(new Request(URL));
  assert.strictEqual(res.status, 503);
});

test('login flow', async t => {
  process.env.DST_USER = 'edj';
  process.env.DST_PASSWORD = 'test-pass';

  await t.test('shows the login page without a cookie', async () => {
    const res = await middleware(new Request(URL + 'questions.js'));
    assert.strictEqual(res.status, 401);
    assert.match(await res.text(), /Identifiant[\s\S]*Mot de passe/);
  });

  await t.test('rejects a wrong password or user', async () => {
    assert.strictEqual((await middleware(form('edj', 'nope'))).status, 401);
    assert.strictEqual((await middleware(form('someone', 'test-pass'))).status, 401);
    assert.strictEqual((await middleware(form('edj', ''))).status, 401);
  });

  await t.test('accepts the right login, ignoring case and spaces in the user', async () => {
    const res = await middleware(form(' EDJ ', 'test-pass'));
    assert.strictEqual(res.status, 303);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /^dst2b2_auth=[0-9a-f]{64}; .*HttpOnly; Secure/);

    const pass = await middleware(new Request(URL + 'questions.js', { headers: { cookie: cookie.split(';')[0] } }));
    assert.strictEqual(pass, undefined, 'a valid cookie lets the request through');
  });

  await t.test('a forged or old cookie does not work', async () => {
    const res = await middleware(new Request(URL, { headers: { cookie: 'dst2b2_auth=' + 'a'.repeat(64) } }));
    assert.strictEqual(res.status, 401);
  });

  await t.test('the password is case-sensitive', async () => {
    assert.strictEqual((await middleware(form('edj', 'TEST-PASS'))).status, 401);
  });
});

test('the questions and the app are behind the gate; only the stylesheet, logo and robots.txt are open', () => {
  const re = new RegExp('^' + config.matcher[0].replace('/((?!', '/(?!').replace(').*)', ').*') + '$');
  for (const path of ['/', '/index.html', '/questions.js', '/app.js']) assert.ok(re.test(path), path);
  for (const path of ['/styles.css', '/assets/edj-nice-logo.webp', '/robots.txt']) assert.ok(!re.test(path), path);
});
