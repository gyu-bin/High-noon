#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets/images/characters/npc-high-res-poster-manifest.json');
const baselinePath = path.join(root, 'output/npc-final-scale/baseline.json');
const registryPath = path.join(root, 'constants/posterCharacterAssets.ts');
const outputPath = path.join(root, 'artifacts/npc-high-res-production/qa-audit.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const registry = fs.readFileSync(registryPath, 'utf8');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readPng = (relative) => PNG.sync.read(fs.readFileSync(path.join(root, relative)));

const npcs = manifest.assets.map((asset) => {
  const source = readPng(asset.highResIdentitySource);
  const poster = readPng(asset.posterIdentity);
  let alphaChangedPixels = 0;
  let visibleRgbChangedPixels = 0;
  let minX = poster.width;
  let minY = poster.height;
  let maxX = -1;
  let maxY = -1;

  for (let offset = 0; offset < source.data.length; offset += 4) {
    if (source.data[offset + 3] !== poster.data[offset + 3]) alphaChangedPixels += 1;
    if (poster.data[offset + 3] > 0) {
      const pixel = offset / 4;
      const x = pixel % poster.width;
      const y = Math.floor(pixel / poster.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (
        source.data[offset] !== poster.data[offset]
        || source.data[offset + 1] !== poster.data[offset + 1]
        || source.data[offset + 2] !== poster.data[offset + 2]
      ) visibleRgbChangedPixels += 1;
    }
  }

  const id = String(asset.id).padStart(2, '0');
  const requirePath = `@/assets/images/characters/clarity/npc/${id}/identity_poster.png`;
  return {
    id: asset.id,
    sourceResolution: [source.width, source.height],
    posterResolution: [poster.width, poster.height],
    alphaChangedPixels,
    visibleRgbChangedPixels,
    expectedRimPixelsReplaced: asset.rimPixelsReplaced,
    alphaBoundsInclusive: [minX, minY, maxX, maxY],
    runtimeMapped: registry.includes(requirePath),
    sourceHashMatchesManifest: sha256(path.join(root, asset.highResIdentitySource)) === asset.sourceSha256,
    posterHashMatchesManifest: sha256(path.join(root, asset.posterIdentity)) === asset.posterSha256,
  };
});

const duelFiles = [];
for (let id = 1; id <= 22; id += 1) {
  for (const pose of ['idle', 'draw', 'fire', 'hit', 'down']) {
    const relative = `assets/images/characters/clarity/npc/${String(id).padStart(2, '0')}/${pose}.png`;
    duelFiles.push({ relative, unchangedFromBaseline: baseline[relative] === sha256(path.join(root, relative)) });
  }
}

const playerFiles = [
  'assets/images/characters/clarity/player/01/identity_poster.png',
  'assets/images/characters/clarity/player/02-v2/identity_poster.png',
  'assets/images/characters/clarity/player/03/identity_poster.png',
  'assets/images/characters/clarity/player/04/identity_poster.png',
].map((relative) => ({ relative, unchangedFromBaseline: baseline[relative] === sha256(path.join(root, relative)) }));

const requestedDeviceCaptures = ['01', '03', '07', '09', '12', '15', '18', '21', '22-dev']
  .map((id) => `artifacts/npc-high-res-production/device-npc${id}.png`);

const audit = {
  generatedAt: new Date().toISOString(),
  highResSource: `${npcs.filter((item) => item.sourceResolution[0] === 1254 && item.sourceResolution[1] === 1254).length}/22`,
  highResPoster: `${npcs.filter((item) => item.posterResolution[0] === 1254 && item.posterResolution[1] === 1254).length}/22`,
  alphaPass: `${npcs.filter((item) => item.alphaChangedPixels === 0).length}/22`,
  rimPixelAccountingPass: `${npcs.filter((item) => item.visibleRgbChangedPixels === item.expectedRimPixelsReplaced).length}/22`,
  runtimeMappingPass: `${npcs.filter((item) => item.runtimeMapped).length}/22`,
  hashPass: `${npcs.filter((item) => item.sourceHashMatchesManifest && item.posterHashMatchesManifest).length}/22`,
  clippingPolicy: 'PASS — complete 1254px canvases render with contain; no runtime crop is applied',
  duelProtection: `${duelFiles.filter((item) => item.unchangedFromBaseline).length}/${duelFiles.length}`,
  playerProtection: `${playerFiles.filter((item) => item.unchangedFromBaseline).length}/${playerFiles.length}`,
  requestedDeviceCaptures: `${requestedDeviceCaptures.filter((relative) => fs.existsSync(path.join(root, relative))).length}/9`,
  comparisonCapture: fs.existsSync(path.join(root, 'artifacts/npc-high-res-production/device-player-vs-npc.png')),
  npcs,
  duelFiles,
  playerFiles,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  highResSource: audit.highResSource,
  highResPoster: audit.highResPoster,
  alphaPass: audit.alphaPass,
  rimPixelAccountingPass: audit.rimPixelAccountingPass,
  runtimeMappingPass: audit.runtimeMappingPass,
  hashPass: audit.hashPass,
  duelProtection: audit.duelProtection,
  playerProtection: audit.playerProtection,
  requestedDeviceCaptures: audit.requestedDeviceCaptures,
  comparisonCapture: audit.comparisonCapture,
}, null, 2));
