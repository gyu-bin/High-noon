#!/usr/bin/env node
/**
 * EAS Update 업로드 래퍼.
 *
 * 사용:
 *   npm run ota:upload
 *   npm run ota:upload -- --platform all --channel prod
 *   npm run ota:upload -- --platform ios --channel preview --message "핫픽스"
 *
 * 옵션 (모두 선택):
 *   --platform ios|android|all     기본 all
 *   --channel prod|production|preview  기본 production (prod → production)
 *   --runtime-version <ver>        app.json 과 다르면 경고만 (EAS는 앱 설정 사용)
 *   --apply-mode immediate|next-launch  기록용. 앱은 스플래시에서 immediate 적용
 *   --message / -m <text>          없으면 시각 기준 자동 메시지
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANNEL_ALIASES = {
  prod: 'production',
  production: 'production',
  preview: 'preview',
};

function parseArgs(argv) {
  const out = {
    platform: 'all',
    channel: 'production',
    runtimeVersion: null,
    applyMode: 'immediate',
    message: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };

    if (a === '--platform' || a === '-p') out.platform = next();
    else if (a === '--channel') out.channel = next();
    else if (a === '--runtime-version') out.runtimeVersion = next();
    else if (a === '--apply-mode') out.applyMode = next();
    else if (a === '--message' || a === '-m') out.message = next();
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--api-base-url') {
      // see-on 프로젝트 CLI 호환 — EAS Update에서는 무시
      next();
      console.warn('[ota:upload] --api-base-url 은 EAS Update에서 무시됩니다.');
    } else {
      console.error(`[ota:upload] 알 수 없는 옵션: ${a}`);
      process.exit(1);
    }
  }

  return out;
}

function readAppRuntimeVersion() {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return String(appJson?.expo?.runtimeVersion ?? '');
}

function defaultMessage() {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  return `OTA ${stamp}`;
}

function printHelp() {
  console.log(`Usage:
  npm run ota:upload
  npm run ota:upload -- --platform all --channel prod
  npm run ota:upload -- --platform ios --channel preview -m "핫픽스"

Flags:
  --platform ios|android|all     (default: all = ios+android, web 제외)
  --channel prod|production|preview  (default: production)
  --runtime-version <ver>        warn if mismatch with app.json
  --apply-mode immediate|next-launch  (info only; app applies on splash)
  --message / -m <text>          (default: auto timestamp)
  --api-base-url <url>           ignored (EAS Update uses Expo CDN)
`);
}

function runEasUpdate({ channel, platform, message }) {
  const args = [
    'eas-cli',
    'update',
    '--channel',
    channel,
    '--platform',
    platform,
    '--message',
    message,
    '--non-interactive',
  ];

  console.log(`[ota:upload] eas update --platform ${platform} ...`);
  const result = spawnSync('npx', args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1' },
  });
  return result.status ?? 1;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const channel = CHANNEL_ALIASES[opts.channel];
  if (!channel) {
    console.error(`[ota:upload] 지원하지 않는 channel: ${opts.channel}`);
    process.exit(1);
  }

  if (!['ios', 'android', 'all'].includes(opts.platform)) {
    console.error(`[ota:upload] 지원하지 않는 platform: ${opts.platform}`);
    process.exit(1);
  }

  if (!['immediate', 'next-launch'].includes(opts.applyMode)) {
    console.error(`[ota:upload] 지원하지 않는 apply-mode: ${opts.applyMode}`);
    process.exit(1);
  }

  const appRuntime = readAppRuntimeVersion();
  if (opts.runtimeVersion && opts.runtimeVersion !== appRuntime) {
    console.warn(
      `[ota:upload] --runtime-version ${opts.runtimeVersion} ≠ app.json(${appRuntime}). EAS는 app.json runtimeVersion을 사용합니다.`,
    );
  }

  const message = opts.message?.trim() || defaultMessage();

  console.log('[ota:upload]', {
    platform: opts.platform,
    channel,
    runtimeVersion: appRuntime,
    applyMode: opts.applyMode,
    message,
  });

  if (opts.applyMode === 'next-launch') {
    console.warn(
      '[ota:upload] 앱은 스플래시에서 immediate 적용합니다. next-launch 플래그는 기록용입니다.',
    );
  }

  // `eas update --platform all` 은 web static export까지 돌려 AdMob 등에서 실패함.
  // all = 모바일만 (ios → android 순).
  const platforms =
    opts.platform === 'all' ? ['ios', 'android'] : [opts.platform];

  for (const platform of platforms) {
    const code = runEasUpdate({ channel, platform, message });
    if (code !== 0) {
      process.exit(code);
    }
  }

  process.exit(0);
}

main();
