import { spawn } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: path.join(root, 'backend'),
    stdio: 'inherit',
    windowsHide: true,
  }),
  spawn(
    process.execPath,
    [
      path.join(root, 'frontend/node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
    ],
    { cwd: path.join(root, 'frontend'), stdio: 'inherit', windowsHide: true },
  ),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill());
}
process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
children.forEach(child => {
  child.on('error', error => {
    console.error(error.message);
    stop();
    process.exit(1);
  });
  child.on('exit', code => {
    if (!stopping) {
      stop();
      process.exit(code || 0);
    }
  });
});
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (chunk.includes('\u0003')) {
    stop();
    process.exit(0);
  }
});
