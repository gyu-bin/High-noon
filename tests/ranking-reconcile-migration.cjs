// Real-Postgres validation of supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql
// using PGlite (PostgreSQL 17 compiled to WASM, with pgcrypto).
//
//   donor-era fixture (tests/fixtures/donor-era-remote.sql) -> reconcile -> V3 contract
//   repository baseline (20260830/0831/0907)                 -> reconcile -> V3 contract
//   Step 1 client (pvpApi + rankingSubmission)               -> reconciled database
//
// RPCs are invoked the way PostgREST does it: arguments bound by name through
// json_to_record, executed as the `anon` role.
//
// PGlite is not a project dependency. Run with:
//   npm i --no-save @electric-sql/pglite@0.3 && node tests/ranking-reconcile-migration.cjs
// or point PGLITE_DIR at a folder where it is installed.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const pgliteDir = process.env.PGLITE_DIR ? path.join(process.env.PGLITE_DIR, 'node_modules') : undefined;
const load = (id) => require(pgliteDir ? require.resolve(id, { paths: [pgliteDir] }) : id);
const { PGlite } = load('@electric-sql/pglite');
const { pgcrypto } = load('@electric-sql/pglite/contrib/pgcrypto');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const RECONCILE = read('supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql');
const DONOR = read('tests/fixtures/donor-era-remote.sql');
const BACKUP = read('supabase/ops/20260927_pre_deploy_backup.sql');
const VERIFY = read('supabase/ops/20260927_post_deploy_verify.sql');
const SUPABASE_PLATFORM = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const newKey = () => crypto.randomBytes(32).toString('hex');
const sha256Hex = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

async function openDb(sqlParts) {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  for (const sql of sqlParts) await db.exec(sql);
  return db;
}

const q = async (db, sql, params = []) => (await db.query(sql, params)).rows;

