/* global __dirname */
// Execute the actual shared pause/ability/selector components and character
// screen state handlers. This is deterministic UI wiring, not a device test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'));
const t = (key, options = {}) => {
  let value = key.split('.').reduce((entry, part) => entry?.[part], dictionary) ?? options.defaultValue ?? key;
  for (const [name, replacement] of Object.entries(options)) value = String(value).replaceAll(`{{${name}}}`, String(replacement));
  return value;
};
let cursor=0, slots=[], width=393, height=852, reduced=false;
const settings={selectedCharacterId:1,setSelectedCharacterId:id=>{settings.selectedCharacterId=id;selections.push(id);}};
const selections=[];
const react={
  Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:{...props,children}}),
  useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:()=>{},
  useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
};
const cache={};
function load(relative){
 if(cache[relative])return cache[relative];
 const module={exports:{}};
 const source=fs.readFileSync(path.join(root,relative),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 new Function('module','exports','require','React',js)(module,module.exports,name=>{
  if(name==='react')return react;
  if(name==='react-native')return{Platform:{OS:'ios'},Modal:'Modal',View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',StyleSheet:{create:s=>s,absoluteFill:{position:'absolute',left:0,right:0,top:0,bottom:0}},useWindowDimensions:()=>({width,height})};
  if(name==='react-i18next')return{useTranslation:()=>({t})};
  if(name==='react-native-safe-area-context')return{useSafeAreaInsets:()=>({top:24,bottom:24,left:0,right:0})};
  if(name==='react-native-reanimated')return{useReducedMotion:()=>reduced};
  if(name==='expo-image')return{Image:'Image'};
  if(name==='@expo/vector-icons')return{Ionicons:'Icon'};
  if(name==='expo-router')return{Stack:{Screen:'Screen'},useFocusEffect:()=>{},useRouter:()=>({replace:()=>{}})};
  if(name==='@/components/ui/western/WesternPrimitives')return{WesternButton:'WesternButton',WesternHeader:'WesternHeader',WesternPanel:'WesternPanel'};
  if(name==='@/components/character/CharacterAbilityModal')return{CharacterAbilityModal:'AbilityModal'};
  if(name==='@/components/character/CharacterSelector')return{CharacterSelector:'Selector'};
  if(name==='@/components/layout/MetaScreenShell')return{MetaScreenShell:'ScreenShell'};
  if(name==='@/components/ui/MenuBackButton')return{MenuBackButton:'Back'};
  if(name==='@/hooks/usePhoneStageMetrics')return{usePhoneStageMetrics:()=>({windowWidth:width,windowHeight:height,stageWidth:width})};
  if(name==='@/hooks/useScreenBgm')return{useScreenBgm:()=>{}};
  if(name==='@/store/progressStore')return{useProgressStore:selector=>selector({unlockedCharacterIds:[1,2]})};
  if(name==='@/store/settingsStore')return{useSettingsStore:selector=>selector(settings)};
  if(name==='@/constants/devFlags')return{DEV_UNLOCK_ALL_CHARACTERS:false};
  if(name==='@/constants/v3UiAssets')return{V3_PLAYER_IDENTITIES:{1:'p1',2:'p2',3:'p3',4:'p4'}};
  if(name==='@/constants/characterArtMetadata')return{characterArtDisplayScale:()=>1,scaledArtStyle:(width,height)=>({width,height})};
  if(name==='@/utils/characterAbility'){
    const source=fs.readFileSync(path.join(root,'utils/characterAbility.ts'),'utf8');
    return{checkUnlockConditions:()=>{},HEADSHOT_MIN_REACTION_GAP_MS:Number(source.match(/HEADSHOT_MIN_REACTION_GAP_MS = (\d+)/)[1])};
  }
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
  throw new Error(name);
 },react);
 return cache[relative]=module.exports;
}
function all(node,type){const found=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type===type)found.push(n);for(const child of n.props?.children?.flat(Infinity)??[])walk(child);}walk(node);return found;}
function text(n){return typeof n==='string'||typeof n==='number'?String(n):n?.props?.children?.flat(Infinity).map(text).join(' ')??'';}
const {PauseMenuModal}=load('components/game/PauseMenuModal.tsx');
for(const [secondary,notice] of [[undefined,undefined],['Choose opponent',undefined],['Leave Duel',undefined],[undefined,'Leaving now forfeits the ranked match']]){
 let resume=0,exit=0,menu=0;
 const tree=PauseMenuModal({visible:true,onResume:()=>resume++,onSecondaryExit:secondary?()=>exit++:undefined,secondaryLabel:secondary,notice,onMainMenu:()=>menu++});
 assert.equal(tree.type,'Modal');assert.equal(tree.props.visible,true);assert.equal(all(tree,'WesternPanel').length,1);assert.equal(all(tree,'ScrollView').length,1);
 const buttons=all(tree,'WesternButton');assert.equal(buttons.length,secondary?3:2);assert.equal(buttons[0].props.variant,'primary');
 buttons[0].props.onPress();buttons.at(-1).props.onPress();if(secondary)buttons[1].props.onPress();
 tree.props.onRequestClose();all(tree,'View')[0].props.onAccessibilityEscape();
 assert.equal(resume,3,'resume button, Android back, and iOS escape preserve the resume action');assert.equal(menu,1);assert.equal(exit,secondary?1:0);
 if(notice)assert.ok(text(tree).includes(notice),'ranked forfeiture warning remains visible');
}
for(const dimensions of [[320,568],[852,393]]){
 [width,height]=dimensions;const tree=PauseMenuModal({visible:true,onResume:()=>{},onMainMenu:()=>{}});assert.ok(all(tree,'WesternPanel')[0].props.style.width<=width-40);assert.equal(all(tree,'ScrollView')[0].props.contentContainerStyle[0].flexGrow,1);
}
reduced=true;assert.equal(PauseMenuModal({visible:true,onResume:()=>{},onMainMenu:()=>{}}).props.animationType,'none');
assert.equal(PauseMenuModal({visible:false,onResume:()=>{},onMainMenu:()=>{}}).props.visible,false);
for(const file of ['app/game/npc.tsx','app/game/local.tsx','app/ranking/duel.tsx'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/<PauseMenuModal/);
console.log('PASS shared western pause: NPC/local/ranked action variants, native back/escape resume, warning, viewport fit, scrollable large-text layout and reduced motion');

width=393;height=852;
const Screen=load('app/character-select.tsx').default;
const {CharacterSelector}=load('components/character/CharacterSelector.tsx');
const {CharacterAbilityModal}=load('components/character/CharacterAbilityModal.tsx');
const render=()=>{cursor=0;return Screen();};
let screen=render();
for(const id of[1,2,3,4]){
 const selected=all(screen,'Selector')[0];assert.equal(selected.props.character.id,id);
 const selector=CharacterSelector(selected.props);const pressables=all(selector,'Pressable');
 const portrait=pressables.find(p=>p.props.onLongPress&&p.props.accessibilityLabel.includes('Character Ability'));
 const info=pressables.find(p=>p.props.accessibilityLabel==='Character Ability');
 const select=pressables.find(p=>p.props.accessibilityState?.selected!==undefined);
 assert.ok(portrait);assert.ok(info);assert.equal(portrait.props.disabled,undefined);assert.equal(info.props.disabled,undefined);
 assert.equal(portrait.props.delayLongPress,420);assert.equal(select.props.disabled,id>2);
 portrait.props.onLongPress();screen=render();let modal=all(screen,'AbilityModal')[0];
 assert.equal(modal.props.visible,true);assert.equal(modal.props.characterId,id);assert.equal(modal.props.unlocked,id<=2);assert.equal(selections.length,0,'long press never selects a character');
 let closed=0;const popup=CharacterAbilityModal({...modal.props,onClose:()=>closed++});
 const labels=load('utils/characterLabels.ts').getCharacterLabels(t,id);
 assert.equal(all(popup,'WesternHeader')[0].props.title,labels.name);
 assert.ok(text(popup).includes(labels.abilityDescription||t('character.noAbility')),'actual character ability/no-ability text appears');
 if(id>2)assert.ok(text(popup).includes(labels.unlockCondition));
 all(popup,'WesternButton')[0].props.onPress();popup.props.onRequestClose();all(popup,'View')[0].props.onAccessibilityEscape();assert.equal(closed,3);
 // Backdrop tap target lives inside the ScrollView content so iOS delivers the tap.
 const backdrop=all(all(popup,'ScrollView')[0],'Pressable')[0];assert.ok(backdrop,'backdrop press target inside scroll content');backdrop.props.onPress();assert.equal(closed,4);
 modal.props.onClose();screen=render();assert.equal(all(screen,'AbilityModal')[0].props.visible,false);
 info.props.onPress();screen=render();assert.equal(all(screen,'AbilityModal')[0].props.characterId,id,'visible skill action opens same details');
 all(screen,'AbilityModal')[0].props.onClose();screen=render();
 portrait.props.onPress();screen=render();assert.equal(all(screen,'AbilityModal')[0].props.characterId,id,'accessible portrait activation opens details');
 all(screen,'AbilityModal')[0].props.onClose();screen=render();
 if(id>2){select.props.onPress();assert.equal(selections.length,0,'screen selection guard still refuses locked character');}
 all(screen,'Selector')[0].props.onNext();screen=render();
}
all(screen,'Selector')[0].props.onSelect();assert.deepEqual(selections,[1],'normal unlocked selection still works');
all(screen,'Selector')[0].props.onNext();screen=render();all(screen,'Selector')[0].props.onSelect();assert.deepEqual(selections,[1,2]);
all(screen,'Selector')[0].props.onLongPress();screen=render();all(screen,'Selector')[0].props.onNext();screen=render();
assert.equal(all(screen,'Selector')[0].props.character.id,3);assert.equal(all(screen,'AbilityModal')[0].props.characterId,2);assert.equal(all(screen,'AbilityModal')[0].props.unlocked,true,'popup unlock state follows inspected ID, not a changing focused character');
all(screen,'AbilityModal')[0].props.onClose();screen=render();
assert.equal(CharacterAbilityModal({visible:false,characterId:null,unlocked:false,onClose:()=>{}}),null);
const modalNode=all(screen,'AbilityModal')[0];assert.ok(!all(all(screen,'ScrollView')[0],'AbilityModal').length,'native ability modal is outside scrolling selector content');assert.ok(modalNode);
console.log('PASS actual character screen + selector: portrait long press/tap and visible skill action for all 4 characters, correct locked state/details, no accidental selection, confirm/back/escape close');
