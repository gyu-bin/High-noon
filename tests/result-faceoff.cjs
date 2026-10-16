/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports = {}) {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.React}}).outputText;
  const mod = {exports:{}};
  const react = {createElement:(type,props,...children)=> typeof type==='function' ? type({...props,children}) : {type,props:{...props,children}}};
  new Function('module','exports','require','React',js)(mod,mod.exports,name=>{if(name in imports)return imports[name];throw Error(name);},react);
  return mod.exports;
}
const {RESULT_POSE_BOUNDS} = load('constants/resultPoseBounds.ts');
const players=Object.fromEntries([1,2,3,4].map(id=>[id,{down:`p:${id}:kneel`}]));
const npcs=Object.fromEntries(Array.from({length:22},(_,i)=>[i+1,{down:`n:${i+1}:kneel`}]));
const {DuelResultFaceoff,resultPoseFrame}=load('components/result/DuelResultFaceoff.tsx',{
 'expo-image':{Image:'Image'},'react-native':{View:'View',Text:'Text',StyleSheet:{create:v=>v}},
 'react-i18next':{useTranslation:()=>({t:k=>k})},
 '@/constants/clarityCharacterAssets':{CLARITY_PLAYERS:players,CLARITY_NPCS:npcs},
 '@/constants/duelVictoryArt':{duelVictoryArt:({kind,id})=>`${kind==='player'?'p':'n'}:${id}:victory`},
 '@/constants/resultPoseBounds':{RESULT_POSE_BOUNDS},'@/utils/npcLabels':{getNpcDisplayName:(_,id)=>`npc${id}`},
});
function images(node){if(!node||typeof node!=='object')return[];return[node.type==='Image'?node:null,...(node.props?.children??[]).flat(Infinity).flatMap(images)].filter(Boolean);}
for(const p of[1,2,3,4])for(let n=1;n<=22;n++)for(const won of[true,false]){
 const art=images(DuelResultFaceoff({playerId:p,npcId:n,playerWon:won,width:349,height:280}));
 assert.equal(art.length,2);assert.equal(art[0].props.source,`p:${p}:${won?'victory':'kneel'}`);assert.equal(art[1].props.source,`n:${n}:${won?'kneel':'victory'}`);
}
for(const key of Object.keys(RESULT_POSE_BOUNDS))for(const width of[132,168.5,209]){
 const height=280;const won=key.endsWith(':victory');const frame=resultPoseFrame(key,width,height,won);
 const {canvas:[cw],bounds:[l,t,r,b]}=RESULT_POSE_BOUNDS[key];const scale=frame.width/cw;
 assert.ok(frame.left+l*scale>=-0.001);assert.ok(frame.left+r*scale<=width+.001);
 assert.ok(frame.top+t*scale>=0);assert.ok(Math.abs(frame.top+b*scale-height)<.001,'both poses share a ground line');
 if(!won)assert.ok((b-t)*scale<=height*.64+.001,'kneeling figure stays lower');
}
assert.equal(Object.keys(RESULT_POSE_BOUNDS).length,52);
console.log('PASS all 176 winner/loser pairings preserve player-left NPC-right and correct pose; 52 silhouettes fit 3 widths on one ground line');
