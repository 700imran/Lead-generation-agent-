// End-to-end test of the real Worker + Workflow code inside workerd (Miniflare):
// real D1 (SQLite), R2, Queues, Workflows. Only Workers AI and outbound HTTP are mocked.
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const ADMIN = 'test-admin-token-123', SESSION = 'test-session-secret-abcdefghijklmnop', HOOK = 'test-webhook-secret';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AI_MOCK = `
import { WorkerEntrypoint } from 'cloudflare:workers';
const calls = [];
export class Ai extends WorkerEntrypoint {
  async run(model, opts) {
    const user = JSON.parse(opts.messages[1].content);
    calls.push({ model, step: user.step, task: user.task_id });
    return { response: JSON.stringify({ status: 'completed', result: 'mock result for ' + user.step, evidence: [], risks: [], confidence: 0.9 }) };
  }
}
export default { fetch() { return Response.json({ calls }); } };`;

const outbound = async (req) => {
  const u = new URL(req.url);
  if (u.hostname === 'blocked.test' && u.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /', { headers: { 'content-type': 'text/plain' } });
  if (u.pathname === '/robots.txt') return new Response('not found', { status: 404 });
  if (u.hostname === 'redirect.test') return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/' } });
  return new Response('<html><body>Acme Dental — contact@acme.test</body></html>', { headers: { 'content-type': 'text/html' } });
};

async function boot(useMigrations) {
  const mf = new Miniflare({
    workers: [
      {
        name: 'orbit', modules: true, scriptPath: path.join(root, 'src/index.js'), compatibilityDate: '2026-07-01', compatibilityFlags: ['nodejs_compat'],
        d1Databases: { DB: 'db' }, r2Buckets: { R2: 'r2' },
        queueProducers: { AGENT_QUEUE: 'orbitreach-agent-jobs' },
        queueConsumers: { 'orbitreach-agent-jobs': { maxBatchSize: 10, maxBatchTimeout: 1 } },
        workflows: { ORBIT_WORKFLOW: { name: 'orbitreach-agent-workflow', className: 'OrbitReachWorkflow' } },
        serviceBindings: { AI: { name: 'ai-mock', entrypoint: 'Ai' } },
        outboundService: outbound,
        bindings: { ADMIN_TOKEN: ADMIN, SESSION_SECRET: SESSION, WEBHOOK_SECRET: HOOK, MAX_WORKFLOW_STEPS: '30', MAX_RETRIES: '1', DEFAULT_TASK_BUDGET_USD: '0.25', MAX_TASK_BUDGET_USD: '1', MAX_FETCH_BYTES: '120000', MAX_STEP_MS: '25000' },
      },
      { name: 'ai-mock', modules: true, script: AI_MOCK, compatibilityDate: '2026-07-01' },
    ],
  });
  await mf.ready;
  const db = await mf.getD1Database('DB');
  const files = useMigrations ? ['0001_init', '0002_revenue_engine', '0003_cloudflare_native', '0004_revenue_tables'].map((f) => `migrations/${f}.sql`) : ['schema.sql'];
  for (const f of files) for (const line of readFileSync(path.join(root, f), 'utf8').split('\n').filter((l) => l.trim())) await db.exec(line);
  return mf;
}

async function main(useMigrations) {
  console.log(`\n=== ${useMigrations ? 'migration chain 0001→0004' : 'schema.sql'} ===`);
  const mf = await boot(useMigrations);
  const call = async (p, { method, body, token, headers = {}, raw } = {}) => {
    const h = { ...headers }; if (token) h.authorization = `Bearer ${token}`;
    const init = { method: method || (body !== undefined || raw !== undefined ? 'POST' : 'GET'), headers: h };
    if (body !== undefined) { h['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
    if (raw !== undefined) init.body = raw;
    const r = await mf.dispatchFetch('https://orbit.test' + p, init);
    let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch { /* not json */ }
    return { s: r.status, j, h: r.headers };
  };
  const aiCalls = async () => (await (await mf.getWorker('ai-mock')).fetch('http://x/')).json().then((x) => x.calls);
  const waitTask = async (id, token, pred, ms = 40000) => {
    const end = Date.now() + ms; let last;
    while (Date.now() < end) { last = (await call('/api/task?id=' + id, { token })).j; if (last?.task && pred(last.task)) return last; await sleep(300); }
    return last || {};
  };
  const adm = (p, body) => call(p, { body, token: ADMIN });

  // --- basics & auth
  let r = await call('/health'); ok(r.s === 200 && r.j.ok, 'GET /health');
  r = await call('/ready', { token: ADMIN }); ok(r.s === 200 && r.j.bindings.DB && r.j.secrets.SESSION_SECRET, 'GET /ready reports bindings/secrets');
  r = await call('/api/state'); ok(r.s === 401, 'unauthenticated /api/state → 401');
  r = await call('/api/state', { token: 'garbage' }); ok(r.s === 401, 'invalid bearer → 401');
  r = await call('/api/login', { body: { token: 'wrong' } }); ok(r.s === 401, 'login wrong token → 401');
  r = await call('/api/login', { body: { token: ADMIN } }); ok(r.s === 200 && /HttpOnly/.test(r.h.get('set-cookie')), 'login sets HttpOnly cookie');
  const cookie = r.h.get('set-cookie').split(';')[0];
  r = await call('/api/state', { headers: { cookie } }); ok(r.s === 200 && r.j.role === 'admin' && r.j.agents.length === 13, 'cookie session works; 13 agents seeded');
  r = await call('/api/state', { headers: { cookie: cookie.slice(0, -3) + 'xyz' } }); ok(r.s === 401, 'tampered cookie → 401');
  r = await call('/api/nope', { token: ADMIN }); ok(r.s === 404, 'unknown route → 404');
  r = await call('/api/task', { token: ADMIN, raw: '{bad' , headers: { 'content-type': 'application/json' } }); ok(r.s === 400, 'malformed JSON → 400 (not 500)');

  // --- tenants
  r = await adm('/api/tenant', { tenant_id: 'Bad ID!' }); ok(r.s === 400, 'invalid tenant_id → 400');
  r = await adm('/api/tenant', { tenant_id: 'acme', name: 'Acme' }); const A = r.j?.api_token; ok(r.s === 200 && A?.startsWith('or_acme_'), 'create tenant acme + token');
  r = await adm('/api/tenant', { tenant_id: 'globex' }); const B = r.j?.api_token; ok(r.s === 200 && !!B, 'create tenant globex');
  r = await adm('/api/tenant', { tenant_id: 'acme' }); ok(r.s === 409, 'duplicate tenant → 409');
  const hashRow = await (await mf.getD1Database('DB')).prepare('SELECT token_hash FROM api_tokens WHERE tenant_id=?').bind('acme').first();
  ok(hashRow.token_hash !== A && hashRow.token_hash.length === 64, 'raw tenant token not stored (SHA-256 only)');
  r = await call('/api/tenant', { token: A, body: { tenant_id: 'evil' } }); ok(r.s === 403, 'tenant token cannot create tenants');

  // --- happy-path workflow (6 steps, no approvals)
  r = await call('/api/task', { token: A, body: { action: 'lead_capture', input: { niche: 'dentists' } } });
  ok(r.s === 200 && r.j.task_id, 'tenant starts lead_capture workflow');
  const t1 = r.j.task_id;
  let d = await waitTask(t1, A, (t) => t.status === 'completed');
  ok(d.task?.status === 'completed', 'workflow completes durably');
  ok(d.results?.length === 6 && d.steps?.length === 6, '6 micro-actions persisted (results + step rows)');
  ok(d.steps?.every((s) => s.status === 'completed'), 'all step rows completed (no dangling approvals/duplicates)');
  ok((await aiCalls()).length === 6, 'exactly 6 AI calls (no replay duplication)');

  // --- tenant isolation
  r = await call('/api/task?id=' + t1, { token: B }); ok(r.s === 403, 'tenant B cannot read tenant A task');
  r = await call('/api/state', { token: B }); ok(r.s === 200 && r.j.tasks.length === 0 && r.j.audit.every((x) => x.tenant_id === 'globex'), 'tenant B state contains no tenant A data');
  r = await call('/api/task', { token: B, body: { tenant_id: 'acme', action: 'lead_capture' } }); const stray = r.j?.task_id;
  const tt = (await call('/api/task?id=' + stray, { token: B })).j; ok(tt?.task?.tenant_id === 'globex', 'client-supplied tenant_id ignored for tenant token');
  r = await call('/api/kill-switch', { token: A, body: { enabled: false } }); ok(r.s === 403, 'tenant cannot use kill switch');
  r = await call('/api/approval', { token: A, body: { approval_id: 'x', approve: true } }); ok(r.s === 403, 'tenant cannot approve');
  r = await call('/api/task', { token: A, body: { action: 'nonexistent' } }); ok(r.s === 400, 'unknown action → 400');
  r = await call('/api/task', { token: A, body: { action: 'lead_capture', input: { compute_budget_usd: 9999 } } });
  d = (await call('/api/task?id=' + r.j.task_id, { token: A })).j; ok(d.task.compute_budget_usd === 1, 'tenant budget clamped to MAX_TASK_BUDGET_USD');

  // --- approval gate: approve then reject
  const before = (await aiCalls()).length;
  r = await call('/api/task', { token: A, body: { action: 'call', input: { lead: 'x' } } }); const t2 = r.j.task_id;
  await waitTask(t2, A, (t) => t.status === 'waiting_approval');
  let ap = (await call('/api/approvals', { token: ADMIN })).j.approvals.find((x) => x.task_id.length && x.step === 'admin_call_authorization');
  ok(!!ap, 'workflow pauses with durable pending approval (admin_call_authorization)');
  ok((await aiCalls()).length === before + 1, 'no AI call executed for gated step before approval');
  r = await call('/api/approval', { token: ADMIN, body: { approval_id: ap.id, approve: true } }); ok(r.s === 200 && r.j.status === 'approved', 'admin approves');
  r = await call('/api/approval', { token: ADMIN, body: { approval_id: ap.id, approve: true } }); ok(r.s === 409 || r.s === 404, 'double-approve rejected');
  const end = Date.now() + 30000; let ap2;
  while (Date.now() < end && !ap2) { ap2 = (await call('/api/approvals', { token: ADMIN })).j.approvals.find((x) => x.step === 'call'); await sleep(300); }
  ok(!!ap2, 'resumes after approval and stops at the next gate (call) — no approval loop');
  r = await call('/api/approval', { token: ADMIN, body: { approval_id: ap2.id, approve: false } }); ok(r.status === undefined && r.j.status === 'rejected', 'admin rejects second gate');
  d = await waitTask(t2, A, (t) => t.status === 'rejected');
  ok(d.task?.status === 'rejected', 'rejected approval ends workflow as rejected');
  ok((await aiCalls()).length === before + 2, 'rejected step never reached the LLM');

  // --- kill switch fails closed mid-flight
  r = await call('/api/task', { token: A, body: { action: 'call' } }); const t3 = r.j.task_id;
  await waitTask(t3, A, (t) => t.status === 'waiting_approval');
  ap = (await call('/api/approvals', { token: ADMIN })).j.approvals.find((x) => x.task_id !== t2 && x.step === 'admin_call_authorization' && x.tenant_id === 'acme');
  const calls0 = (await aiCalls()).length;
  r = await adm('/api/kill-switch', { enabled: false }); ok(r.j.enabled === false, 'kill switch engaged');
  r = await call('/api/task', { token: A, body: { action: 'lead_capture' } }); ok(r.s === 503, 'new tasks blocked while kill switch on');
  await adm('/api/approval', { approval_id: ap.id, approve: true });
  d = await waitTask(t3, A, (t) => t.status === 'failed');
  ok(d.task?.status === 'failed' && /kill switch/.test(d.task.error || ''), 'in-flight workflow fails closed on kill switch');
  ok((await aiCalls()).length === calls0, 'no LLM calls while kill switch active');
  await adm('/api/kill-switch', { enabled: true });
  r = await call('/api/task', { token: A, body: { action: 'lead_capture' } }); ok(r.s === 200, 'tasks allowed again after resume');

  // --- webhook
  const body = JSON.stringify({ tenant_id: 'acme', action: 'lead_capture', input: {} });
  const sig = createHmac('sha256', HOOK).update(body).digest('hex');
  r = await call('/api/webhook', { raw: body, token: A }); ok(r.s === 401, 'webhook without signature → 401');
  r = await call('/api/webhook', { raw: body, token: A, headers: { 'x-orbit-signature': 'deadbeef' } }); ok(r.s === 401, 'webhook bad signature → 401');
  r = await call('/api/webhook', { raw: body, token: B, headers: { 'x-orbit-signature': sig } }); ok(r.s === 401, 'webhook with other tenant token → 401');
  r = await call('/api/webhook', { raw: body, token: A, headers: { 'x-orbit-signature': sig } }); ok(r.s === 200 && r.j.task_id, 'valid signed webhook accepted (hex HMAC)');
  const b64 = createHmac('sha256', HOOK).update(body).digest('base64url');
  r = await call('/api/webhook', { raw: body, token: A, headers: { 'x-orbit-signature': b64 } }); ok(r.s === 200, 'valid signed webhook accepted (base64url HMAC)');
  const bad = JSON.stringify({ tenant_id: 'acme', action: 'zzz' });
  r = await call('/api/webhook', { raw: bad, token: A, headers: { 'x-orbit-signature': createHmac('sha256', HOOK).update(bad).digest('hex') } }); ok(r.s === 400, 'webhook unknown action → 400');

  // --- web tools: robots, SSRF, redirects, R2 cache
  r = await adm('/api/task', { tenant_id: 'acme', action: 'web_lead_research', input: { url: 'https://example.com/page' } });
  d = await waitTask(r.j.task_id, ADMIN, (t) => ['completed', 'failed'].includes(t.status));
  ok(d.task?.status === 'completed', 'web_lead_research completes for allowed URL');
  const r2 = await mf.getR2Bucket('R2'); const listed = await r2.list({ prefix: 'acme/research/' });
  ok(listed.objects.length === 1, 'fetched page cached in R2 under tenant prefix');
  for (const [url, re, label] of [['https://blocked.test/x', /robots/, 'robots.txt disallow'], ['https://127.0.0.1/', /unsafe URL/, 'loopback IP'], ['https://[::1]/', /unsafe URL/, 'IPv6 loopback'], ['http://example.com/', /unsafe URL/, 'plain http'], ['https://169.254.169.254/', /unsafe URL/, 'metadata IP'], ['https://redirect.test/x', /redirect/, 'redirect']]) {
    r = await adm('/api/task', { tenant_id: 'acme', action: 'web_lead_research', input: { url } });
    d = await waitTask(r.j.task_id, ADMIN, (t) => ['completed', 'failed'].includes(t.status));
    ok(d.task?.status === 'failed' && re.test(d.task.error || ''), `blocked: ${label}`);
  }

  // --- budget cap
  r = await adm('/api/task', { tenant_id: 'acme', action: 'lead_capture', compute_budget_usd: 0, input: { compute_budget_usd: 0.0000001 } });
  d = await waitTask(r.j.task_id, ADMIN, (t) => ['completed', 'failed'].includes(t.status));
  ok(d.task?.status === 'failed' && /budget/.test(d.task.error || ''), 'workflow stops when estimated compute budget is exhausted');

  // --- queue ingress
  const n0 = (await call('/api/state', { token: B })).j.tasks.length;
  r = await call('/api/enqueue', { token: B, body: { action: 'lead_capture', input: {} } }); ok(r.s === 202, 'enqueue accepted');
  let n1 = n0; const e2 = Date.now() + 20000; while (Date.now() < e2 && n1 === n0) { await sleep(500); n1 = (await call('/api/state', { token: B })).j.tasks.length; }
  ok(n1 > n0, 'queue consumer turns message into a workflow task');

  // --- suspended tenant + cron sweep
  r = await adm('/api/tenant/status', { tenant_id: 'globex', status: 'suspended' }); ok(r.s === 200, 'suspend tenant');
  r = await call('/api/task', { token: B, body: { action: 'lead_capture' } }); ok(r.s === 403, 'suspended tenant cannot start tasks');
  const db = await mf.getD1Database('DB');
  await db.prepare("INSERT INTO approvals(id,task_id,tenant_id,reason,status,step,created_at,expires_at) VALUES('old-ap','t','acme','x','pending','send_message','2020-01-01','2020-01-02')").run();
  const w = await mf.getWorker('orbit'); const sch = await w.scheduled({ cron: '*/5 * * * *' }); await sleep(500);
  const oldAp = await db.prepare("SELECT status FROM approvals WHERE id='old-ap'").first();
  ok(oldAp.status === 'expired', `scheduled sweep expires stale approvals (${sch.outcome})`);

  await mf.dispose();
}

try { await main(false); await main(true); } catch (e) { fail++; console.error('FATAL', e); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
