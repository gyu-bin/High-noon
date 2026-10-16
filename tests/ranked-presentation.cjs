const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function source(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => find(child, predicate));
}
function component(file, name) {
  return find(file, node => (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
    && node.tagName.getText(file) === name);
}
function prop(element, name) {
  return element.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.text === name);
}
function evaluateProp(attribute, file, scope) {
  if (!attribute) return undefined;
  if (!attribute.initializer) return true;
  const expression = attribute.initializer.expression.getText(file);
  return new Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope));
}

let failures = 0;
function regression(name, run) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}

regression('Ranked own presentation receives the selected P01–P04 identity', () => {
  const screen = source('app/ranking/duel.tsx');
  const arena = component(screen, 'NpcFirstPersonDuelArena');
  const identity = prop(arena, 'playerCharacterId');
  assert.ok(identity, 'missing prop falls back to P01, regardless of selected identity');
  const bindingName = identity.initializer.expression.getText(screen);
  const binding = find(screen, node => ts.isVariableDeclaration(node) && node.name.getText(screen) === bindingName);
  assert.ok(binding?.initializer, 'own identity must be bound to settings');
  for (const selectedCharacterId of [1, 2, 3, 4]) {
    const boundId = new Function('useSettingsStore', `return ${binding.initializer.getText(screen)};`)(
      selector => selector({ selectedCharacterId }),
    );
    assert.equal(evaluateProp(identity, screen, { [bindingName]: boundId }), selectedCharacterId);
  }
  assert.equal(prop(arena, 'opponentCharacterId').initializer.expression.getText(screen), 'opponent.character_id');
});

regression('right-side Ranked ghost keeps FIRE inward without changing preparation/recovery direction', () => {
  const arena = source('components/game/NpcFirstPersonDuelArena.tsx');
  const sprite = component(arena, 'PlayerCharacterSprite');
  // Source artwork audited for all four shared players: preparation points right,
  // FIRE barrels point left. These checks execute the production JSX flip expression.
  for (const opponentCharacterId of [1, 2, 3, 4]) {
    for (const npcPose of ['idle', 'aim', 'shoot', 'defeat']) {
      for (const npcStage of ['none', 'hit', 'recover', 'down']) {
        const scope = { opponentCharacterId, npcPose, npcStage, npcDefeated: npcPose === 'defeat' };
        const renderedPose = evaluateProp(prop(sprite, 'pose'), arena, scope);
        const flip = evaluateProp(prop(sprite, 'flipHorizontal'), arena, scope);
        if (renderedPose === 'defeat') {
          assert.equal(flip, true, 'existing hit/down presentation must keep its transform');
        } else {
          const sourceBarrelDirection = renderedPose === 'shoot' ? -1 : 1;
          assert.equal(sourceBarrelDirection * (flip ? -1 : 1), -1,
            `P${opponentCharacterId} ${renderedPose} must point left toward player`);
        }
      }
    }
  }
});
if (failures) process.exitCode = 1;
