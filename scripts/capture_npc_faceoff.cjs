// Native runtime evidence: production renderer, plus timed reaction replay; no online match writes.
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const device = process.env.FACEOFF_DEVICE || '66B81EA7-8132-4677-A443-2C5F96FB06ED';
const out = path.resolve(__dirname, '../artifacts/npc-duel-faceoff/captures');
const mode = process.argv[2] || 'pilot';
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sim = (...args) => execFileSync('xcrun', ['simctl', ...args], { stdio: 'pipe' });
async function capture(name, params) {
  sim('openurl', device, 'exp://127.0.0.1:8082/--/capture/redesign-duel?' + new URLSearchParams(params));
  await wait(2300);
  sim('io', device, 'screenshot', path.join(out, name + '.png'));
  console.log('CAPTURE', name);
}
async function record(name, params) {
  const file = path.join(out, name + '.mp4');
  const proc = spawn('xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', '--force', file], { stdio: 'ignore' });
  await wait(600);
  sim('openurl', device, 'exp://127.0.0.1:8082/--/capture/redesign-duel?' + new URLSearchParams(params));
  await wait(7200);
  proc.kill('SIGINT');
  await new Promise(resolve => proc.once('exit', resolve));
  console.log('RECORD', name);
}
async function main() {
  const pairs = mode === 'pilot' ? [[1, 1]] : [[2, 9], [3, 15], [4, 22], [1, 18], [2, 19], [3, 20]];
  for (const [player, npc] of pairs) {
    const base = { player: String(player), npc: String(npc), background: 'twilight' };
    const tag = `P0${player}-NPC${String(npc).padStart(2, '0')}`;
    for (const [stage, params] of [
      ['ready', { pose: 'idle', signal: 'ready' }],
      ['steady', { pose: 'draw', signal: 'steady' }],
      ['bang', { pose: 'fire', pshot: '1', signal: 'bang' }],
      ['hit', { pose: 'hit', at: '0', signal: 'result' }],
      ['recover', { pose: 'hit', at: '600', signal: 'result' }],
      ['kneel', { pose: 'hit', final: '1', at: '500', signal: 'result' }],
      ['fall', { pose: 'hit', final: '1', at: '800', signal: 'result' }],
      ['down', { pose: 'hit', final: '1', at: '1200', signal: 'result' }],
      ['player-hit', { pose: 'idle', playerDefeated: '1', phearts: '1', at: '0', signal: 'result' }],
      ['player-recover', { pose: 'idle', playerDefeated: '1', phearts: '1', at: '500', signal: 'result' }],
      ['player-down', { pose: 'idle', playerDefeated: '1', at: '1500', signal: 'result' }],
    ]) await capture(`${tag}-${stage}`, { ...base, ...params });
  }
  if (mode === 'pilot') {
    await record('P01-NPC01-survive-runtime', { npc: '1', player: '1', play: 'survive', background: 'twilight' });
    await record('P01-NPC01-final-runtime', { npc: '1', player: '1', play: 'final', background: 'twilight' });
    await record('P01-NPC01-player-final-runtime', { npc: '1', player: '1', play: 'final', playerDefeated: '1', background: 'twilight' });
  } else {
    for (const background of ['canyon', 'moonlit']) await capture(`P04-NPC22-${background}`, { npc: '22', player: '4', pose: 'idle', signal: 'ready', background });
    await record('P04-NPC22-final-runtime', { npc: '22', player: '4', play: 'final', background: 'moonlit' });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
