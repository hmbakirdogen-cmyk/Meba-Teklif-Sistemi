'use strict';

/**
 * launcher/spawnChildren.cjs — Backend (server.cjs) child process spawn'ı.
 *
 * Electron geçişinde require('./server/server.cjs') ile in-process'e taşınır.
 */

const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const SERVER_SCRIPT = path.join(__dirname, '..', 'server', 'server.cjs');

function spawnBackend({ port = 3001, onLog = () => {}, onError = () => {} } = {}) {
  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MEBA_BACKEND_PORT: String(port) },
  });

  child.stdout.on('data', (data) => onLog(`[backend] ${data.toString().trim()}`));
  child.stderr.on('data', (data) => onError(`[backend] ${data.toString().trim()}`));

  child.on('exit', (code, signal) => {
    onLog(`[backend] exit: code=${code} signal=${signal}`);
  });

  return child;
}

/**
 * /api/health endpoint'ine bağlanıp 200 dönene kadar bekle.
 * Max timeout 12 saniye, deneme aralığı 250 ms.
 */
function waitForHealth(port, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryProbe = () => {
      const req = http.get(
        { hostname: 'localhost', port, path: '/api/health', timeout: 1000 },
        (res) => {
          if (res.statusCode === 200) {
            res.resume();
            return resolve();
          }
          res.resume();
          if (Date.now() - start > timeoutMs) reject(new Error('health check timeout'));
          else setTimeout(tryProbe, 250);
        },
      );
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('health check timeout'));
        else setTimeout(tryProbe, 250);
      });
      req.on('timeout', () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error('health check timeout'));
        else setTimeout(tryProbe, 250);
      });
    };
    tryProbe();
  });
}

module.exports = { spawnBackend, waitForHealth };
