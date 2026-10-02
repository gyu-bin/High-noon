// Native Simulator captures of the development renderer replay route.
const { execFileSync, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const device = '2A6F5C91-5CFF-4A9C-9D1F-4F08E725D9A9';
const out = path.resolve(__dirname, '../artifacts/combat-v3-simulator');
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sim = (...args) => execFileSync('xcrun', ['simctl', ...args], { stdio: 'pipe' });
async function open(params) {
  sim('openurl', device, 'exp://127.0.0.1:8082/--/capture/combat-v3?' + new URLSearchParams(params));
}
async function capture(name, params) {
  await open(params);
  await wait(1800);
  sim('io', device, 'screenshot', path.join(out, name + '.png'));
  console.log('CAPTURE ' + name);
}
async function main() {
  for (const scale of ['1.2', '1.25', '1.3']) {
    await capture('scale-' + scale, { scenario: 'scale', scale, night: '1' });
  }
  const frames = {
    'npc-nonfinal': [0, 200, 600],
    'npc-final': [0, 200, 500, 800, 1100],
    'player-nonfinal': [0, 500],
    'player-final': [0, 200, 500, 1100, 1600],
    'ranked-nonfinal': [0, 200, 600],
    'ranked-final': [0, 200, 1100],
  };
  for (const [scenario, ats] of Object.entries(frames)) {
    for (const at of ats) await capture(`${scenario}-${at}`, { scenario, at: String(at), night: '1' });
    const videoPath = path.join(out, scenario + '.mp4');
    // These are this script's disposable QA recordings, not production assets.
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    const recording = spawn('xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', videoPath]);
    let recordingError = '';
    recording.stderr.on('data', (data) => { recordingError += data; });
    const closed = new Promise((resolve, reject) => {
      recording.once('error', reject);
      recording.once('close', (code) => code === 0 ? resolve() : reject(new Error(recordingError)));
    });
    await wait(350);
    await open({ scenario, night: '1' });
    await wait(7500);
    recording.kill('SIGINT');
    await closed;
    console.log('VIDEO ' + scenario);
  }
  for (const signal of ['ready', 'bang']) await capture('signal-' + signal, { scenario: 'scale', signal, night: '1' });
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
