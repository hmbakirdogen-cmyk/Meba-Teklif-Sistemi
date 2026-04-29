'use strict';

/**
 * launcher/openBrowser.cjs — Platform-agnostik tarayıcı açma.
 *
 * Electron geçişinde bu modül BrowserWindow.loadURL ile değişir.
 * Mevcut server.cjs'deki dosyaAc helper'ının pattern'i kullanılır.
 */

const { spawn } = require('child_process');

function openBrowser(url) {
  if (!url) return false;
  try {
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    }
    if (process.platform === 'darwin') {
      const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    }
    const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch (err) {
    console.error('[openBrowser] Tarayıcı açılamadı:', err.message);
    return false;
  }
}

module.exports = { openBrowser };
