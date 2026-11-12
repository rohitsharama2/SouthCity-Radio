import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const android = path.join(root, 'android');
const target = process.argv[2];
const targets = {
  apk: ['assembleRelease'],
  aab: ['bundleRelease'],
  all: ['assembleRelease', 'bundleRelease'],
};

if (!targets[target] || process.argv.length > 3) {
  console.error('Usage: node scripts/android-release.js <apk|aab|all>');
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    // Windows npm and Gradle wrappers are batch files. Arguments here are fixed literals.
    shell: process.platform === 'win32',
  });
  if (result.error) console.error(`Could not run ${command}: ${result.error.message}`);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gradle = [process.execPath, path.join(root, 'scripts/run-gradle.js')];
// Fail before rebuilding web assets if signing has not been configured.
run(gradle[0], [...gradle.slice(1), '--no-daemon', ':app:validateReleaseConfiguration'], root);
run(npm, ['run', 'build:android'], root);
run(
  gradle[0],
  [...gradle.slice(1), '--no-daemon', ...targets[target].map((task) => `:app:${task}`)],
  root,
);

const artifacts = [];
if (target !== 'aab') artifacts.push('apk/release/app-release.apk');
if (target !== 'apk') artifacts.push('bundle/release/app-release.aab');
for (const artifact of artifacts) {
  const location = path.join(android, 'app/build/outputs', artifact);
  if (!existsSync(location)) {
    console.error(`Build finished but expected artifact is missing: ${location}`);
    process.exit(1);
  }
  console.log(`Signed release: ${location}`);
}
