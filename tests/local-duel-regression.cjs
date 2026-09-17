// Read-only deterministic regression harness for the actual local duel hook.
// React scheduling is approximated; this is not a device UI test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function harness() {
  let now = 0, serial = 0, cursor = 0, api;
  const timers = new Map(), slots = [], effects = [];
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const react = {
    useRef(value) { const i=cursor++; return slots[i] ??= {current:value}; },
    useState(value) {
      const i=cursor++; if (!(i in slots)) slots[i]=typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i]=typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(fn,deps) { const i=cursor++; if (!slots[i] || !equal(slots[i].deps,deps)) slots[i]={fn,deps}; return slots[i].fn; },
    useEffect(fn,deps) {
      const i=cursor++; if (!slots[i] || !equal(slots[i].deps,deps)) {
        const previous=slots[i]; slots[i]={deps};
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup=fn(); });
      }
    },
  };
  const cache = {};
  function load(file) {
    if(cache[file]) return cache[file];
    const module={exports:{}}; cache[file]=module.exports;
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(source,{
      module,exports:module.exports,require: name => {
        if(name==='react') return react;
        if(name==='@/utils/duelSignalSpeech') return {stopDuelSignalSpeech(){}};
        if(name.startsWith('@/')) return load(path.join(root,name.slice(2)+'.ts'));
        throw new Error('Unmocked import '+name);
      },
      setTimeout: (fn,ms) => { const id=++serial; timers.set(id,{at:now+ms,fn}); return id; },
      clearTimeout: id => timers.delete(id),
      Date:{now:()=>now},performance:{now:()=>now},Math:Object.assign(Object.create(Math),{random:()=>0.5}),
    },{filename:file});
    return module.exports;
  }
  const hook=load(path.join(root,'hooks/useLocalDuelEngine.ts')).useLocalDuelEngine;
  const render=()=>{cursor=0;api=hook();while(effects.length)effects.shift()();return api;};
  const advance=ms=>{
    const end=now+ms;
    while(true){
      const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;
      now=next[1].at;timers.delete(next[0]);next[1].fn();render();
    }
    now=end;return render();
  };
  render();
  return {get api(){return api;},render,advance,get pending(){return timers.size;},unmount(){slots.forEach(s=>s?.cleanup?.());}};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function bang(h){h.api.start();h.render();h.advance(6000);assert.equal(h.api.phase,'뱅');}
test('P1 early tap loses',()=>{const h=harness();h.api.start();h.api.tap('p1');h.render();assert.equal(h.api.outcome.winner,'p2');assert.equal(h.pending,0);});
test('simultaneous early taps draw',()=>{const h=harness();h.api.start();h.api.commitLocalTouches(['p1','p2']);h.render();assert.equal(h.api.outcome.winner,'draw');});
test('P1 faster reaction wins',()=>{const h=harness();bang(h);h.advance(210);h.api.tap('p1');h.advance(60);h.api.tap('p2');h.render();assert.equal(h.api.outcome.winner,'p1');assert.equal(h.api.outcome.p1.reactionMs,210);});
test('P2 faster reaction wins',()=>{const h=harness();bang(h);h.advance(190);h.api.tap('p2');h.advance(70);h.api.tap('p1');h.render();assert.equal(h.api.outcome.winner,'p2');});
test('same-event touches draw',()=>{const h=harness();bang(h);h.advance(250);h.api.commitLocalTouches(['p1','p2']);h.render();assert.equal(h.api.outcome.winner,'draw');});
test('no input times out to draw',()=>{const h=harness();bang(h);h.advance(2500);assert.equal(h.api.outcome.winner,'draw');assert.equal(h.pending,0);});
test('duplicate tap does not overwrite time',()=>{const h=harness();bang(h);h.advance(180);h.api.tap('p1');h.advance(50);h.api.tap('p1');h.advance(170);assert.equal(h.api.outcome.p1.reactionMs,180);assert.equal(h.api.outcome.winner,'p1');});
test('pause preserves READY remaining time',()=>{const h=harness();h.api.start();h.advance(800);h.api.pauseTimers();h.advance(10000);assert.equal(h.api.phase,'준비');h.api.resumeTimers();h.advance(1199);assert.equal(h.api.phase,'준비');h.advance(1);assert.equal(h.api.phase,'집중');});
test('reset cancels old round callbacks',()=>{const h=harness();bang(h);h.api.reset();h.advance(10000);assert.equal(h.api.phase,'대기');assert.equal(h.api.outcome,null);assert.equal(h.pending,0);});
test('unmount cancels pending timers',()=>{const h=harness();h.api.start();h.render();h.unmount();assert.equal(h.pending,0);});
test('repeated background pause excludes the entire interruption from reaction time',()=>{
  const h=harness();bang(h);h.advance(100);h.api.pauseTimers();
  h.advance(2000);h.api.pauseTimers();h.advance(3000);h.api.resumeTimers();
  h.advance(110);h.api.tap('p1');h.advance(60);h.api.tap('p2');h.render();
  assert.equal(h.api.outcome.p1.reactionMs,210);assert.equal(h.api.outcome.winner,'p1');
});
console.log(passed+' local engine regressions passed');