/** PostgREST-style RPC: named-argument binding through json_to_record, as `anon`. */
async function rpc(db, name, args = {}, role = 'anon') {
  const meta = await q(db, `
    select coalesce(p.proargnames, '{}') as names,
           array(select format_type(t, null) from unnest(p.proargtypes) t) as types
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [name]);
  if (meta.length === 0) {
    return { data: null, error: { message: `Could not find the function public.${name}` } };
  }
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

const submitArgs = (key, matchRef, rounds, claimed = 'win') => ({
  p_device_key: key, p_opponent_id: matchRef, p_opponent_is_bot: false,
  p_player_rounds: rounds, p_opponent_rounds: [300, 300, 300],
  p_score_player: 2, p_score_opponent: 0, p_result: claimed, p_character_id: 2,
});

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

const donorSubmit = (key, opponentId, rounds, result) => ({
  p_device_key: key, p_opponent_id: opponentId, p_opponent_is_bot: false,
  p_player_rounds: rounds, p_opponent_rounds: [300, 300, 300],
  p_score_player: 0, p_score_opponent: 0, p_result: result, p_character_id: 2,
});

/**
 * Real-remote-shaped database with realistic existing data:
 * 20 seeded bots, humans with device keys, a real 3-round human ghost (k2),
 * a padded donor ghost (k4), a legacy human-vs-human match (k1 vs k2),
 * a friend challenge and a daily completion.
 */
async function donorWithData() {
  const db = await openDb([DONOR]);
  const keys = { k1: newKey(), k2: newKey(), k3: newKey(), k4: newKey(), k5: newKey() };
  const ids = {};
  for (const [name, key] of Object.entries(keys)) {
    ids[name] = (await ok(db, 'pvp_login_device', { p_device_key: key })).id;
  }
  const [bot] = await q(db, `select id from profiles where is_bot order by rating limit 1`);
  await ok(db, 'pvp_submit_match', donorSubmit(keys.k2, bot.id, [300, 260, 240], 'win'));
  await ok(db, 'pvp_submit_match', donorSubmit(keys.k4, bot.id, [250, null, null], 'loss'));
  await ok(db, 'pvp_submit_match', donorSubmit(keys.k1, ids.k2, [210, 220, null], 'win'));
  await q(db, `update profiles set rating = 1250, wins = 7, losses = 3, character_id = 3 where id = $1`, [ids.k1]);
  await q(db, `update profiles set rating = 650, wins = 1, losses = 4 where id = $1`, [ids.k2]);
  await q(db, `update profiles set rating = 1100, wins = 2, losses = 2 where id = $1`, [ids.k3]);
  await q(db, `update profiles set rating = 1050 where id = $1`, [ids.k4]);
  await q(db, `update profiles set rating = 800 where id = $1`, [ids.k5]);
  const friend = await ok(db, 'pvp_create_friend_challenge', {
    p_device_key: keys.k2, p_sample_ms: [300, 300, 300], p_score_creator: 2,
    p_creator_avg_ms: 300, p_creator_best_ms: 290, p_character_id: 1,
  });
  await ok(db, 'pvp_get_daily', { p_device_key: keys.k3 });
  await ok(db, 'pvp_submit_daily', {
    p_device_key: keys.k3, p_player_rounds: [200, 200, 200],
    p_score_player: 2, p_score_opponent: 0, p_result: 'win', p_shared: false,
  });
  return { db, keys, ids, friendCode: friend.code };
}

const profileSnapshot = (db) =>
  q(db, `select id, display_name, character_id, rating, rank_tier, wins, losses, is_bot, created_at
         from profiles order by id`);
const ghostOf = async (db, id) =>
  (await q(db, `select ghost_samples from profiles where id = $1`, [id]))[0].ghost_samples;

(async () => {
  await test('fixture reproduces the real remote (backup-generated) state', async () => {
    const { db, ids } = await donorWithData();
    const has = async (rel) => (await q(db, `select to_regclass($1) as r`, [rel]))[0].r !== null;
    assert.equal(await has('public.pvp_matches'), false);
    assert.equal(await has('public.matches'), true);
    assert.equal(await has('public.ghost_loads'), true);
    const cols = (await q(db, `select column_name from information_schema.columns
      where table_schema='public' and table_name in ('profiles','device_identities')`)).map((r) => r.column_name);
    assert.ok(cols.includes('device_key') && !cols.includes('device_key_hash'));
    assert.ok(!cols.includes('ghost_samples') && !cols.includes('alias_changed_at'));
    assert.match((await rpc(db, 'pvp_capabilities')).error.message, /Could not find/);
    const [{ n }] = await q(db, `select count(*)::int as n from profiles where is_bot`);
    assert.equal(n, 20);
    const padded = async (id) => (await q(db, `select sample_ms from ghost_loads where user_id = $1`, [id]))[0].sample_ms;
    assert.deepEqual(await padded(ids.k4), [250, 250, 250], 'donor pads a 1-round record');
    assert.deepEqual(await padded(ids.k1), [210, 220, 220], 'donor pads a 2-round record');
  });

  await test('donor-era holes are real in the fixture (not tested on production)', async () => {
    const { db, keys, ids } = await donorWithData();
    await db.exec('set role anon');
    await q(db, `update public.leaderboard set rating = 9999 where id = $1`, [ids.k1]);
    await db.exec('reset role');
    assert.equal((await q(db, `select rating from profiles where id = $1`, [ids.k1]))[0].rating, 9999);
    const before = (await q(db, `select rating from profiles where id = $1`, [ids.k3]))[0].rating;
    const [bot] = await q(db, `select id from profiles where is_bot limit 1`);
    await ok(db, 'pvp_submit_match', donorSubmit(keys.k3, bot.id, [400, 400, null], 'loss'));
    const once = (await q(db, `select rating from profiles where id = $1`, [ids.k3]))[0].rating;
    await ok(db, 'pvp_submit_match', donorSubmit(keys.k3, bot.id, [400, 400, null], 'loss'));
    const twice = (await q(db, `select rating from profiles where id = $1`, [ids.k3]))[0].rating;
    assert.ok(once < before && twice < once, 'donor submit applies rating on every call');
    assert.equal((await rpc(db, 'seed_ranking_bots')).error, null, 'anon can run seed_ranking_bots');
  });

  const { db, keys, ids, friendCode } = await donorWithData();
  const before = await profileSnapshot(db);
  const beforeDaily = await q(db, `select * from daily_completions order by profile_id`);
  const beforeFriend = await q(db, `select * from friend_challenges order by code`);
  const beforeGhostLoads = await q(db, `select * from ghost_loads order by user_id`);
  const beforeMatches = await q(db, `select * from matches order by id`);
  const preBackup = await q(db, BACKUP);
  const preVerify = await q(db, VERIFY);
  await db.exec(RECONCILE);

  await test('pre-deploy backup runs on the donor state and captures donor bodies', async () => {
    const defs = preBackup.filter((r) => r.section === 'function_def').map((r) => r.object);
    assert.ok(defs.some((o) => o.startsWith('pvp_submit_match(')));
    assert.ok(defs.some((o) => o.startsWith('seed_ranking_bots(')));
    assert.ok(preBackup.some((r) => r.section === 'policy' && r.object.startsWith('profiles.')));
  });

  await test('post-deploy verification: FAIL before, all PASS after, fingerprint unchanged', async () => {
    assert.ok(preVerify.some((r) => r.status === 'FAIL'));
    const post = await q(db, VERIFY);
    const bad = post.filter((r) => r.status === 'FAIL' || r.status === 'WARN');
    assert.deepEqual(bad, [], JSON.stringify(bad, null, 1));
    const fp = (rows, key) => rows.find((r) => (r.object ?? r.obj) === key && (r.section ?? r.chk) === 'fingerprint');
    assert.equal(fp(post, 'profiles').detail, fp(preBackup, 'profiles').detail);
    assert.equal(fp(post, 'device_identities').detail, fp(preBackup, 'device_identities').detail);
  });

  await test('migration preserves profiles, donor ghosts, matches, daily, friend data', async () => {
    assert.deepEqual(await profileSnapshot(db), before);
    assert.deepEqual(await q(db, `select * from ghost_loads order by user_id`), beforeGhostLoads);
    assert.deepEqual(await q(db, `select * from matches order by id`), beforeMatches);
    assert.deepEqual(await q(db, `select * from daily_completions order by profile_id`), beforeDaily);
    assert.deepEqual(await q(db, `select * from friend_challenges order by code`), beforeFriend);
    const rows = await q(db, `select alias_changed_at from profiles`);
    assert.ok(rows.every((r) => r.alias_changed_at === null));
  });

  await test('human ghosts: real 3-round record imported; padded and bot records not', async () => {
    assert.deepEqual(await ghostOf(db, ids.k2), [300, 260, 240]);
    assert.equal(await ghostOf(db, ids.k4), null, 'padded [250,250,250] is not a 3-round duel');
    assert.equal(await ghostOf(db, ids.k1), null);
    const [{ n }] = await q(db, `select count(*)::int as n from profiles where is_bot and ghost_samples is not null`);
    assert.equal(n, 0, 'bots stay explicit bots via ghost_loads');
  });

  await test('rating_to_rank_tier(r) is kept (parameter name cannot change)', async () => {
    const [{ names }] = await q(db, `select proargnames as names from pg_proc where proname = 'rating_to_rank_tier'`);
    assert.deepEqual(names, ['r']);
  });

  await test('device hash backfill equals client/server sha256 hex; plaintext kept', async () => {
    const rows = await q(db, `select device_key, device_key_hash from device_identities where device_key is not null`);
    assert.equal(rows.length, 5);
    for (const r of rows) assert.equal(r.device_key_hash, sha256Hex(r.device_key));
    const pk = await q(db, `select a.attname from pg_constraint c join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.conrelid = 'public.device_identities'::regclass and c.contype = 'p'`);
    assert.deepEqual(pk.map((r) => r.attname), ['device_key_hash']);
  });

  await test('existing device keeps its profile (continuity)', async () => {
    const me = await ok(db, 'pvp_login_device', { p_device_key: keys.k1 });
    assert.equal(me.id, ids.k1);
    assert.equal(me.rating, 1250);
    assert.equal(me.wins, 7);
    assert.equal(me.character_id, 3);
  });

  await test('new install: server-issued key, hash-only identity, no ghost', async () => {
    const issued = await ok(db, 'pvp_issue_device_key');
    assert.match(issued, /^[0-9a-f]{64}$/);
    const me = await ok(db, 'pvp_login_device', { p_device_key: issued });
    assert.equal(me.rating, 1000);
    const [row] = await q(db, `select device_key, device_key_hash from device_identities where profile_id = $1`, [me.id]);
    assert.equal(row.device_key, null);
    assert.equal(row.device_key_hash, sha256Hex(issued));
    assert.equal(await ghostOf(db, me.id), null);
  });

  let matchId;
  await test('no eligible human ghost -> seeded bot opponent (is_bot) with a match_id', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k1 });
    matchId = res.match_id;
    assert.equal(res.opponent.is_bot, true);
    const [m] = await q(db, `select m.status, m.opponent_is_bot, p.is_bot, m.opponent_samples, g.sample_ms
      from pvp_matches m join profiles p on p.id = m.opponent_id
      join ghost_loads g on g.user_id = p.id where m.id = $1`, [matchId]);
    assert.equal(m.status, 'assigned');
    assert.equal(m.opponent_is_bot, true);
    assert.equal(m.is_bot, true);
    assert.deepEqual(m.opponent_samples, m.sample_ms);
  });

  await test('submit rejects float reaction ms (integer[] contract)', async () => {
    await fails(db, 'pvp_submit_match', submitArgs(keys.k1, matchId, [243.42, 250, 260]), /invalid input syntax for type integer/);
  });

  await test('submit is server-authoritative and idempotent; bot rating untouched', async () => {
    const [m] = await q(db, `select opponent_samples, opponent_id from pvp_matches where id = $1`, [matchId]);
    const [{ rating: botBefore }] = await q(db, `select rating from profiles where id = $1`, [m.opponent_id]);
    const slow = m.opponent_samples.map((ms) => ms + 50);
    const first = await ok(db, 'pvp_submit_match', submitArgs(keys.k1, matchId, slow, 'win'));
    assert.equal(first.result, 'loss');
    assert.equal(first.rating_before, 1250);
    const again = await ok(db, 'pvp_submit_match', submitArgs(keys.k1, matchId, [100, 100, 100], 'win'));
    assert.equal(again.already_completed, true);
    assert.equal(again.rating_after, first.rating_after);
    const [{ rating }] = await q(db, `select rating from profiles where id = $1`, [ids.k1]);
    assert.equal(rating, first.rating_after);
    const [{ rating: botAfter }] = await q(db, `select rating from profiles where id = $1`, [m.opponent_id]);
    assert.equal(botAfter, botBefore);
  });

  await test('history merges new pvp_matches with legacy matches', async () => {
    const hist = await ok(db, 'pvp_history', { p_device_key: keys.k1, limit_count: 8 });
    assert.equal(hist[0].id, matchId);
    const legacy = beforeMatches.filter((m) => m.player_id === ids.k1).map((m) => m.id);
    assert.equal(legacy.length, 1);
    assert.ok(hist.some((h) => h.id === legacy[0]), 'legacy match visible');
  });

  await test('a fully recorded 3-round ranked duel creates a human ghost', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k3 });
    assert.equal(res.opponent.is_bot, true);
    const sm = res.opponent.sample_ms;
    const rounds = [sm[0] - 40, sm[1] + 40, sm[2] - 40];
    const s = await ok(db, 'pvp_submit_match', submitArgs(keys.k3, res.match_id, rounds));
    assert.equal(s.result, 'win');
    assert.deepEqual(await ghostOf(db, ids.k3), rounds);
  });

  await test('eligible human ghost is matched; forfeit leaves the forfeiter ghost-less', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k5 });
    assert.equal(res.opponent.is_bot, false);
    assert.equal(res.opponent.id, ids.k2);
    assert.deepEqual(res.opponent.sample_ms, [300, 260, 240]);
    await ok(db, 'pvp_forfeit_match', { p_device_key: keys.k5, p_match_id: res.match_id });
    assert.equal(await ghostOf(db, ids.k5), null);
  });

  await test('legacy client (opponent profile id) settles its single assigned match', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k5 });
    assert.equal(res.opponent.id, ids.k2);
    const s = await ok(db, 'pvp_submit_match', submitArgs(keys.k5, ids.k2, [250, 220, null]));
    assert.equal(s.match_id, res.match_id);
    assert.equal(s.result, 'win');
  });

  await test('legacy ambiguity: several assigned matches vs same opponent -> error, nothing finalized', async () => {
    const a = await ok(db, 'pvp_matchmake', { p_device_key: keys.k5 });
    const b = await ok(db, 'pvp_matchmake', { p_device_key: keys.k5 });
    assert.equal(a.opponent.id, ids.k2);
    assert.equal(b.opponent.id, ids.k2);
    const [{ rating: r0 }] = await q(db, `select rating from profiles where id = $1`, [ids.k5]);
    await fails(db, 'pvp_submit_match', submitArgs(keys.k5, ids.k2, [100, 100, 100]), /legacy_match_ambiguous/);
    const states = await q(db, `select status from pvp_matches where id = any($1::uuid[])`, [[a.match_id, b.match_id]]);
    assert.deepEqual(states.map((r) => r.status), ['assigned', 'assigned']);
    const [{ rating: r1 }] = await q(db, `select rating from profiles where id = $1`, [ids.k5]);
    assert.equal(r1, r0);
    await ok(db, 'pvp_forfeit_match', { p_device_key: keys.k5, p_match_id: a.match_id });
    const s = await ok(db, 'pvp_submit_match', submitArgs(keys.k5, ids.k2, [250, 220, null]));
    assert.equal(s.match_id, b.match_id);
  });

  await test('another player cannot submit or forfeit your match', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k2 });
    await fails(db, 'pvp_submit_match', submitArgs(keys.k1, res.match_id, [150, 150, 150]), /match_not_found_or_expired/);
    await fails(db, 'pvp_forfeit_match', { p_device_key: keys.k1, p_match_id: res.match_id }, /match_not_found_or_expired/);
    await fails(db, 'pvp_forfeit_match', { p_device_key: keys.k5, p_match_id: ids.k2 }, /match_not_found_or_expired/);
    await ok(db, 'pvp_forfeit_match', { p_device_key: keys.k2, p_match_id: res.match_id });
  });

  await test('forfeit RPC: server loss, idempotent, ghost untouched', async () => {
    const ghostBefore = await ghostOf(db, ids.k2);
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k2 });
    const f = await ok(db, 'pvp_forfeit_match', { p_device_key: keys.k2, p_match_id: res.match_id });
    assert.equal(f.result, 'loss');
    const again = await ok(db, 'pvp_forfeit_match', { p_device_key: keys.k2, p_match_id: res.match_id });
    assert.equal(again.already_completed, true);
    assert.equal(again.rating_after, f.rating_after);
    assert.deepEqual(await ghostOf(db, ids.k2), ghostBefore);
  });

  await test('Step 1 null-round forfeit through submit is a server loss', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k4 });
    const s = await ok(db, 'pvp_submit_match', submitArgs(keys.k4, res.match_id, [null, null, null], 'loss'));
    assert.equal(s.result, 'loss');
  });

  await test('device key length is bounded', async () => {
    await fails(db, 'pvp_login_device', { p_device_key: 'short' }, /invalid_device_key/);
    await fails(db, 'pvp_login_device', { p_device_key: 'a'.repeat(300) }, /invalid_device_key/);
  });

  await test('expired assignment is rejected with the terminal error', async () => {
    const res = await ok(db, 'pvp_matchmake', { p_device_key: keys.k3 });
    await q(db, `update pvp_matches set expires_at = now() - interval '1 minute' where id = $1`, [res.match_id]);
    await fails(db, 'pvp_submit_match', submitArgs(keys.k3, res.match_id, [150, 150, 150]), /match_not_found_or_expired/);
    await fails(db, 'pvp_forfeit_match', { p_device_key: keys.k3, p_match_id: res.match_id }, /match_not_found_or_expired/);
    const [{ status }] = await q(db, `select status from pvp_matches where id = $1`, [res.match_id]);
    assert.equal(status, 'assigned', 'expired match left for Step 2A abandonment policy');
  });

  await test('daily: race-safe creation, server recalculation, idempotent', async () => {
    const a = await ok(db, 'pvp_get_daily', { p_device_key: keys.k1 });
    const b = await ok(db, 'pvp_get_daily', { p_device_key: keys.k2 });
    assert.deepEqual(a.sample_ms, b.sample_ms);
    const slow = a.sample_ms.map((ms) => ms + 50);
    const first = await ok(db, 'pvp_submit_daily', {
      p_device_key: keys.k1, p_player_rounds: slow, p_score_player: 2, p_score_opponent: 0,
      p_result: 'win', p_shared: false,
    });
    assert.equal(first.result, 'loss', 'client-claimed win ignored');
    const again = await ok(db, 'pvp_submit_daily', {
      p_device_key: keys.k1, p_player_rounds: [100, 100, 100], p_score_player: 2, p_score_opponent: 0,
      p_result: 'win', p_shared: false,
    });
    assert.equal(again.already_completed, true);
    assert.equal(again.result, 'loss');
    const pre = await ok(db, 'pvp_submit_daily', {
      p_device_key: keys.k3, p_player_rounds: [100, 100, 100], p_score_player: 0, p_score_opponent: 2,
      p_result: 'loss', p_shared: false,
    });
    assert.equal(pre.already_completed, true, 'pre-migration completion survives');
  });

  await test('friend: pre-migration challenge, server recalculation, idempotent', async () => {
    const got = await ok(db, 'pvp_get_friend_challenge', { p_device_key: keys.k1, p_code: friendCode });
    assert.equal(got.completed, false);
    const first = await ok(db, 'pvp_submit_friend_challenge', {
      p_device_key: keys.k1, p_code: friendCode, p_player_rounds: [350, 350, null],
      p_score_player: 2, p_score_creator: 0, p_result: 'win',
    });
    assert.equal(first.result, 'loss');
    const again = await ok(db, 'pvp_submit_friend_challenge', {
      p_device_key: keys.k1, p_code: friendCode, p_player_rounds: [100, 100, 100],
      p_score_player: 2, p_score_creator: 0, p_result: 'win',
    });
    assert.equal(again.already_completed, true);
    await fails(db, 'pvp_submit_friend_challenge', {
      p_device_key: keys.k2, p_code: friendCode, p_player_rounds: [100, 100, 100],
      p_score_player: 2, p_score_creator: 0, p_result: 'win',
    }, /cannot_challenge_self/);
  });

  await test('anon: no direct table access, no legacy/admin/internal RPCs', async () => {
    await db.exec('set role anon');
    for (const t of ['profiles', 'device_identities', 'pvp_matches', 'daily_completions',
      'friend_challenges', 'analytics_app_events', 'app_settings', 'analytics_match_events',
      'matches', 'ghost_loads', 'leaderboard']) {
      await assert.rejects(q(db, `select 1 from public.${t} limit 1`), /permission denied/, t);
    }
    await db.exec('reset role');
    await db.exec('set role anon');
    await assert.rejects(q(db, `update public.leaderboard set rating = 9999 where id = $1`, [ids.k1]), /permission denied/);
    await db.exec('reset role');
    await fails(db, 'seed_ranking_bots', {}, /permission denied/);
    await fails(db, 'ensure_my_profile', {}, /permission denied/);
    await fails(db, 'admin_get_overview', { p_pin: '0000' }, /permission denied/);
    await fails(db, 'pvp_set_cosmetic_npc', { p_device_key: keys.k1, p_cosmetic_npc_id: 3 }, /permission denied/);
    await fails(db, 'pvp_resolve_profile', { p_device_key: keys.k1, p_create: true }, /permission denied/);
    await fails(db, 'pvp_finalize_match', { p_match_id: matchId, p_player_rounds: [1, 1, 1] }, /permission denied/);
    await fails(db, 'pvp_pick_western_alias', { p_exclude_profile_id: null, p_not_equal: null }, /permission denied/);
    const caps = await ok(db, 'pvp_capabilities');
    assert.equal(caps.ranked_submit_idempotent, true);
    await ok(db, 'analytics_record_event', {
      p_device_key: keys.k1, p_event_name: 'game_start', p_app_version: '1.4.2', p_platform: 'ios', p_props: {},
    });
    const profileRow = await ok(db, 'pvp_reroll_display_name', { p_device_key: keys.k1 });
    assert.equal(profileRow.id, ids.k1);
    await fails(db, 'pvp_reroll_display_name', { p_device_key: keys.k1 }, /alias_cooldown/);
  });

  await test('security audit: anon EXECUTE allowlist, definer search_path, no dynamic SQL', async () => {
    const allow = new Set([
      'pvp_issue_device_key', 'pvp_login_device', 'pvp_reroll_display_name', 'pvp_update_profile',
      'pvp_matchmake', 'pvp_submit_match', 'pvp_forfeit_match', 'pvp_leaderboard', 'pvp_history',
      'pvp_capabilities', 'pvp_get_daily', 'pvp_submit_daily', 'pvp_mark_daily_shared',
      'pvp_create_friend_challenge', 'pvp_get_friend_challenge', 'pvp_submit_friend_challenge',
      'analytics_record_event',
    ]);
    const fns = await q(db, `
      select p.proname, p.prosecdef, p.proconfig, p.prosrc,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'`);
    const exposed = fns.filter((f) => f.anon_exec || f.auth_exec).map((f) => f.proname).sort();
    assert.deepEqual(exposed, [...allow].sort(), 'only allowlisted RPCs are client-executable');
    for (const f of fns.filter((x) => x.prosecdef)) {
      assert.ok((f.proconfig ?? []).some((c) => c.startsWith('search_path=')), `${f.proname} pins search_path`);
      if (allow.has(f.proname)) assert.doesNotMatch(f.prosrc, /\bexecute\s+(format|'|\$)/i, `${f.proname} has no dynamic SQL`);
    }
  });

  await test('re-running the migration is safe and changes no data', async () => {
    const snapshot = await profileSnapshot(db);
    const matches = await q(db, `select * from pvp_matches order by id`);
    await db.exec(RECONCILE);
    assert.deepEqual(await profileSnapshot(db), snapshot);
    assert.deepEqual(await q(db, `select * from pvp_matches order by id`), matches);
  });

  await test('fresh database: repository baseline -> reconcile converges', async () => {
    const fresh = await openDb([
      SUPABASE_PLATFORM,
      read('supabase/migrations/20260830_bounty_ranking_v3_base.sql'),
      read('supabase/migrations/20260831_daily_and_profile.sql'),
      read('supabase/migrations/20260907_analytics_events_and_friend_challenge.sql'),
    ]);
    const key = newKey();
    const me = await ok(fresh, 'pvp_login_device', { p_device_key: key });
    const [{ ghost_samples: placeholder }] = await q(fresh, `select ghost_samples from profiles where id = $1`, [me.id]);
    assert.deepEqual(placeholder, [520, 500, 540], '20260830 stamps a placeholder');
    await fresh.exec(RECONCILE);
    const [{ ghost_samples: cleared }] = await q(fresh, `select ghost_samples from profiles where id = $1`, [me.id]);
    assert.equal(cleared, null, 'placeholder is not treated as a human record');
    const m = await ok(fresh, 'pvp_matchmake', { p_device_key: key });
    const s = await ok(fresh, 'pvp_submit_match', submitArgs(key, m.match_id, [150, 150, null]));
    assert.equal(s.result, 'win');
    assert.equal((await ok(fresh, 'pvp_login_device', { p_device_key: key })).id, me.id);
  });

  await test('contract assertion aborts and rolls back on a wrong old schema', async () => {
    const broken = await openDb([DONOR]);
    // Old table with the right name and columns but one wrong type: CREATE TABLE
    // IF NOT EXISTS keeps it, so only the final contract assertion can catch it.
    await broken.exec(`create table public.pvp_matches (
      id uuid primary key default gen_random_uuid(), player_id uuid not null, opponent_id uuid,
      opponent_name text not null, opponent_character_id integer not null, opponent_rating integer not null,
      opponent_rank_tier text not null, opponent_is_bot boolean not null default false,
      opponent_samples integer[] not null, status text not null default 'assigned',
      player_rounds text, score_player integer, score_opponent integer, result text,
      rating_before integer, rating_after integer, rating_delta integer,
      created_at timestamptz not null default now(), expires_at timestamptz not null default now(),
      completed_at timestamptz)`);
    await assert.rejects(broken.exec(RECONCILE), /reconcile contract check failed: pvp_matches\.player_rounds integer\[\]/);
    await broken.exec('rollback'); // SQL Editor ends the session on error
    const cols = await q(broken, `select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='ghost_samples'`);
    assert.equal(cols.length, 0, 'transaction rolled back');
  });

  // ---- Step 1 client modules against the reconciled database ---------------
  const clientKey = keys.k1;
  let dropNext = false;
  const storage = new Map();
  const mocks = {
    '@react-native-async-storage/async-storage': {
      __esModule: true,
      default: {
        getItem: async (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: async (k, v) => { storage.set(k, v); },
        removeItem: async (k) => { storage.delete(k); },
      },
    },
    'react-native': { Platform: { OS: 'ios' } },
    'expo-secure-store': {
      getItemAsync: async () => { throw new Error('no native module'); },
      setItemAsync: async () => { throw new Error('no native module'); },
    },
    '@/lib/supabase/client': {
      isSupabaseConfigured: true,
      getSupabase: () => ({
        rpc: async (name, args = {}) => {
          const res = await rpc(db, name, args);
          if (dropNext && !res.error && name.startsWith('pvp_submit')) {
            dropNext = false;
            return { data: null, error: { message: 'TypeError: Network request failed' } };
          }
          return res;
        },
      }),
    },
    '@/utils/dailyChallenge': {
      utcDateKey: () => new Date().toISOString().slice(0, 10),
      getLocalDaily: async () => { throw new Error('unused'); },
      submitLocalDaily: async () => { throw new Error('unused'); },
    },
    '@/utils/challengeLink': {
      normalizeChallengeCode: (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
    },
  };
  function makeLoader(overrides) {
    const cache = {};
    const all = { ...mocks, ...overrides };
    function loadTs(name) {
      if (all[name]) return all[name];
      if (!name.startsWith('@/')) return require(name);
      const base = path.join(root, name.slice(2));
      const file = [base + '.ts', base + '.tsx'].find((f) => fs.existsSync(f));
      if (cache[file]) return cache[file].exports;
      const module = { exports: {} };
      cache[file] = module;
      const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      }).outputText;
      // `globalThis` is shadowed so the key module can be tested without Web Crypto.
      new Function('module', 'exports', 'require', 'console', 'globalThis', out)(
        module, module.exports, loadTs, { ...console, warn() {} }, { crypto: undefined },
      );
      return module.exports;
    }
    return loadTs;
  }
  const loadTs = makeLoader({ '@/lib/supabase/deviceKey': { getOrCreateDeviceKey: async () => clientKey } });
  const api = loadTs('@/lib/supabase/pvpApi');
  const sub = loadTs('@/utils/rankingSubmission');
  const pending = () => loadTs('@/store/rankingSubmissionStore').useRankingSubmissionStore.getState().pending;

  await test('client: new install without Web Crypto gets a key from pvp_issue_device_key', async () => {
    const fresh = makeLoader({});
    const key = await fresh('@/lib/supabase/deviceKey').getOrCreateDeviceKey();
    assert.match(key, /^[0-9a-f]{64}$/);
    assert.equal(await fresh('@/lib/supabase/deviceKey').getOrCreateDeviceKey(), key, 'persisted');
  });

  await test('client: capability detected, ranked retry enabled', async () => {
    assert.equal(await sub.isRankedRetrySafe(), true);
  });

  await test('client: float rounds settle, lost response recovers without double rating', async () => {
    const mm = await api.pvpMatchmake();
    const samples = mm.opponent.sample_ms;
    const [{ rating: startRating }] = await q(db, `select rating from profiles where id = $1`, [ids.k1]);
    dropNext = true;
    const entry = sub.buildRankedSubmission({
      matchId: mm.match_id, opponentIsBot: mm.opponent.is_bot,
      playerRounds: [samples[0] - 30.6, samples[1] - 40.2, null], opponentRounds: samples,
      scorePlayer: 2, scoreOpponent: 0, result: 'win', characterId: 3,
    });
    const first = await sub.submitRankingResult(entry);
    assert.deepEqual(first, { status: 'pending_retry', retryable: true });
    const [{ rating: afterFirst }] = await q(db, `select rating from profiles where id = $1`, [ids.k1]);
    assert.ok(afterFirst > startRating, 'server settled the lost request');
    const retry = await sub.retryPendingSubmission(entry.id);
    assert.equal(retry.status, 'submitted');
    assert.equal(retry.settlement.already_completed, true);
    assert.equal(retry.settlement.rating_after, afterFirst);
    const [{ rating: final }] = await q(db, `select rating from profiles where id = $1`, [ids.k1]);
    assert.equal(final, afterFirst, 'no second rating change');
    assert.equal(pending().length, 0);
    const hist = await api.pvpHistory(8);
    assert.equal(hist[0].id, mm.match_id);
  });

  await test('client: Step 1 forfeit settles as server loss', async () => {
    const mm = await api.pvpMatchmake();
    const out = await sub.submitRankingResult(sub.buildRankedForfeit({
      matchId: mm.match_id, opponentIsBot: mm.opponent.is_bot,
      opponentRounds: mm.opponent.sample_ms, characterId: 3,
    }));
    assert.equal(out.status, 'submitted');
    assert.equal(out.settlement.result, 'loss');
  });

  console.log(passed + ' reconcile migration checks passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
