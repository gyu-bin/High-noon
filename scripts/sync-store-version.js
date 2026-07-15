#!/usr/bin/env node
/**
 * app.json 의 version → runtimeVersion / Info.plist / Expo.plist / Xcode 동기화.
 * EAS 빌드 서버에서도 한 번 더 맞춰 바이너리 OTA runtime 이 어긋나지 않게 합니다.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const version = appJson.expo.version;

if (!version) {
  throw new Error('expo.version missing in app.json');
}

appJson.expo.runtimeVersion = version;
fs.writeFileSync(path.join(root, 'app.json'), `${JSON.stringify(appJson, null, 2)}\n`);

const packageJsonPath = path.join(root, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function replaceOne(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  const before = fs.readFileSync(filePath, 'utf8');
  const after = before.replace(regex, replacement);
  if (after !== before) fs.writeFileSync(filePath, after);
}

replaceOne(
  path.join(root, 'ios/HighNoon/Info.plist'),
  /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
  `$1${version}$2`,
);
replaceOne(
  path.join(root, 'ios/HighNoon/Supporting/Expo.plist'),
  /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
  `$1${version}$2`,
);
replaceOne(
  path.join(root, 'ios/HighNoon.xcodeproj/project.pbxproj'),
  /MARKETING_VERSION = [^;]+;/g,
  `MARKETING_VERSION = ${version};`,
);

console.log(`Synced native/OTA versions to ${version}`);
