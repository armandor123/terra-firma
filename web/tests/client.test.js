import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsSimulation, reviewTransitions, SessionClient } from '../public/client.js';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
test('simulation labels include nested sources and legacy results', () => {
  assert(containsSimulation({ ai: { simulated: true } }));
  assert(containsSimulation({ environment_snapshot: { weather: { simulated: true } } }));
  assert(!containsSimulation({ ai: { simulated: false }, environment_snapshot: null }));
  assert(!containsSimulation({ simulated: 'true' }));
  assert.deepEqual(reviewTransitions.under_review, ['verified', 'rejected']);
  assert.deepEqual(reviewTransitions.rejected, []);
});
test('concurrent expired requests rotate only once and use new token', async () => {
  let refreshes = 0;
  const client = new SessionClient(async (path, options) => {
    if (path.endsWith('/login')) return json({ access_token: 'old', refresh_token: 'r', role: 'farmer' });
    if (path.endsWith('/refresh')) { refreshes++; await new Promise(r => setTimeout(r, 5)); return json({ access_token: 'new', refresh_token: 'r2' }); }
    return options.headers.get('Authorization') === 'Bearer old' ? json({}, 401) : json({ ok: true });
  });
  await client.login('test', 'not-real-password');
  assert.deepEqual(await Promise.all([client.json('/v1/me'), client.json('/v1/properties')]), [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
});
test('logout does not let a delayed refresh restore a session', async () => {
  let release;
  const client = new SessionClient(async path => {
    if (path.endsWith('/login')) return json({ access_token: 'a', refresh_token: 'r' });
    if (path.endsWith('/refresh')) { await new Promise(r => { release = r; }); return json({ access_token: 'b', refresh_token: 'r2' }); }
    return json({}, 401);
  });
  await client.login('test', 'not-real-password');
  const request = client.json('/v1/me');
  while (!release) await new Promise(r => setTimeout(r, 1));
  client.clear(); release();
  await assert.rejects(request, /Sessão alterada/);
  await assert.rejects(client.json('/v1/me'), /Entre novamente/);
});
test('external paths are refused before attaching credentials', async () => {
  const client = new SessionClient(async () => json({ access_token: 'private', refresh_token: 'private' }));
  await client.login('test', 'not-real-password');
  await assert.rejects(client.request('https://outside.invalid/photo'), /Caminho/);
});
