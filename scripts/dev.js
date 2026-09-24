// Starts the consumer app and admin portal together; stopping one stops both.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { workspacePorts } from '../src/data/workspaces.js';

const vitePackage = createRequire(import.meta.url).resolve('vite/package.json');
const vite = join(dirname(vitePackage), 'bin/vite.js');
const workspaces = [
  { name: 'app', color: 36, args: [] },
  { name: 'admin', color: 35, args: ['--mode', 'admin'] },
];
const colorize = process.stdout.isTTY && !process.env.NO_COLOR;
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}

for (const { name, color, args } of workspaces) {
  const label = `[${name}]`.padEnd(8);
  const prefix = colorize ? `\x1b[${color}m${label}\x1b[0m` : label;
  const child = spawn(process.execPath, [vite, ...args], {
    // Vite enables color whenever FORCE_COLOR is present, so only set it for terminals.
    env: colorize ? { ...process.env, FORCE_COLOR: '1' } : { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  for (const [stream, out] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    let buffered = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      const lines = (buffered + chunk).split('\n');
      buffered = lines.pop();
      for (const line of lines) out.write(`${prefix} ${line}\n`);
    });
    stream.on('end', () => buffered && out.write(`${prefix} ${buffered}\n`));
  }
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${prefix} exited (${signal ?? code}); stopping the other server.`);
    stop(code || 1);
  });
}

console.log(
  `SouthCity dev: app http://localhost:${workspacePorts.app} · admin http://localhost:${workspacePorts.admin} (Ctrl+C stops both)`,
);
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
