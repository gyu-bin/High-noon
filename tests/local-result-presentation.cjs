/* global __dirname */
// Execute actual local screen result effects and result components. Engine tests
// remain in local-duel-regression.cjs; this file never substitutes combat rules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'app/game/local.tsx'), 'utf8');
const ast = ts.createSourceFile('local.tsx', screen, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes("if (phase !== '결과'")) effect = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast); assert.ok(effect, 'test exercises the actual screen result callback');
function resultHarness(winner, prior = { p1: 0, p2: 0 }, flags = {}) {
  let now = 0, serial = 0;
  const timers = new Map(), modal = [], defeated = [], winners = [], history = [];
  const outcome = { winner, p1: { reactionMs: 230, earlyTap: false, timeout: false }, p2: { reactionMs: 260, earlyTap: false, timeout: false }, ...flags };
  const env = {
    phase: '결과', outcome, winsNeeded: 2, p1Hearts: 2-prior.p2, p2Hearts: 2-prior.p1,
    processedKey: {current:''}, roundIdx: {current:1}, winsRef: {current:{...prior}},
    defeatRevealTimerRef: {current:null}, roundModalTimerRef: {current:null}, soundTimersRef: {current:new Set()},
    setP1Hearts:()=>{},setP2Hearts:()=>{},setP1Wins:()=>{},setP2Wins:()=>{},
    setMatchWinner:w=>winners.push(w),setRoundDefeated:d=>defeated.push(d),setModalStep:m=>modal.push(m),
    useMatchHistoryStore:{getState:()=>({record:row=>history.push(row)})},
    play:()=>{},trigger:()=>{},DUEL_DEFEAT_REVEAL_DELAY_MS:250,DUEL_DEFEAT_MODAL_DELAY_MS:1900,
    setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),
  };
  const compiled=ts.transpileModule(`const run = ${effect}; run();`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const run=()=>new Function(...Object.keys(env),compiled)(...Object.values(env));
  const advance=ms=>{const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
  return {run,advance,modal,defeated,winners,history,timers};
}
for (const winner of ['p1','p2']) {
  const h=resultHarness(winner, winner==='p1'?{p1:1,p2:0}:{p1:0,p2:1});
  h.run();h.advance(249);assert.deepEqual(h.defeated,[]);h.advance(1);assert.deepEqual(h.defeated,[winner==='p1'?'p2':'p1']);
  h.advance(1649);assert.deepEqual(h.modal,[]);h.advance(1);assert.deepEqual(h.modal,['match'],'decisive round goes directly to final result after unchanged defeat delay');
  h.run();h.advance(5000);assert.deepEqual(h.modal,['match']);assert.equal(h.history.length,1);assert.deepEqual(h.winners,[winner]);
}
const round=resultHarness('p1');round.run();round.advance(1900);assert.deepEqual(round.modal,['round']);assert.equal(round.history.length,0);
for(const flags of [{},{p1:{reactionMs:null,earlyTap:true,timeout:false},p2:{reactionMs:null,earlyTap:true,timeout:false}},{p1:{reactionMs:null,earlyTap:false,timeout:true},p2:{reactionMs:null,earlyTap:false,timeout:true}}]){
 const draw=resultHarness('draw',undefined,flags);draw.run();assert.deepEqual(draw.modal,['round']);assert.equal(draw.history.length,0);assert.equal(draw.timers.size,0);
}
console.log('PASS actual local screen: direct final result for either winner, existing 250/1900ms reveal, ordinary round/draw flow, duplicate-result guard');

const translations=JSON.parse(fs.readFileSync(path.join(root,'locales/en.json'),'utf8'));
const t=(key,values={})=>{let text=key.split('.').reduce((v,k)=>v?.[k],translations)??key;for(const[k,v]of Object.entries(values))text=text.replaceAll(`{{${k}}}`,String(v));return text;};
const react={createElement:(type,props,...children)=>typeof type==='function'?type({...props,children}):({type,props:{...props,children}})};
const animations={duration:()=>animations};
let reduceMotion=false, fontScale=1;
const layoutModule={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync(path.join(root,'utils/localResultLayout.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(layoutModule.exports);
const {localResultLayout}=layoutModule.exports;
function load(relative){
 const source=fs.readFileSync(path.join(root,relative),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;const module={exports:{}};
 new Function('module','exports','require','React',js)(module,module.exports,name=>{
  if(name==='react-native')return{useWindowDimensions:()=>({fontScale}),Modal:'Modal',ScrollView:'ScrollView',View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:s=>s,absoluteFillObject:{position:'absolute',top:0,left:0,right:0,bottom:0}}};
  if(name==='react-i18next')return{useTranslation:()=>({t})};
  if(name==='react-native-reanimated')return{__esModule:true,default:{View:'AnimatedView'},FadeIn:animations,useReducedMotion:()=>reduceMotion};
  if(name==='@/constants/fonts')return{FONT_RYE:'rye',FONT_WESTERN_SERIF:'serif',usesCjkFont:()=>false};
  if(name==='@/constants/outcomeTheme')return{OUTCOME_VICTORY:{title:'gold',badgeBorder:'gold'},OUTCOME_DEFEAT:{title:'red',badgeBorder:'red'},OUTCOME_PANEL:{background:'brown',borderRadius:8}};
  if(name==='@/constants/theme')return{colors:{sand:'sand',cream:'cream'}};
  if(name==='@/utils/localResultLayout')return{localResultLayout};
  if(name==='@/utils/formatReactionMs')return{formatReactionMs:n=>String(n)};
  if(name==='@/components/game/DuelVictoryPortrait')return{DuelVictoryPortrait:'Portrait'};
  if(name==='@/components/result/OutcomeBackdrop')return{OutcomeBackdrop:'Backdrop'};
  if(name==='@/components/ui/western/WesternPrimitives')return{WesternButton:'Button'};
  throw new Error(name);
 },react);return module.exports;
}
function all(tree,type){const found=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type===type)found.push(n);for(const child of n.props?.children?.flat(Infinity)??[])walk(child);}walk(tree);return found;}
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);return tree?.props?.children?.flat(Infinity).map(text).join(' ')??'';}
const {LocalRoundModal}=load('components/game/LocalRoundModal.tsx');
let next=0;const state={winner:'p1',p1:{reactionMs:230,earlyTap:false,timeout:false},p2:{reactionMs:null,earlyTap:true,timeout:false}};
const props={visible:true,outcome:state,onContinue:()=>next++,p1Wins:1,p2Wins:0,width:393,height:852};
const tree=LocalRoundModal(props);const cards=all(tree,'AnimatedView');assert.equal(cards.length,2);
assert.deepEqual(cards[0].props.style[1].transform,[{rotate:'180deg'}]);assert.equal(cards[1].props.style[1].transform,undefined);
assert.match(text(cards[0]),/P2.*Defeat.*0.*1.*P1.*Early tap/);assert.match(text(cards[1]),/P1.*Victory!.*1.*0.*P2.*230 ms/);
assert.equal((text(tree).match(/Early tap/g)||[]).length,1,'failure reason shown once, without duplicate stat/reason rows');
all(tree,'Pressable')[0].props.onPress();assert.equal(next,1);
assert.equal(LocalRoundModal({...props,visible:false}),null);reduceMotion=true;assert.equal(all(LocalRoundModal(props),'AnimatedView')[0].props.entering,undefined);
const {LocalMatchModal}=load('components/game/LocalMatchModal.tsx');
let rematch=0,exit=0;const final=LocalMatchModal({visible:true,matchWinner:'p2',winnerSkinId:'n:14',p1Wins:1,p2Wins:2,winsNeeded:2,onExit:()=>exit++,onRematch:()=>rematch++,backgroundVariant:'night',backgroundId:'twilight',width:393,height:852});
assert.equal(all(final,'Backdrop')[0].props.backgroundId,'twilight','final result preserves the match scene');
assert.match(screen, /<LocalMatchModal[\s\S]*?backgroundId=\{duelBackgroundId\}/, 'local screen passes its selected match background');
assert.equal(all(final,'Portrait')[0].props.skinId,'n:14');assert.match(text(final),/P2 wins the match/);assert.match(text(final),/Final Score.*P1.*1.*P2.*2/);
const buttons=all(final,'Button');assert.equal(buttons.length,2);buttons[0].props.onPress();buttons[1].props.onPress();assert.equal(rematch,1);assert.equal(exit,1);assert.equal(final.props.animationType,'none');
console.log('PASS actual cards: opposing P2 orientation, clear individual time/reason and score, no duplicate reason, next-round action, winner art/score/rematch/exit, reduced motion');

