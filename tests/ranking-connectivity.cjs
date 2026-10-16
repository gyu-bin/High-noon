const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function load(file, dependencies, environment = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', ...Object.keys(environment), code)(
    m, m.exports, name => {
      assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
      return dependencies[name];
    }, ...Object.values(environment),
  );
  return m.exports;
}

function identityHarness({ values = new Map(), secureValue = null, readFails = false, writeFails = false, asyncReadFails = false } = {}) {
  const calls = { reads: 0, writes: 0, issues: 0 };
  const control = { asyncReadFails };
  const secure = {
    getItemAsync: async () => { if (readFails) throw new Error('A required entitlement is not present'); return secureValue; },
    setItemAsync: async (_key, value) => { if (writeFails) throw new Error('A required entitlement is not present'); secureValue = value; calls.writes++; },
  };
  const storage = {
    getItem: async key => { calls.reads++; if (control.asyncReadFails) throw new Error('Storage unavailable'); return values.get(key) ?? null; },
    setItem: async (key, value) => { calls.writes++; values.set(key, value); },
  };
  const api = load('lib/supabase/deviceKey.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
    'react-native': { Platform: { OS: 'ios' } },
    'expo-secure-store': secure,
    '@/lib/supabase/client': { isSupabaseConfigured: true, getSupabase: () => ({ rpc: async () => { calls.issues++; return { data: 'd'.repeat(64), error: null }; } }) },
  }, { globalThis: { crypto: undefined } });
  return { api, calls, values, control };
}

(async () => {
  {
    const requests = [], clients = [];
    const client = load('lib/supabase/client.ts', {
      '@supabase/supabase-js': {
        createClient: (url, key, options) => {
          assert.equal(options.auth.persistSession, false, 'device-key RPCs must not initialize unused Keychain Auth storage');
          assert.equal(options.auth.autoRefreshToken, false, 'no orphan Auth refresh ticks');
          assert.equal(options.auth.storage, undefined);
          const real = createClient(url, key, { ...options, global: { fetch: async (url) => {
            requests.push(url);
            return new Response(JSON.stringify({ contract: 'test-read-only' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } } });
          clients.push(real); return real;
        },
      },
    }, { __DEV__: false, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://ranking-test.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test' } } });
    const result = await client.getSupabase().rpc('pvp_capabilities');
    assert.equal(result.error, null); assert.equal(result.data.contract, 'test-read-only');
    assert.equal(requests.length, 1); assert.match(String(requests[0]), /\/rest\/v1\/rpc\/pvp_capabilities$/);
    assert.strictEqual(client.getSupabase(), clients[0]); assert.equal(clients.length, 1);
    console.log('PASS real Supabase SDK sends RPC without SecureStore/Auth session initialization');
  }
  {
    const h = identityHarness({ readFails: true, writeFails: true });
    const [first, second, third] = await Promise.all(Array.from({ length: 3 }, () => h.api.getOrCreateDeviceKey()));
    assert.equal(first, second); assert.equal(second, third); assert.equal(h.calls.issues, 1); assert.equal(h.calls.writes, 1);
    assert.equal(await h.api.getOrCreateDeviceKey(), first); assert.equal(h.calls.issues, 1);
    const restarted = identityHarness({ values: h.values, readFails: true, writeFails: true });
    assert.equal(await restarted.api.getOrCreateDeviceKey(), first); assert.equal(restarted.calls.issues, 0);
    console.log('PASS missing keychain entitlement preserves one persisted device identity across concurrent calls/restart');
  }
  {
    const saved = 'a'.repeat(64);
    const h = identityHarness({ values: new Map([['high-noon-pvp-device-key', saved]]) });
    assert.equal(await h.api.getOrCreateDeviceKey(), saved);
    assert.equal(h.calls.issues, 0, 'empty SecureStore still checks the existing fallback identity');
    const secured = identityHarness({ secureValue: 'b'.repeat(64), values: h.values });
    assert.equal(await secured.api.getOrCreateDeviceKey(), 'b'.repeat(64)); assert.equal(secured.calls.reads, 0);
    console.log('PASS fallback identity is retained when SecureStore recovers, existing secure identity remains authoritative');
  }
  {
    const h = identityHarness({ readFails: true, asyncReadFails: true });
    await assert.rejects(h.api.getOrCreateDeviceKey(), /Storage unavailable/);
    h.control.asyncReadFails = false;
    assert.equal((await h.api.getOrCreateDeviceKey()).length, 64);
    assert.equal(h.calls.issues, 1, 'failed identity initialization can be retried');
    console.log('PASS failed identity initialization clears in-flight state for retry');
  }
  // Evaluate the production UI's empty-state expression: a failed request is
  // never reported as an authoritative empty leaderboard.
  {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/ranking/index.tsx'), 'utf8');
    const ast = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression;
    const visit = node => {
      if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'emptyLabel') expression = node.initializer.expression.getText(ast);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const label = new Function('t', 'isSupabaseConfigured', 'loading', 'boardLoaded', 'boardFailed', `return ${expression};`);
    const t = key => key;
    assert.equal(label(t, true, true, false, false), 'common.loading');
    assert.equal(label(t, true, false, false, true), 'ranking.networkFailed');
    assert.equal(label(t, true, false, true, false), 'ranking.leaderboardEmpty');
    assert.equal(label(t, false, false, false, false), 'ranking.offlineBody');
    console.log('PASS actual ranking UI distinguishes loading, connection failure, confirmed empty board and offline build');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
