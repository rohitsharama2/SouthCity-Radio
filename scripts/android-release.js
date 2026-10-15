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

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Fail before rebuilding web assets if signing has not been configured.
run(gradle, ['--no-daemon', ':app:validateReleaseConfiguration'], android);
run(npm, ['run', 'build:android'], root);
run(gradle, ['--no-daemon', ...targets[target].map((task) => `:app:${task}`)], android);

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
