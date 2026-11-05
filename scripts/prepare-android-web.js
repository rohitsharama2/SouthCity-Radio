import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const source = path.join(root, 'dist/player/index.html');
const target = path.join(root, 'dist/index.html');
if (!existsSync(source)) throw new Error(`Android listener entry was not built: ${source}`);
copyFileSync(source, target);
console.log(`Android listener entry prepared: ${target}`);
