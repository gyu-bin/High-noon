// Ghost Snapshot V2 validation (supabase/migrations/20260928_ghost_snapshot_v2.sql)
// on real PostgreSQL (PGlite, pgcrypto), plus the real client modules and the
// actual useGhostDuelEngine hook. Not a device UI test.
//
//   PGLITE_DIR=<folder with @electric-sql/pglite@0.3> node tests/ghost-snapshot-v2.cjs
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const pgliteDir = process.env.PGLITE_DIR ? path.join(process.env.PGLITE_DIR, 'node_modules') : undefined;
const load = (id) => require(pgliteDir ? require.resolve(id, { paths: [pgliteDir] }) : id);
const { PGlite } = load('@electric-sql/pglite');
const { pgcrypto } = load('@electric-sql/pglite/contrib/pgcrypto');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const GHOST_V2 = read('supabase/migrations/20260928_ghost_snapshot_v2.sql');
const RECONCILE = read('supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql');
const PLATFORM = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;
const FRESH_CHAIN = [
  PLATFORM,
  read('supabase/migrations/20260830_bounty_ranking_v3_base.sql'),
  read('supabase/migrations/20260831_daily_and_profile.sql'),
  read('supabase/migrations/20260907_analytics_events_and_friend_challenge.sql'),
  RECONCILE,
];

const newKey = () => crypto.randomBytes(32).toString('hex');
const q = async (db, sql, params = []) => (await db.query(sql, params)).rows;

async function openDb(parts) {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  for (const sql of parts) await db.exec(sql);
  return db;
}
const freshV2 = () => openDb([...FRESH_CHAIN, GHOST_V2]);

