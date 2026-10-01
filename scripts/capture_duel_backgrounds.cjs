// Fixed-frame captures use the real duel renderer, never submit online results.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const device = '2A6F5C91-5CFF-4A9C-9D1F-4F08E725D9A9';
const out = path.resolve(__dirname, '../artifacts/duel-background-validation/captures');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sim = (...args) => execFileSync('xcrun', ['simctl', ...args], { stdio: 'pipe' });
async function main() {
  const targets = ['P04','NPC09','NPC15','NPC18','NPC19','NPC20','NPC22'];
  for (const background of ['twilight','canyon','moonlit']) {
    for (const target of targets) {
      const params = new URLSearchParams({ background, signal: 'steady', pose: 'idle',
        npc: target === 'P04' ? '1' : String(Number(target.slice(3))) });
      if (target === 'P04') params.set('opp','4');
      sim('openurl',device, 'exp://127.0.0.1:8082/--/capture/redesign-duel?'+params);
      await wait(2500);
      sim('io',device,'screenshot',path.join(out,`${background}-${target}.png`));
      console.log('CAPTURE',background,target);
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
