import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const android = path.join(root, 'android');
const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java'))) {
    return process.env.JAVA_HOME;
  }
  if (process.platform !== 'darwin') return null;

  const candidates = [
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  ];
  return candidates.find((candidate) => existsSync(path.join(candidate, 'bin', 'java'))) ?? null;
}

const javaHome = findJavaHome();
if (!javaHome) {
  console.error(
    'JDK 21 is required. Install it with `brew install openjdk@21`, or set JAVA_HOME to a JDK 21 installation.',
  );
  process.exit(1);
}

const result = spawnSync(gradle, process.argv.slice(2), {
  cwd: android,
  env: { ...process.env, JAVA_HOME: javaHome },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`Could not run Gradle: ${result.error.message}`);
}
process.exit(result.error || result.status === null ? 1 : result.status);