// Execute the exact layout declarations, rather than duplicating their formula.
const arena=fs.readFileSync(path.join(root,'components/game/LocalDuelArenaLayout.tsx'),'utf8');
const arenaAst=ts.createSourceFile('arena.tsx',arena,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const names=['halfHeight','resultLayout','resultFigureHeight','maxFigureHeight','figureWidth','figureHeight'];const declarations=[];
(function walk(node){if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(arenaAst)))declarations.push(`const ${node.getText(arenaAst)};`);ts.forEachChild(node,walk);})(arenaAst);
const figure=new Function('width','height','paddingTop','paddingBottom','hideBottomHud','fontScale','localResultLayout',declarations.join('\n')+'return {figureHeight,halfHeight};');
for(const scale of [1,1.3,1.8,2,3]) for(const[width,height,top,bottom]of[[320,568,20,0],[375,667,20,0],[393,852,62,34],[430,932,62,34]]){
 fontScale=scale;
 const metrics=localResultLayout({width,height,fontScale:scale,paddingTop:top,paddingBottom:bottom});
 const value=figure(width,height,top,bottom,true,scale,localResultLayout);
 for(const pad of[top,bottom])assert.ok(value.halfHeight-Math.max(34,pad+16)-value.figureHeight>=metrics.reserve-.1,'each character stays clear of font-scaled result card');
 const small=LocalRoundModal({...props,width,height,paddingTop:top,paddingBottom:bottom});
 for(const card of all(small,'AnimatedView')){
  const style=card.props.style[1];assert.ok(style.left>=16);assert.ok(style.top>=0);assert.ok(style.top+style.height<=height);
  assert.equal(style.height,metrics.cardHeight,'actual rendered card uses shared font-scaled height');
  const panel=all(card,'View').find(v=>v.props.accessible);assert.equal(panel.props.style[1].height,style.height);
  assert.match(panel.props.accessibilityLabel,/P[12]:.*This Round:.*P1 1, P2 0.*Tap/);
  assert.equal(panel.props.accessibilityRole,'button');
  for(const label of all(card,'Text'))assert.equal(label.props.maxFontSizeMultiplier,metrics.textMultiplier,'every rendered label has the computed viewport cap');
  // Conservative line boxes for the actual rendered 21/18/10px three rows.
  assert.ok((21+18+10)*1.35*metrics.textMultiplier+23<=style.height,'enlarged line boxes and padding fit card');
 }
 if(scale>1)assert.ok(metrics.cardHeight>102,'large fonts receive more real layout space');
}
const accessibleCard=all(LocalRoundModal(props),'View').find(v=>v.props.accessible);
accessibleCard.props.onAccessibilityTap();assert.equal(next,2,'screen reader action continues without relying on outer press target');
assert.deepEqual(accessibleCard.props.accessibilityActions,[{name:'activate'}]);
accessibleCard.props.onAccessibilityAction({nativeEvent:{actionName:'activate'}});assert.equal(next,3,'Android TalkBack activation invokes continue exactly once');
accessibleCard.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}});assert.equal(next,3,'unrelated accessibility actions do not continue the round');
assert.doesNotMatch(fs.readFileSync(path.join(root,'components/game/LocalRoundModal.tsx'),'utf8'),/LocalDuelFireworks/);assert.doesNotMatch(fs.readFileSync(path.join(root,'components/game/LocalMatchModal.tsx'),'utf8'),/LocalDuelFireworks/);
console.log('PASS actual arena geometry: 320/375/393/430px safe zones at fontScale 1–3, actual rendered height/text caps/full screen-reader labels, fireworks removed');
