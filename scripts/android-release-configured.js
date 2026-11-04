import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const versionFile = path.join(root, 'android/release-version.json');
const output = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
const version = JSON.parse(readFileSync(versionFile, 'utf8'));

if (!Number.isInteger(version.versionCode) || version.versionCode < 1)
  throw new Error('android/release-version.json: versionCode must be a positive integer.');
if (!/^\d+\.\d+\.\d+$/.test(version.versionName))
  throw new Error('android/release-version.json: versionName must look like 1.2.3.');

const result = spawnSync('npm', ['run', 'android:aab'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    ANDROID_VERSION_CODE: String(version.versionCode),
    ANDROID_VERSION_NAME: version.versionName,
  },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!existsSync(output)) throw new Error(`Expected AAB was not created: ${output}`);
console.log(`Release ready: ${output}`);
console.log(`Version: ${version.versionName} (code ${version.versionCode})`);
