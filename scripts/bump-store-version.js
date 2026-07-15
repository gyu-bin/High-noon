#!/usr/bin/env node
/**
 * 스토어 마케팅 버전을 올리고 OTA runtime / 네이티브 값을 동기화합니다.
 * 예: 1.2 → 1.3, 1.2.0 → 1.2.1
 *
 * 사용: node scripts/bump-store-version.js
 * 빌드: npm run build:ios:production
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function bumpVersion(version) {
  const parts = version.split('.').map((p) => {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid version segment in "${version}"`);
    }
    return n;
  });
  if (parts.length === 0 || parts.length > 3) {
    throw new Error(`Unsupported version format: "${version}" (use X, X.Y, or X.Y.Z)`);
  }
  parts[parts.length - 1] += 1;
  return parts.join('.');
}

function replaceFile(filePath, replacer) {
  const before = fs.readFileSync(filePath, 'utf8');
  const after = replacer(before);
  if (after === before) {
    throw new Error(`No change applied in ${path.relative(root, filePath)}`);
  }
  fs.writeFileSync(filePath, after);
}

const appJsonPath = path.join(root, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const prev = appJson.expo.version;
const next = bumpVersion(prev);

appJson.expo.version = next;
appJson.expo.runtimeVersion = next;
fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = next;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

replaceFile(path.join(root, 'ios/HighNoon/Info.plist'), (text) =>
  text.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${next}$2`,
  ),
);

replaceFile(path.join(root, 'ios/HighNoon/Supporting/Expo.plist'), (text) =>
  text.replace(
    /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${next}$2`,
  ),
);

replaceFile(path.join(root, 'ios/HighNoon.xcodeproj/project.pbxproj'), (text) =>
  text.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`),
);

console.log(`Store version bumped: ${prev} → ${next}`);
console.log('Synced: app.json, package.json, Info.plist, Expo.plist, project.pbxproj');
