'use strict';

/**
 * Bytenode compiler — server/*.cjs ve launcher*.cjs dosyalarini
 * V8 bytecode'a (.jsc) derler. Kaynak kod sunucu tarafinda okunamaz hale gelir.
 *
 * Cikti: <DEPLOY_DIR>/<orijinal yol>.jsc + ayni isimle .cjs stub yukleyici.
 */

const fs   = require('fs');
const path = require('path');
const bytenode = require('bytenode');

const ROOT       = path.resolve(__dirname, '..', '..');
const DEPLOY_DIR = path.join(ROOT, 'build-deployment');

const COMPILE_TARGETS = [
  'server/server.cjs',
  'server/auth-routes.cjs',
  'server/auth-helper.cjs',
  'server/backupScheduler.cjs',
  'launcher.cjs',
  'launcher/openBrowser.cjs',
  'launcher/pidLock.cjs',
  'launcher/spawnChildren.cjs',
  'launcher/staticServer.cjs',
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function compileOne(relPath) {
  const srcAbs = path.join(ROOT, relPath);
  if (!fs.existsSync(srcAbs)) {
    console.warn(`[compile] atlandi (yok): ${relPath}`);
    return false;
  }
  const outRel    = relPath.replace(/\.cjs$/, '.jsc');
  const outAbs    = path.join(DEPLOY_DIR, outRel);
  const stubAbs   = path.join(DEPLOY_DIR, relPath);
  ensureDir(path.dirname(outAbs));

  bytenode.compileFile({
    filename: srcAbs,
    output:   outAbs,
    compileAsModule: true,
  });

  const stubBody = `'use strict';\nrequire('bytenode');\nmodule.exports = require('./${path.basename(outRel)}');\n`;
  fs.writeFileSync(stubAbs, stubBody, 'utf8');

  console.log(`[compile] ${relPath} -> ${outRel}`);
  return true;
}

function main() {
  ensureDir(DEPLOY_DIR);
  let ok = 0;
  for (const t of COMPILE_TARGETS) {
    if (compileOne(t)) ok++;
  }
  console.log(`[compile] ${ok}/${COMPILE_TARGETS.length} dosya derlendi.`);
}

if (require.main === module) main();
module.exports = { compileOne, COMPILE_TARGETS };