/** PostgREST-style RPC: named arguments via json_to_record, executed as anon. */
async function rpc(db, name, args = {}, role = 'anon') {
  const meta = await q(db, `
    select coalesce(p.proargnames, '{}') as names,
           array(select format_type(t, null) from unnest(p.proargtypes) t) as types
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [name]);
  if (meta.length === 0) return { data: null, error: { message: `Could not find the function public.${name}` } };
  const { names, types } = meta[0];
  const keys = Object.keys(args);
  const sql = keys.length === 0
    ? `select public.${name}() as r`
    : `select public.${name}(${keys.map((k) => `${k} := _.${k}`).join(', ')}) as r
       from json_to_record($1::json) as _(${keys.map((k) => `${k} ${types[names.indexOf(k)]}`).join(', ')})`;
  await db.exec(`set role ${role}`);
  try {
    const rows = await q(db, sql, keys.length ? [JSON.stringify(args)] : []);
    return { data: rows[0].r, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  } finally {
    await db.exec('reset role');
  }
}
async function ok(db, name, args) {
  const { data, error } = await rpc(db, name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}
async function fails(db, name, args, pattern) {
  const { error } = await rpc(db, name, args);
  assert.ok(error, `${name} should fail`);
  assert.match(error.message, pattern);
}

const S = (ms) => ({ outcome: 'shot', reaction_ms: ms });
const E = { outcome: 'early', reaction_ms: null };
const T = { outcome: 'timeout', reaction_ms: null };

async function player(db, rating) {
  const key = newKey();
  const me = await ok(db, 'pvp_login_device', { p_device_key: key });
  if (rating != null) await q(db, `update profiles set rating = $2 where id = $1`, [me.id, rating]);
  return { key, id: me.id };
}
const profile = async (db, id) => (await q(db, `select * from profiles where id = $1`, [id]))[0];
// PGlite decodes NULL elements of integer[] as NaN; read arrays through jsonb like PostgREST does.
const matchRow = async (db, id) => (await q(db, `select m.*, to_jsonb(m.player_rounds) as player_rounds,
  to_jsonb(m.opponent_samples) as opponent_samples from pvp_matches m where m.id = $1`, [id]))[0];
const mm2 = (db, p) => ok(db, 'pvp_matchmake_v2', { p_device_key: p.key });
const submit2 = (db, p, matchId, rounds) =>
  rpc(db, 'pvp_submit_match_v2', { p_device_key: p.key, p_match_id: matchId, p_rounds: rounds, p_character_id: 2 });
async function settle2(db, p, matchId, rounds) {
  const { data, error } = await submit2(db, p, matchId, rounds);
  if (error) throw new Error('pvp_submit_match_v2: ' + error.message);
  return data;
}

/** Generated bot at rating 1000 replays [430, 470, 450] (fresh chain has no seeded bots). */
async function recordGhost(db, p, rounds) {
  const m = await mm2(db, p);
  assert.equal(m.opponent.is_bot, true, 'ghost recorded against a bot here');
  const s = await settle2(db, p, m.match_id, rounds);
  return { m, s };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

// ---------------------------------------------------------------------------
// ghost engine harness (actual hook, fake timers; same approach as local duel)
// ---------------------------------------------------------------------------
function engineHarness(hookOptions = {}) {
  let now = 0, serial = 0, cursor = 0, api;
  const timers = new Map(), slots = [], effects = [];
  const fired = [];
  const equal = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) {
      const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) {
      const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) {
        const previous = slots[i]; slots[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const cache = {};
  function loadFile(file) {
    if (cache[file]) return cache[file];
    const module = { exports: {} }; cache[file] = module.exports;
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, require: (name) => {
        if (name === 'react') return react;
        if (name === '@/utils/duelSignalSpeech') return { stopDuelSignalSpeech() {} };
        if (name.startsWith('@/')) return loadFile(path.join(root, name.slice(2) + '.ts'));
        throw new Error('Unmocked import ' + name);
      },
      setTimeout: (fn, ms) => { const id = ++serial; timers.set(id, { at: now + ms, fn }); return id; },
      clearTimeout: (id) => timers.delete(id),
      Date: { now: () => now }, performance: { now: () => now }, Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    }, { filename: file });
    return module.exports;
  }
  const hook = loadFile(path.join(root, 'hooks/useGhostDuelEngine.ts')).useGhostDuelEngine;
  const opts = { onGhostFire: (ms) => fired.push(ms), ...hookOptions };
  const render = () => { cursor = 0; api = hook(opts); while (effects.length) effects.shift()(); return api; };
  const advance = (ms) => {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); render();
    }
    now = end; return render();
  };
  render();
  return { get api() { return api; }, render, advance, fired, get pending() { return timers.size; } };
}
const toBang = (h, ghost) => { h.api.start(ghost); h.render(); h.advance(6000); assert.equal(h.api.phase, '뱅'); };
const G = { shot: (ms) => ({ outcome: 'shot', reactionMs: ms }), early: { outcome: 'early', reactionMs: null }, timeout: { outcome: 'timeout', reactionMs: null } };

(async () => {
  // ------------------------------------------------------------ server model
  await test('1 SHOT/SHOT/SHOT: 3-round match settles and becomes the snapshot', async () => {
    const db = await freshV2();
    const a = await player(db);
    const { m, s } = await recordGhost(db, a, [S(400), S(500), S(300)]);
    assert.deepEqual(m.opponent.ghost_rounds, [S(430), S(470), S(450)], 'bot replays as SHOT rounds');
    assert.equal(m.ghost_version, 2);
    assert.deepEqual([s.result, s.score_player, s.score_opponent, s.rating_delta], ['win', 2, 1, 16]);
    const snap = (await profile(db, a.id)).ghost_snapshot;
    assert.deepEqual(snap.rounds, [S(400), S(500), S(300)]);
    assert.equal(snap.version, 2);
    assert.equal(snap.source_match_id, m.match_id);
    assert.match(snap.recorded_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/);
    assert.deepEqual((await profile(db, a.id)).ghost_replay_snapshot, snap, '3 rounds -> also replayable');
    const row = await matchRow(db, m.match_id);
    assert.deepEqual(row.player_round_detail, [S(400), S(500), S(300)]);
    assert.deepEqual(row.player_rounds, [400, 500, 300]);
  });

  await test('2 SHOT/EARLY/SHOT: early round kept as EARLY (not a number)', async () => {
    const db = await freshV2();
    const b = await player(db);
    const { s } = await recordGhost(db, b, [S(400), E, S(300)]);
    assert.deepEqual([s.result, s.score_player, s.score_opponent], ['win', 2, 1]);
    assert.deepEqual((await profile(db, b.id)).ghost_snapshot.rounds, [S(400), E, S(300)]);
  });

  await test('3 TIMEOUT/SHOT/SHOT: timeout vs bot shot loses the round, kept as TIMEOUT', async () => {
    const db = await freshV2();
    const c = await player(db);
    const { m, s } = await recordGhost(db, c, [T, S(400), S(300)]);
    assert.deepEqual([s.result, s.score_player, s.score_opponent], ['win', 2, 1]);
    assert.deepEqual((await profile(db, c.id)).ghost_snapshot.rounds, [T, S(400), S(300)]);
    assert.deepEqual((await matchRow(db, m.match_id)).player_rounds, [null, 400, 300]);
  });

  await test('4 EARLY/EARLY/SHOT: cannot come from one real match; replays correctly as a ghost', async () => {
    const db = await freshV2();
    const d = await player(db);
    let m = await mm2(db, d);
    // Two false starts decide the match 0-2: a third round is never played.
    await fails(db, 'pvp_submit_match_v2', { p_device_key: d.key, p_match_id: m.match_id, p_rounds: [E, E, S(300)] }, /invalid_round_count/);
    const s = await settle2(db, d, m.match_id, [E, E]);
    assert.deepEqual([s.result, s.score_player, s.score_opponent, s.rating_delta], ['loss', 0, 2, -16]);
    const dp = await profile(db, d.id);
    assert.deepEqual(dp.ghost_snapshot.rounds, [E, E], 'decided 0-2 in two rounds: stored as played');
    assert.equal(dp.ghost_replay_snapshot, null, 'not replayable (no round 3)');
    // Structurally valid snapshot (fixture written by the test as superuser) replays and scores:
    const g = await player(db);
    const snap = { version: 2, source_match_id: crypto.randomUUID(), recorded_at: '2026-09-28T00:00:00.000000Z', rounds: [E, E, S(300)] };
    await q(db, `update profiles set ghost_snapshot = $2::jsonb, ghost_replay_snapshot = $2::jsonb where id = $1`, [g.id, JSON.stringify(snap)]);
    const p = await player(db);
    m = await mm2(db, p);
    assert.equal(m.opponent.is_bot, false);
    assert.deepEqual(m.opponent.ghost_rounds, [E, E, S(300)]);
    const r = await settle2(db, p, m.match_id, [T, T]); // ghost fouled twice: player wins 2-0 even without shooting
    assert.deepEqual([r.result, r.score_player, r.score_opponent], ['win', 2, 0]);
    // Player early still loses the round even against an early ghost.
    const p2 = await player(db);
    const m2 = await mm2(db, p2);
    const r2 = await settle2(db, p2, m2.match_id, [E, S(200), S(200)]);
    // R1 player EARLY vs ghost EARLY -> opponent; R2 SHOT vs EARLY -> player; R3 200 < 300 -> player.
    assert.deepEqual([r2.result, r2.score_player, r2.score_opponent], ['win', 2, 1]);
  });


  await test('5 valid human ghost matchmaking: snapshot copied into the match', async () => {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]);
    const e = await player(db);
    const m = await mm2(db, e);
    assert.equal(m.opponent.is_bot, false);
    assert.equal(m.opponent.id, b.id);
    assert.deepEqual(m.opponent.ghost_rounds, [S(400), E, S(300)]);
    const row = await matchRow(db, m.match_id);
    assert.deepEqual(row.opponent_snapshot, (await profile(db, b.id)).ghost_replay_snapshot);
    assert.equal(row.ghost_version, 2);
    assert.equal(row.status, 'assigned');
    // Players without a V2 snapshot are never offered as humans.
    const x = await player(db);
    await q(db, `update profiles set ghost_samples = array[200,200,200] where id = $1`, [x.id]);
    for (let i = 0; i < 6; i++) {
      const again = await mm2(db, await player(db));
      assert.notEqual(again.opponent.id, x.id, 'legacy ghost_samples alone is not eligible');
    }
  });

  await test('6 bot fallback: explicit is_bot, no snapshot copy, bots never hold snapshots', async () => {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]);
    const far = await player(db, 1600); // > 300 away from every human snapshot
    const m = await mm2(db, far);
    assert.equal(m.opponent.is_bot, true);
    assert.ok(m.opponent.ghost_rounds.every((r) => r.outcome === 'shot'));
    const row = await matchRow(db, m.match_id);
    assert.equal(row.opponent_snapshot, null);
    assert.equal(row.opponent_is_bot, true);
    await assert.rejects(q(db, `insert into profiles (id, display_name, character_id, rating, rank_tier, wins, losses, is_bot, ghost_snapshot)
      values (gen_random_uuid(), 'Bot X', 1, 1000, 'silver', 0, 0, true, $1::jsonb)`,
      [JSON.stringify({ version: 2, source_match_id: crypto.randomUUID(), recorded_at: 'x', rounds: [S(200), S(200), S(200)] })]),
      /profile_ghost_snapshot_human_only/);
  });

  await test('7 profile ghost update: newest match replaces; a 2-0 match keeps the replayable one', async () => {
    const db = await freshV2();
    const a = await player(db);
    const first = await recordGhost(db, a, [S(400), S(500), S(300)]);
    const snap1 = (await profile(db, a.id)).ghost_snapshot;
    assert.equal(snap1.source_match_id, first.m.match_id);
    await q(db, `update profiles set rating = 1000 where id = $1`, [a.id]);
    const second = await recordGhost(db, a, [T, S(420), S(410)]);
    const snap2 = (await profile(db, a.id)).ghost_snapshot;
    assert.equal(snap2.source_match_id, second.m.match_id);
    assert.deepEqual(snap2.rounds, [T, S(420), S(410)], 'rounds come from ONE match, never merged');
    await q(db, `update profiles set rating = 1000 where id = $1`, [a.id]);
    const m3 = await mm2(db, a);
    await settle2(db, a, m3.match_id, [S(100), S(100)]); // 2-0: round 3 never played
    const p3 = await profile(db, a.id);
    assert.deepEqual(p3.ghost_snapshot.rounds, [S(100), S(100)], 'latest = the 2-0 match, as played');
    assert.equal(p3.ghost_snapshot.source_match_id, m3.match_id);
    assert.deepEqual(p3.ghost_replay_snapshot, snap2, 'replay pool keeps the latest 3-round match');
    // Opponents are still offered snap2, never a padded version of the 2-0 match.
    const opp = await player(db);
    await q(db, `update profiles set rating = $2 where id = $1`, [opp.id, p3.rating]);
    const mo = await mm2(db, opp);
    assert.equal(mo.opponent.id, a.id);
    assert.deepEqual(mo.opponent.ghost_rounds, [T, S(420), S(410)]);
  });

  await test('8 match snapshot is immutable after assignment', async () => {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]); // S1
    const e = await player(db);
    const m = await mm2(db, e);
    assert.equal(m.opponent.id, b.id);
    // B plays again and gets a new snapshot S2 while E's match is still open.
    await q(db, `update profiles set rating = 3000 where id = $1`, [b.id]);
    await recordGhost(db, b, [S(100), S(2400), S(110)]);
    assert.deepEqual((await profile(db, b.id)).ghost_snapshot.rounds[0], S(100));
    // Against S1: 350 < 400 wins, S1 round 2 is EARLY -> 2-0 in two rounds.
    // Against S2 the same two rounds would be 1-1 and need a third round.
    const s = await settle2(db, e, m.match_id, [S(350), S(350)]);
    assert.deepEqual([s.result, s.score_player, s.score_opponent], ['win', 2, 0]);
    assert.deepEqual((await matchRow(db, m.match_id)).opponent_snapshot.rounds, [S(400), E, S(300)]);
  });

  await test('9 forfeit never updates the ghost (forfeit RPC and V1 compat path)', async () => {
    const db = await freshV2();
    const a = await player(db);
    await recordGhost(db, a, [S(400), S(500), S(300)]);
    const snap = (await profile(db, a.id)).ghost_snapshot;
    const before = await profile(db, a.id);
    const m1 = await mm2(db, a);
    const f1 = await ok(db, 'pvp_forfeit_match', { p_device_key: a.key, p_match_id: m1.match_id });
    assert.equal(f1.result, 'loss');
    const m2 = await mm2(db, a);
    const f2 = await ok(db, 'pvp_submit_match', {
      p_device_key: a.key, p_opponent_id: m2.match_id, p_opponent_is_bot: m2.opponent.is_bot,
      p_player_rounds: [null, null, null], p_opponent_rounds: [300, 300, 300],
      p_score_player: 0, p_score_opponent: 2, p_result: 'loss', p_character_id: 2,
    });
    assert.equal(f2.result, 'loss');
    const after = await profile(db, a.id);
    assert.deepEqual(after.ghost_snapshot, snap);
    assert.deepEqual(after.ghost_replay_snapshot, before.ghost_replay_snapshot);
    assert.equal(after.losses, before.losses + 2);
  });

  await test('10 duplicate submit is idempotent (same settlement, rating once, ghost unchanged)', async () => {
    const db = await freshV2();
    const a = await player(db);
    const { m, s } = await recordGhost(db, a, [S(400), S(500), S(300)]);
    const snap = (await profile(db, a.id)).ghost_snapshot;
    const dup = await settle2(db, a, m.match_id, [S(81), S(81), S(81)]);
    assert.equal(dup.already_completed, true);
    for (const k of ['rating_before', 'rating_after', 'rating_delta', 'result', 'score_player', 'score_opponent']) {
      assert.equal(dup[k], s[k], k);
    }
    const p = await profile(db, a.id);
    assert.equal(p.rating, s.rating_after);
    assert.equal(p.wins, 1);
    assert.deepEqual(p.ghost_snapshot, snap);
    // Garbage payload on a settled match still answers with the stored settlement.
    assert.equal((await settle2(db, a, m.match_id, [{ outcome: 'bang' }])).already_completed, true);
  });

  await test('11a legacy V1 client: unchanged shapes, SHOT-only opponents, 3 shots -> snapshot', async () => {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]); // not representable for V1
    const v1 = await player(db);
    const m = await ok(db, 'pvp_matchmake', { p_device_key: v1.key });
    assert.equal(m.opponent.is_bot, true, 'V1 client is never given a non-SHOT snapshot');
    assert.equal('ghost_rounds' in m.opponent, false);
    assert.equal('ghost_version' in m, false);
    assert.ok(m.opponent.sample_ms.every(Number.isInteger));
    const s = await ok(db, 'pvp_submit_match', {
      p_device_key: v1.key, p_opponent_id: m.match_id, p_opponent_is_bot: true,
      p_player_rounds: [400, 500, 300], p_opponent_rounds: m.opponent.sample_ms,
      p_score_player: 2, p_score_opponent: 1, p_result: 'win', p_character_id: 1,
    });
    assert.deepEqual([s.result, s.rating_delta], ['win', 16], 'V1 scoring + Elo unchanged');
    assert.deepEqual((await profile(db, v1.id)).ghost_snapshot.rounds, [S(400), S(500), S(300)]);
    // An all-SHOT snapshot is offered to V1 clients with exact sample_ms.
    const v1b = await player(db);
    const m2 = await ok(db, 'pvp_matchmake', { p_device_key: v1b.key });
    assert.equal(m2.opponent.id, v1.id);
    assert.deepEqual(m2.opponent.sample_ms, [400, 500, 300]);
    // V1 null rounds are ambiguous (EARLY vs TIMEOUT): no snapshot from them.
    const v1c = await player(db, 2000);
    const m3 = await ok(db, 'pvp_matchmake', { p_device_key: v1c.key });
    await ok(db, 'pvp_submit_match', {
      p_device_key: v1c.key, p_opponent_id: m3.match_id, p_opponent_is_bot: true,
      p_player_rounds: [100, null, 100], p_opponent_rounds: m3.opponent.sample_ms,
      p_score_player: 2, p_score_opponent: 1, p_result: 'win', p_character_id: 1,
    });
    assert.equal((await profile(db, v1c.id)).ghost_snapshot, null);
  });

  await test('11b V1 submit on a non-SHOT snapshot match is refused (forfeit still allowed)', async () => {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]);
    const e = await player(db);
    const m = await mm2(db, e);
    const base = { p_device_key: e.key, p_opponent_id: m.match_id, p_opponent_is_bot: false,
      p_opponent_rounds: [400, 280, 300], p_score_player: 2, p_score_opponent: 0, p_result: 'win', p_character_id: 1 };
    await fails(db, 'pvp_submit_match', { ...base, p_player_rounds: [350, null, 200] }, /match_requires_ghost_v2_client/);
    assert.equal((await matchRow(db, m.match_id)).status, 'assigned');
    const f = await ok(db, 'pvp_submit_match', { ...base, p_player_rounds: [null, null, null], p_result: 'loss' });
    assert.equal(f.result, 'loss');
  });

  await test('11c donor remote shape: legacy ghost_samples kept, not converted, not matched', async () => {
    const db = await openDb([read('tests/fixtures/donor-era-remote.sql')]);
    const k = newKey();
    const me = await ok(db, 'pvp_login_device', { p_device_key: k });
    const [bot] = await q(db, `select id from profiles where is_bot order by rating limit 1`);
    await ok(db, 'pvp_submit_match', { p_device_key: k, p_opponent_id: bot.id, p_opponent_is_bot: true,
      p_player_rounds: [300, 260, 240], p_opponent_rounds: [300, 300, 300],
      p_score_player: 0, p_score_opponent: 0, p_result: 'win', p_character_id: 2 });
    await db.exec(RECONCILE);
    const legacy = (await profile(db, me.id)).ghost_samples;
    assert.deepEqual(legacy, [300, 260, 240], 'reconcile imported it as a legacy ghost');
    await db.exec(GHOST_V2);
    const p = await profile(db, me.id);
    assert.deepEqual(p.ghost_samples, legacy, 'legacy column untouched');
    assert.equal(p.ghost_snapshot, null, 'not guessed into V2');
    const other = await player(db);
    await q(db, `update profiles set rating = $2 where id = $1`, [other.id, p.rating]);
    const m = await mm2(db, other);
    assert.equal(m.opponent.is_bot, true, 'seeded bot fallback, not the legacy human');
    assert.equal(m.opponent.ghost_rounds.length, 3);
  });

  await test('11d capability + history are additive', async () => {
    const db = await freshV2();
    const caps = await ok(db, 'pvp_capabilities', {});
    assert.deepEqual(caps, { contract: 'v3-baseline-20260927', ranked_submit_idempotent: true, forfeit_rpc: true,
      device_key_hash: true, ghost_snapshot_v2: true, history_rounds: true, ghost_contract: 'ghost-v2-final-20260928',
      ghost_outcomes: ['shot', 'early', 'timeout', 'invalid'], reaction_valid_ms: [80, 2499] });
    const a = await player(db);
    const { m } = await recordGhost(db, a, [T, S(400), S(300)]);
    const [h] = await ok(db, 'pvp_history', { p_device_key: a.key, limit_count: 8 });
    for (const k of ['id', 'opponent_name', 'opponent_character_id', 'result', 'score_player', 'score_opponent', 'rating_delta', 'completed_at']) {
      assert.ok(k in h, 'kept ' + k);
    }
    assert.equal(h.id, m.match_id);
    assert.equal(h.ghost_version, 2);
    assert.deepEqual(h.player_rounds, [null, 400, 300]);
    assert.deepEqual(h.player_round_detail, [T, S(400), S(300)]);
    assert.deepEqual(h.opponent_rounds, [S(430), S(470), S(450)]);
  });

  await test('12 invalid outcome rejected (match stays assigned, rating untouched)', async () => {
    const db = await freshV2();
    const a = await player(db);
    const m = await mm2(db, a);
    const bad = [
      [{ outcome: 'bang', reaction_ms: null }, S(200), S(200)],
      [{ outcome: 'SHOT', reaction_ms: 200 }, S(200), S(200)],
      [{ reaction_ms: 200 }, S(200), S(200)],
      [{ outcome: 'shot', reaction_ms: 200, forged: true }, S(200), S(200)],
      [],
      [S(200), S(200), S(200), S(200)],
      'not-an-array',
    ];
    for (const rounds of bad) {
      await fails(db, 'pvp_submit_match_v2', { p_device_key: a.key, p_match_id: m.match_id, p_rounds: rounds }, /invalid_rounds/);
    }
    assert.equal((await matchRow(db, m.match_id)).status, 'assigned');
    assert.equal((await profile(db, a.id)).rating, 1000);
  });

  await test('13 invalid reactionMs rejected', async () => {
    const db = await freshV2();
    const a = await player(db);
    const m = await mm2(db, a);
    const bad = [
      [S(79), S(200), S(200)], [S(2500), S(200), S(200)], [S(243.5), S(200), S(200)],
      [{ outcome: 'shot', reaction_ms: null }, S(200), S(200)], [{ outcome: 'shot', reaction_ms: '200' }, S(200), S(200)],
      [{ outcome: 'early', reaction_ms: 0 }, S(200), S(200)], [{ outcome: 'timeout', reaction_ms: 2500 }, S(200), S(200)],
      [S(-5), S(200), S(200)],
    ];
    for (const rounds of bad) {
      await fails(db, 'pvp_submit_match_v2', { p_device_key: a.key, p_match_id: m.match_id, p_rounds: rounds }, /invalid_rounds/);
    }
    // Boundaries are valid.
    const s = await settle2(db, a, m.match_id, [S(80), S(2499), S(81)]);
    assert.equal(s.already_completed, false);
  });

  // Draw fillers (500 vs 500) keep the match undecided, so the score is round 1 alone.
  const round1 = async (db, p, g) => {
    const [r] = await q(db, `select * from pvp_score_rounds_v2($1::jsonb, $2::jsonb)`,
      [JSON.stringify([p, S(500), S(500)]), JSON.stringify([g, S(500), S(500)])]);
    return r.sp === 1 && r.so === 0 ? 'player' : r.sp === 0 && r.so === 1 ? 'opponent' : r.sp === 0 && r.so === 0 ? 'draw' : '?';
  };

  await test('server scoring matrix (every player x ghost outcome)', async () => {
    const db = await freshV2();
    const cases = [
      [E, S(300), 'opponent'], [E, E, 'opponent'], [E, T, 'opponent'],
      [S(200), S(300), 'player'], [S(300), S(200), 'opponent'], [S(250), S(250), 'draw'],
      [S(250), E, 'player'], [S(250), T, 'player'],
      [T, S(300), 'opponent'], [T, E, 'player'], [T, T, 'draw'],
    ];
    for (const [p, g, want] of cases) assert.equal(await round1(db, p, g), want, JSON.stringify([p, g]));
  });

  await test('security: internal ghost helpers are not client-executable; snapshot CHECK enforced', async () => {
    const db = await freshV2();
    for (const [fn, args] of [
      ['pvp_finalize_match_v2', { p_match_id: crypto.randomUUID(), p_rounds: [S(200)] }],
      ['pvp_assign_match', { p_player_id: crypto.randomUUID(), p_version: 2 }],
      ['pvp_score_rounds_v2', { p_player: [S(200)], p_opponent: [S(200)] }],
    ]) {
      await fails(db, fn, args, /permission denied/);
    }
    const a = await player(db);
    await assert.rejects(q(db, `update profiles set ghost_snapshot = '{"version":2}'::jsonb where id = $1`, [a.id]), /profile_ghost_snapshot_valid/);
    const snap = (rounds) => JSON.stringify({ version: 2, source_match_id: crypto.randomUUID(), recorded_at: 'x', rounds });
    await assert.rejects(q(db, `update profiles set ghost_snapshot = $2::jsonb where id = $1`, [a.id, snap([S(200)])]), /profile_ghost_snapshot_valid/);
    await assert.rejects(q(db, `update profiles set ghost_replay_snapshot = $2::jsonb where id = $1`, [a.id, snap([S(200), S(200)])]), /profile_ghost_replay_snapshot_valid/);
  });

  // ------------------------------------------------------------ client modules
  {
    const db = await freshV2();
    const b = await player(db);
    await recordGhost(db, b, [S(400), E, S(300)]);
    const storage = new Map();
    let capsMode = 'v2';
    const mocks = {
      '@react-native-async-storage/async-storage': { __esModule: true, default: {
        getItem: async (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: async (k, v) => { storage.set(k, v); }, removeItem: async (k) => { storage.delete(k); } } },
      'react-native': { Platform: { OS: 'ios' } },
      'expo-secure-store': { getItemAsync: async () => { throw new Error('no'); }, setItemAsync: async () => { throw new Error('no'); } },
      '@/lib/supabase/client': { isSupabaseConfigured: true, getSupabase: () => ({
        rpc: async (name, args = {}) => {
          if (name === 'pvp_capabilities' && capsMode === 'v1') return { data: { contract: 'v3-baseline-20260927', ranked_submit_idempotent: true }, error: null };
          return rpc(db, name, args);
        } }) },
      '@/utils/dailyChallenge': { utcDateKey: () => new Date().toISOString().slice(0, 10), getLocalDaily: async () => { throw new Error('unused'); }, submitLocalDaily: async () => { throw new Error('unused'); } },
      '@/utils/challengeLink': { normalizeChallengeCode: (c) => String(c ?? '').toUpperCase() },
    };
    const makeLoader = () => {
      const cache = {};
      const loadTs = (name) => {
        if (mocks[name]) return mocks[name];
        if (!name.startsWith('@/')) return require(name);
        const base = path.join(root, name.slice(2));
        const file = [base + '.ts', base + '.tsx'].find((f) => fs.existsSync(f));
        if (cache[file]) return cache[file].exports;
        const module = { exports: {} }; cache[file] = module;
        const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
        new Function('module', 'exports', 'require', 'console', out)(module, module.exports, loadTs, { ...console, warn() {} });
        return module.exports;
      };
      return loadTs;
    };

    await test('client: V2 capability -> pvp_matchmake_v2, ghost_rounds parsed, V2 submit settles', async () => {
      const L = makeLoader();
      const api = L('@/lib/supabase/pvpApi');
      const sub = L('@/utils/rankingSubmission');
      const gr = L('@/lib/supabase/ghostRounds');
      const mm = await api.pvpMatchmake();
      assert.equal(mm.ghost_version, 2);
      assert.equal(mm.opponent.id, b.id);
      assert.deepEqual(mm.opponent.ghost_rounds, [G.shot(400), G.early, G.shot(300)]);
      assert.deepEqual(mm.opponent.sample_ms, [400, 280, 300], 'non-SHOT rounds carry the fallback only');
      const records = [
        { playerMs: 349.6, opponentMs: 400, winner: 'player', playerEarly: false, playerTimeout: false },
        { playerMs: 210.2, opponentMs: null, winner: 'player', playerEarly: false, playerTimeout: false },
      ];
      const roundsV2 = gr.playerRoundsForServer(records);
      assert.deepEqual(roundsV2, [S(350), S(210)]);
      const entry = sub.buildRankedSubmission({ matchId: mm.match_id, opponentIsBot: false, playerRounds: [349.6, 210.2, null],
        opponentRounds: mm.opponent.sample_ms, scorePlayer: 2, scoreOpponent: 0, result: 'win', characterId: 3, roundsV2 });
      const out = await sub.submitRankingResult(entry);
      assert.equal(out.status, 'submitted');
      assert.deepEqual([out.settlement.result, out.settlement.score_player, out.settlement.score_opponent], ['win', 2, 0]);
      assert.deepEqual((await matchRow(db, mm.match_id)).player_round_detail, [S(350), S(210)]);
    });

    await test('client: server without ghost_snapshot_v2 -> V1 path unchanged', async () => {
      capsMode = 'v1';
      const L = makeLoader();
      const api = L('@/lib/supabase/pvpApi');
      const sub = L('@/utils/rankingSubmission');
      const mm = await api.pvpMatchmake();
      assert.equal(mm.ghost_version, 1);
      assert.equal(mm.opponent.ghost_rounds, undefined);
      assert.equal(mm.opponent.is_bot, true, 'V1 never gets the non-SHOT human ghost');
      const entry = sub.buildRankedSubmission({ matchId: mm.match_id, opponentIsBot: true, playerRounds: [100.4, 100.2, null],
        opponentRounds: mm.opponent.sample_ms, scorePlayer: 2, scoreOpponent: 0, result: 'win', characterId: 3 });
      assert.equal(entry.roundsV2, undefined);
      assert.equal((await sub.submitRankingResult(entry)).status, 'submitted');
      capsMode = 'v2';
    });

    await test('client: player round mapping (early/timeout/sub-80/over-window)', async () => {
      const gr = makeLoader()('@/lib/supabase/ghostRounds');
      const rec = (o) => ({ playerMs: null, opponentMs: null, winner: 'draw', playerEarly: false, playerTimeout: false, ...o });
      assert.deepEqual(gr.playerRoundForServer(rec({ playerEarly: true })), E);
      assert.deepEqual(gr.playerRoundForServer(rec({ playerTimeout: true })), T);
      assert.deepEqual(gr.playerRoundForServer(rec({ playerMs: 243.42 })), S(243));
      assert.deepEqual(gr.playerRoundForServer(rec({ playerMs: 60 })), { outcome: 'invalid', reaction_ms: 60 }, 'post-BANG <80 is INVALID, not EARLY');
      assert.deepEqual(gr.playerRoundForServer(rec({ playerMs: 2499.7 })), { outcome: 'invalid', reaction_ms: 2500 });
      assert.equal(gr.parseGhostRounds([S(200), E, { outcome: 'shot', reaction_ms: 79 }]), null);
    });
  }

  // ------------------------------------------------------------ ghost engine
  await test('engine: V1 number replay unchanged (ghost fires at recorded ms)', async () => {
    const h = engineHarness();
    toBang(h, 300); h.advance(250); h.api.tap(); h.advance(50);
    assert.equal(h.api.outcome.winner, 'player'); assert.deepEqual(h.fired, [300]);
  });
  await test('engine: SHOT replay fires at recorded reaction', async () => {
    const h = engineHarness();
    toBang(h, G.shot(243)); h.advance(243);
    assert.deepEqual(h.fired, [243]); h.advance(2500);
    assert.equal(h.api.outcome.winner, 'opponent'); assert.equal(h.api.outcome.playerTimeout, true);
  });
  await test('engine: ghost EARLY never fires; player shot wins at once, timeout still wins', async () => {
    let h = engineHarness();
    toBang(h, G.early); h.advance(400); h.api.tap(); h.render();
    assert.equal(h.api.outcome.winner, 'player'); assert.equal(h.api.outcome.opponentFoul, true);
    assert.equal(h.fired.length, 0); assert.equal(h.pending, 0);
    h = engineHarness();
    toBang(h, G.early); h.advance(2500);
    assert.equal(h.api.outcome.winner, 'player'); assert.equal(h.api.outcome.playerTimeout, true);
  });
  await test('engine: ghost TIMEOUT -> shot wins at once, double timeout draws', async () => {
    let h = engineHarness();
    toBang(h, G.timeout); h.advance(700); h.api.tap(); h.render();
    assert.equal(h.api.outcome.winner, 'player'); assert.equal(h.fired.length, 0);
    h = engineHarness();
    toBang(h, G.timeout); h.advance(2500);
    assert.equal(h.api.outcome.winner, 'draw');
  });
  await test('engine: player early loses even against an early ghost', async () => {
    const h = engineHarness();
    h.api.start(G.early); h.render(); h.advance(3000); h.api.tap(); h.render();
    assert.equal(h.api.outcome.playerEarly, true); assert.equal(h.api.outcome.winner, 'opponent');
  });
  await test('engine and server agree on every round outcome pair', async () => {
    const db = await freshV2();
    const pairs = [
      ['early', G.shot(300)], ['early', G.early], ['early', G.timeout],
      [200, G.shot(300)], [300, G.shot(200)], [250, G.shot(250)], [250, G.early], [250, G.timeout],
      ['timeout', G.shot(300)], ['timeout', G.early], ['timeout', G.timeout],
    ];
    for (const [p, g] of pairs) {
      const h = engineHarness();
      if (p === 'early') { h.api.start(g); h.render(); h.advance(3000); h.api.tap(); h.render(); }
      else { toBang(h, g); if (p === 'timeout') h.advance(2500); else { h.advance(p); h.api.tap(); h.advance(2500); } }
      const pw = p === 'early' ? E : p === 'timeout' ? T : S(p);
      const gw = g.outcome === 'shot' ? S(g.reactionMs) : { outcome: g.outcome, reaction_ms: null };
      assert.equal(await round1(db, pw, gw), h.api.outcome.winner, JSON.stringify([p, g]));
    }
  });


  // ------------------------------------------------ 2..3 round snapshots
  await test('V2.1 validator: 2-round and 3-round valid, 1 and 4 rounds rejected', async () => {
    const db = await freshV2();
    const valid = async (rounds) => (await q(db, `select pvp_ghost_snapshot_is_valid($1::jsonb) as v`,
      [JSON.stringify({ version: 2, source_match_id: crypto.randomUUID(), recorded_at: 'x', rounds })]))[0].v;
    assert.equal(await valid([S(241), S(268)]), true);
    assert.equal(await valid([S(241), E, S(255)]), true);
    assert.equal(await valid([S(241)]), false);
    assert.equal(await valid([]), false);
    assert.equal(await valid([S(241), S(241), S(241), S(241)]), false);
  });

  await test('V2.1 2-0 completed match creates a 2-round ghost (latest), 2-1 creates both', async () => {
    const db = await freshV2();
    const a = await player(db);
    let m = await mm2(db, a);
    await settle2(db, a, m.match_id, [S(241), S(268)]); // vs [430,470] -> 2-0
    let p = await profile(db, a.id);
    assert.deepEqual(p.ghost_snapshot.rounds, [S(241), S(268)]);
    assert.equal(p.ghost_snapshot.rounds.length, 2, 'no invented round 3');
    assert.equal(p.ghost_replay_snapshot, null);
    const b = await player(db);
    m = await mm2(db, b);
    await settle2(db, b, m.match_id, [S(241), E, S(255)]); // 2-1
    p = await profile(db, b.id);
    assert.deepEqual(p.ghost_snapshot.rounds, [S(241), E, S(255)]);
    assert.deepEqual(p.ghost_replay_snapshot, p.ghost_snapshot);
  });

  await test('V2.1 incomplete matches never create a ghost', async () => {
    const db = await freshV2();
    const a = await player(db);
    const m = await mm2(db, a);
    // Undecided after two rounds (1-1): not a complete match, rejected.
    await fails(db, 'pvp_submit_match_v2', { p_device_key: a.key, p_match_id: m.match_id, p_rounds: [S(241), S(600)] }, /invalid_round_count/);
    // An assigned match that is never submitted stays without a ghost.
    assert.equal((await matchRow(db, m.match_id)).status, 'assigned');
    assert.equal((await profile(db, a.id)).ghost_snapshot, null);
    // V1 path: a 2-round 1-1 array is finalized by V1 rules but is not a decided match -> no ghost.
    const v1 = await player(db);
    const m1 = await ok(db, 'pvp_matchmake', { p_device_key: v1.key });
    await ok(db, 'pvp_submit_match', { p_device_key: v1.key, p_opponent_id: m1.match_id, p_opponent_is_bot: true,
      p_player_rounds: [200, 900], p_opponent_rounds: m1.opponent.sample_ms,
      p_score_player: 1, p_score_opponent: 1, p_result: 'draw', p_character_id: 1 });
    assert.equal((await profile(db, v1.id)).ghost_snapshot, null);
    // V1 2-0 with two valid shots is complete -> SHOT/SHOT latest snapshot.
    const v2 = await player(db);
    const m2 = await ok(db, 'pvp_matchmake', { p_device_key: v2.key });
    await ok(db, 'pvp_submit_match', { p_device_key: v2.key, p_opponent_id: m2.match_id, p_opponent_is_bot: true,
      p_player_rounds: [200, 210, null], p_opponent_rounds: m2.opponent.sample_ms,
      p_score_player: 2, p_score_opponent: 0, p_result: 'win', p_character_id: 1 });
    assert.deepEqual((await profile(db, v2.id)).ghost_snapshot.rounds, [S(200), S(210)]);
  });

  await test('V2.1 bot rounds never become a human ghost', async () => {
    const db = await freshV2();
    const a = await player(db);
    const { m } = await recordGhost(db, a, [S(400), S(500), S(300)]);
    assert.deepEqual(m.opponent.ghost_rounds, [S(430), S(470), S(450)]);
    const p = await profile(db, a.id);
    assert.deepEqual(p.ghost_snapshot.rounds, [S(400), S(500), S(300)], "the player's own rounds, not the bot's");
    const [{ n }] = await q(db, `select count(*)::int as n from profiles where is_bot and (ghost_snapshot is not null or ghost_replay_snapshot is not null)`);
    assert.equal(n, 0);
  });

  await test('V2.1 history returns only played rounds for a 2-round match', async () => {
    const db = await freshV2();
    const a = await player(db);
    const m = await mm2(db, a);
    await settle2(db, a, m.match_id, [S(241), S(268)]);
    const [h] = await ok(db, 'pvp_history', { p_device_key: a.key, limit_count: 8 });
    assert.deepEqual(h.player_rounds, [241, 268]);
    assert.deepEqual(h.player_round_detail, [S(241), S(268)]);
    assert.deepEqual(h.opponent_rounds, [S(430), S(470)]);
  });

  await test('V2.1 capability keeps old keys and adds ghost_contract', async () => {
    const db = await freshV2();
    const caps = await ok(db, 'pvp_capabilities', {});
    assert.equal(caps.ghost_contract, 'ghost-v2-final-20260928');
    assert.deepEqual(caps.ghost_outcomes, ['shot', 'early', 'timeout', 'invalid']);
    assert.deepEqual(caps.reaction_valid_ms, [80, 2499]);
    for (const k of ['contract', 'ranked_submit_idempotent', 'forfeit_rpc', 'device_key_hash', 'ghost_snapshot_v2', 'history_rounds']) assert.ok(k in caps, k);
  });

  // ------------------------------------------------ reaction contract parity
  {
    const db = await freshV2();
    const cache = {};
    const L = (name) => {
      if (!name.startsWith('@/')) return require(name);
      const file = path.join(root, name.slice(2) + '.ts');
      if (cache[file]) return cache[file].exports;
      const module = { exports: {} }; cache[file] = module;
      const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
      new Function('module', 'exports', 'require', out)(module, module.exports, L);
      return module.exports;
    };
    const GR = L('@/lib/supabase/ghostRounds');
    const RC = L('@/lib/reactionContract');
    const RS = L('@/utils/reactionStats');
    const RP = L('@/lib/supabase/reactionPayload');
    const I = (ms) => ({ outcome: 'invalid', reaction_ms: ms });
    const outcomes = { shot: S(250), early: E, timeout: T, invalid: I(60) };
    const BOUNDARY_TAPS = [79.49, 79.5, 79.51, 80, 80.49, 80.5, 243.49, 243.5, 2498.49, 2498.5, 2499, 2499.49, 2499.5];
    const record = (o) => ({ playerMs: o.playerMs, opponentMs: o.opponentMs, winner: o.winner,
      playerEarly: o.playerEarly, playerTimeout: o.playerTimeout, playerInvalid: o.playerInvalid });
    /** Play one round on the actual engine. tap = raw ms after BANG | 'early' | 'timeout'. */
    const playRound = (scoring, ghost, tap) => {
      const h = engineHarness({ scoring });
      if (tap === 'early') { h.api.start(ghost); h.render(); h.advance(3000); h.api.tap(); h.render(); }
      else {
        toBang(h, ghost);
        if (tap === 'timeout') h.advance(2500);
        else { h.advance(tap); h.api.tap(); h.advance(2500); }
      }
      return { o: h.api.outcome, fired: h.fired };
    };

    await test('contract: 4x4 outcome matrix, client table == SQL (plus shot compare, high INVALID)', async () => {
      const table = {};
      for (const [po, pw] of Object.entries(outcomes)) {
        for (const [go, gw] of Object.entries(outcomes)) {
          const sql = await round1(db, pw, gw);
          assert.equal(GR.scoreGhostRound(pw, gw), sql, `${po} vs ${go}`);
          table[`${po}/${go}`] = sql;
        }
      }
      // Explicit, documented matrix (row = player, column = ghost).
      assert.deepEqual(table, {
        'shot/shot': 'draw', 'shot/early': 'player', 'shot/timeout': 'player', 'shot/invalid': 'player',
        'early/shot': 'opponent', 'early/early': 'opponent', 'early/timeout': 'opponent', 'early/invalid': 'opponent',
        'timeout/shot': 'opponent', 'timeout/early': 'player', 'timeout/timeout': 'draw', 'timeout/invalid': 'player',
        'invalid/shot': 'opponent', 'invalid/early': 'opponent', 'invalid/timeout': 'opponent', 'invalid/invalid': 'opponent',
      });
      for (const [p, g] of [[200, 300], [300, 200], [250, 250]]) {
        assert.equal(GR.scoreGhostRound(S(p), S(g)), await round1(db, S(p), S(g)));
      }
      assert.equal(await round1(db, I(2500), S(2499)), 'opponent', 'INVALID never beats SHOT, even past the window');
      assert.equal(await round1(db, I(0), S(2499)), 'opponent');
    });

    await test('contract: EARLY and INVALID stay distinct end to end', async () => {
      const early = playRound('ghost', G.shot(300), 'early').o;
      const invalid = playRound('ghost', G.shot(300), 60).o;
      assert.deepEqual([early.playerEarly, early.playerInvalid], [true, false]);
      assert.deepEqual([invalid.playerEarly, invalid.playerInvalid], [false, true]);
      assert.ok(Math.abs(invalid.playerMs - 60) < 1e-6, 'raw kept');
      assert.deepEqual(GR.playerRoundForServer(record(early)), E);
      assert.deepEqual(GR.playerRoundForServer(record(invalid)), I(60));
      const [{ a, b }] = await q(db, `select pvp_ghost_round_is_valid($1::jsonb) a, pvp_ghost_round_is_valid($2::jsonb) b`,
        [JSON.stringify(E), JSON.stringify(I(60))]);
      assert.deepEqual([a, b], [true, true]);
      for (const bad of [I(80), I(2499), { outcome: 'invalid', reaction_ms: null }, I(10001), I(-1), I(60.5)]) {
        const [{ v }] = await q(db, `select pvp_ghost_round_is_valid($1::jsonb) v`, [JSON.stringify(bad)]);
        assert.equal(v, false, JSON.stringify(bad));
      }
    });

    await test('contract: boundary classification (normalizedMs = Math.round(rawMs), valid 80..2499)', async () => {
      const expected = {
        79.49: I(79), 79.5: S(80), 79.51: S(80), 80: S(80), 80.49: S(80), 80.5: S(81),
        2498.49: S(2498), 2498.5: S(2499), 2499: S(2499), 2499.49: S(2499), 2499.5: I(2500),
      };
      for (const [raw, wire] of Object.entries(expected)) {
        const got = RC.playerRoundWire({ early: false, timeout: false, rawMs: Number(raw) });
        assert.deepEqual(got, wire, raw);
        const [{ v }] = await q(db, `select pvp_ghost_round_is_valid($1::jsonb) v`, [JSON.stringify(got)]);
        assert.equal(v, true, 'server accepts ' + raw);
        // Server integer rule gives the same class as the client for the wire value.
        const [{ ok: srv }] = await q(db, `select ($1::int between 80 and 2499) as ok`, [RP.normalizeReactionMsForServer(Number(raw))]);
        assert.equal(srv, wire.outcome === 'shot', 'range ' + raw);
      }
    });

    await test('RANKED parity: engine verdict == SQL settlement at every boundary', async () => {
      const ghosts = [G.shot(80), G.shot(81), G.shot(243), G.shot(244), G.shot(2499), G.early, G.timeout,
        { outcome: 'invalid', reactionMs: 60 }];
      for (const g of ghosts) {
        for (const t of [...BOUNDARY_TAPS, 'early', 'timeout']) {
          const { o } = playRound('ghost', g, t);
          const server = await round1(db, GR.playerRoundForServer(record(o)), GR.ghostReplayWire(g));
          assert.equal(o.winner, server, `tap ${t} vs ${JSON.stringify(g)}`);
          if (typeof t === 'number') assert.ok(Math.abs(o.playerMs - t) < 1e-6, 'raw reaction preserved');
        }
      }
    });

    // Daily / Friend: server = pvp_submit_daily / pvp_submit_friend_challenge (recalculation).
    // Rounds 2 and 3 are draws (500 vs 500), so the settlement is round 1 alone.
    const verdictOf = (res) => (res.score_player === 1 && res.score_opponent === 0 ? 'player'
      : res.score_player === 0 && res.score_opponent === 1 ? 'opponent'
      : res.score_player === 0 && res.score_opponent === 0 ? 'draw' : '?');
    const sentRound = (o) => (o.playerEarly || o.playerTimeout ? null : RP.normalizeReactionMsForServer(o.playerMs));
    const DF_TAPS = [79.49, 79.5, 80, 243.49, 243.5, 2499.49, 2499.5, 'early', 'timeout'];

    await test('DAILY parity: engine sample verdict == pvp_submit_daily at boundaries', async () => {
      for (const sample of [243, 80, 2499]) {
        for (const t of DF_TAPS) {
          const p = await player(db);
          await ok(db, 'pvp_get_daily', { p_device_key: p.key });
          await q(db, `update daily_challenges set sample_ms = array[$1::int, 500, 500] where challenge_date = (timezone('utc', now()))::date`, [sample]);
          const { o } = playRound('sample', sample, t);
          const res = await ok(db, 'pvp_submit_daily', { p_device_key: p.key, p_player_rounds: [sentRound(o), 500, 500],
            p_score_player: 0, p_score_opponent: 0, p_result: 'draw', p_shared: false });
          assert.equal(o.winner, verdictOf(res), `daily sample ${sample} tap ${t}`);
        }
      }
    });

    await test('FRIEND parity: engine sample verdict == pvp_submit_friend_challenge at boundaries', async () => {
      for (const sample of [243, 80, 2499]) {
        const creator = await player(db);
        const fc = await ok(db, 'pvp_create_friend_challenge', { p_device_key: creator.key, p_sample_ms: [sample, 500, 500],
          p_score_creator: 0, p_creator_avg_ms: null, p_creator_best_ms: null, p_character_id: 1 });
        assert.deepEqual(fc.sample_ms, [sample, 500, 500]);
        for (const t of DF_TAPS) {
          const p = await player(db);
          const { o } = playRound('sample', sample, t);
          const res = await ok(db, 'pvp_submit_friend_challenge', { p_device_key: p.key, p_code: fc.code,
            p_player_rounds: [sentRound(o), 500, 500], p_score_player: 0, p_score_creator: 0, p_result: 'draw' });
          const v = res.score_player === 1 && res.score_creator === 0 ? 'player'
            : res.score_player === 0 && res.score_creator === 1 ? 'opponent'
            : res.score_player === 0 && res.score_creator === 0 ? 'draw' : '?';
          assert.equal(o.winner, v, `friend sample ${sample} tap ${t}`);
          if (o.playerInvalid) assert.notEqual(res.best_ms, RP.normalizeReactionMsForServer(o.playerMs), 'invalid is not a best time');
        }
      }
      // A 2500 sample is clamped to the valid range at creation.
      const c2 = await player(db);
      const fc2 = await ok(db, 'pvp_create_friend_challenge', { p_device_key: c2.key, p_sample_ms: [2500, 60, 300],
        p_score_creator: 0, p_creator_avg_ms: 2500, p_creator_best_ms: 60, p_character_id: 1 });
      assert.deepEqual(fc2.sample_ms, [2499, 80, 300]);
      assert.equal(fc2.creator_avg_ms, null);
      assert.equal(fc2.creator_best_ms, null);
    });

    await test('INVALID never updates best reaction (client stats + server best)', async () => {
      const rec = (o) => ({ playerMs: null, opponentMs: null, winner: 'draw', playerEarly: false, playerTimeout: false, playerInvalid: false, ...o });
      assert.equal(RS.bestPlayerMs([rec({ playerMs: 60, playerInvalid: true }), rec({ playerMs: 243.4 })]), 243.4);
      assert.equal(RS.bestPlayerMs([rec({ playerMs: 60, playerInvalid: true })]), null);
      assert.equal(RS.bestPlayerMs([rec({ playerMs: 79.6 })]), 79.6, 'normalizes to 80: valid');
      assert.equal(RS.bestPlayerMs([rec({ playerMs: 2499.6 })]), null, 'normalizes to 2500: invalid');
      assert.equal(RS.averagePlayerMs([rec({ playerMs: 40 }), rec({ playerMs: 200 }), rec({ playerMs: 300 })]), 250);
      assert.deepEqual(RS.ghostSampleFromRounds([rec({ playerMs: 60, playerInvalid: true }), rec({ playerMs: 250.6 }), rec({ playerEarly: true })], [280, 280, 280]), [280, 251, 280]);
    });

    await test('INVALID is stored in history with its value, never as a speed', async () => {
      const a = await player(db, 700); // away from other test ghosts
      const m = await mm2(db, a);
      assert.equal(m.opponent.is_bot, true);
      const [s0, s1, s2] = m.opponent.sample_ms;
      const s = await settle2(db, a, m.match_id, [I(60), S(s1 - 50), S(s2 - 50)]);
      assert.deepEqual([s.result, s.score_player, s.score_opponent], ['win', 2, 1]);
      void s0;
      const [h] = await ok(db, 'pvp_history', { p_device_key: a.key, limit_count: 1 });
      assert.deepEqual(h.player_round_detail, [I(60), S(s1 - 50), S(s2 - 50)]);
      assert.deepEqual(h.player_rounds, [null, s1 - 50, s2 - 50], 'legacy speed array has no value for INVALID');
      assert.deepEqual((await profile(db, a.id)).ghost_replay_snapshot.rounds[0], I(60));
    });

    await test('INVALID ghost round does not fire; player wins the round', async () => {
      let r = playRound('ghost', { outcome: 'invalid', reactionMs: 60 }, 'timeout');
      assert.equal(r.fired.length, 0); assert.equal(r.o.winner, 'player'); assert.equal(r.o.opponentFoul, true);
      r = playRound('ghost', { outcome: 'invalid', reactionMs: 60 }, 300);
      assert.equal(r.fired.length, 0); assert.equal(r.o.winner, 'player');
      r = playRound('ghost', { outcome: 'invalid', reactionMs: 60 }, 60); // player foul still loses
      assert.equal(r.o.winner, 'opponent');
    });

    await test('old client never receives a snapshot with INVALID (or any non-SHOT) round', async () => {
      const db2 = await freshV2();
      const g = await player(db2);
      const snap = { version: 2, source_match_id: crypto.randomUUID(), recorded_at: '2026-09-28T00:00:00.000000Z', rounds: [S(243), I(60), S(250)] };
      await q(db2, `update profiles set ghost_snapshot = $2::jsonb, ghost_replay_snapshot = $2::jsonb where id = $1`, [g.id, JSON.stringify(snap)]);
      for (let i = 0; i < 4; i++) {
        const v1 = await player(db2);
        assert.equal((await ok(db2, 'pvp_matchmake', { p_device_key: v1.key })).opponent.is_bot, true);
      }
      const v2 = await player(db2);
      const m = await mm2(db2, v2);
      assert.equal(m.opponent.id, g.id);
      assert.deepEqual(m.opponent.ghost_rounds, [S(243), I(60), S(250)]);
    });

    await test('full ranked submission settles exactly what the screen showed', async () => {
      const db3 = await freshV2();
      const g = await player(db3);
      const snap = { version: 2, source_match_id: crypto.randomUUID(), recorded_at: '2026-09-28T00:00:00.000000Z', rounds: [S(243), E, S(81)] };
      await q(db3, `update profiles set ghost_snapshot = $2::jsonb, ghost_replay_snapshot = $2::jsonb where id = $1`, [g.id, JSON.stringify(snap)]);
      const p = await player(db3);
      const m = await mm2(db3, p);
      assert.equal(m.opponent.id, g.id);
      const replay = [G.shot(243), G.early, G.shot(81)];
      const taps = [243.49, 60, 80.5]; // draw, invalid (lost even vs an early ghost), 81=81 draw
      const records = taps.map((t, i) => record(playRound('ghost', replay[i], t).o));
      assert.deepEqual(records.map((r) => r.winner), ['draw', 'opponent', 'draw']);
      const s = await settle2(db3, p, m.match_id, GR.playerRoundsForServer(records));
      assert.deepEqual([s.result, s.score_player, s.score_opponent], ['loss', 0, 1]);
    });
  }

  await test('verify SQL: 0 FAIL after V2 (fresh and donor-remote), FAIL before V2, read-only', async () => {
    const VERIFY_V2 = read('supabase/ops/20260928_ghost_v2_post_deploy_verify.sql');
    const run = async (db) => {
      await db.exec('begin transaction read only');
      try { return (await db.query(VERIFY_V2)).rows; } finally { await db.exec('rollback'); }
    };
    const count = (rows, st) => rows.filter((r) => r.status === st).length;
    const fresh = await run(await freshV2());
    assert.equal(count(fresh, 'FAIL') + count(fresh, 'WARN'), 0, JSON.stringify(fresh.filter((r) => r.status !== 'PASS' && r.status !== 'INFO')));
    const donor = await run(await openDb([read('tests/fixtures/donor-era-remote.sql'), RECONCILE, GHOST_V2]));
    assert.equal(count(donor, 'FAIL') + count(donor, 'WARN'), 0);
    const before = await run(await openDb([read('tests/fixtures/donor-era-remote.sql'), RECONCILE]));
    assert.ok(count(before, 'FAIL') > 0, 'detects a database without Ghost V2');
  });

  console.log(passed + ' ghost snapshot v2 checks passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
