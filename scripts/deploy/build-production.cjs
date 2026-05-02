'use strict';

/**
 * build-production.cjs — Production deployment paketi olusturucu.
 *
 * Calisma adimlari:
 *   1. dist/ ve build-deployment/ temizle
 *   2. tsc + vite build      -> dist/
 *   3. compile-server.cjs    -> build-deployment/server/*.jsc + .cjs stub
 *   4. dist/ kopyala         -> build-deployment/dist/
 *   5. bin/node.exe kopyala  -> build-deployment/bin/
 *   6. public/ kopyala       -> dist/'e Vite zaten kopyaliyor (atla)
 *   7. config/ template      -> build-deployment/config/
 *   8. Slim package.json     -> build-deployment/package.json (sadece bytenode)
 *   9. start.bat / stop.bat / kurulum-talimatlari.txt -> kopyala
 *  10. npm ci --omit=dev     -> build-deployment/node_modules/ (bytenode)
 *
 * Ciktilar Mehmet PC'sinde olusur. build-deployment/ klasoru oldugu gibi
 * USB/network ile server PC'ye kopyalanir; orada `start.bat` calistirilir.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT       = path.resolve(__dirname, '..', '..');
const DEPLOY_DIR = path.join(ROOT, 'build-deployment');
const DIST_DIR   = path.join(ROOT, 'dist');

const log = (msg) => console.log(`[build] ${msg}`);

function rmDir(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dst, opts = {}) {
  const { skip = () => false } = opts;
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcAbs = path.join(src, entry.name);
    const dstAbs = path.join(dst, entry.name);
    const rel    = path.relative(ROOT, srcAbs);
    if (skip(rel, entry)) continue;
    if (entry.isDirectory()) {
      copyDir(srcAbs, dstAbs, opts);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcAbs, dstAbs);
    }
  }
}

function run(cmd, opts = {}) {
  log(`> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

// ---------------------------------------------------------------------------

function step1_clean() {
  log('temizleniyor: dist/, build-deployment/');
  rmDir(DIST_DIR);
  rmDir(DEPLOY_DIR);
  ensureDir(DEPLOY_DIR);
}

function step2_buildFrontend() {
  log('frontend build (tsc + vite)...');
  run('npm run build');
}

function step3_compileServer() {
  log('server bytenode derleme...');
  require('./compile-server.cjs');
  // Yukaridaki require modulu yuklerken main() calisir mi? Hayir, sadece
  // require.main kontrol var. Manuel cagiriyoruz:
  const { compileOne, COMPILE_TARGETS } = require('./compile-server.cjs');
  for (const t of COMPILE_TARGETS) compileOne(t);
}

function step4_copyDist() {
  log('dist/ kopyalaniyor...');
  copyDir(DIST_DIR, path.join(DEPLOY_DIR, 'dist'));
}

function step5_copyNodeBinary() {
  const srcBin = path.join(ROOT, 'bin');
  if (!fs.existsSync(srcBin)) {
    log('UYARI: bin/ klasoru yok, node.exe manuel kopyalanmali.');
    return;
  }
  log('bin/node.exe kopyalaniyor...');
  copyDir(srcBin, path.join(DEPLOY_DIR, 'bin'));
}

function step6_copyConfig() {
  log('config template kopyalaniyor...');
  copyDir(path.join(ROOT, 'config'), path.join(DEPLOY_DIR, 'config'));
}

function step7_writeSlimPackageJson() {
  log('slim package.json yaziliyor...');
  const orig = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const slim = {
    name:        orig.name,
    productName: orig.productName,
    version:     orig.version,
    private:     true,
    scripts: {
      start: 'node launcher.cjs',
    },
    dependencies: {
      bytenode: orig.dependencies.bytenode,
    },
  };
  fs.writeFileSync(
    path.join(DEPLOY_DIR, 'package.json'),
    JSON.stringify(slim, null, 2),
    'utf8',
  );
}

function step8_copyDeployArtifacts() {
  log('start.bat / stop.bat / kurulum-talimatlari.txt kopyalaniyor...');
  for (const f of ['start.bat', 'stop.bat', 'kurulum-talimatlari.txt']) {
    const src = path.join(__dirname, f);
    if (!fs.existsSync(src)) {
      log(`UYARI: ${f} yok, atlandi.`);
      continue;
    }
    fs.copyFileSync(src, path.join(DEPLOY_DIR, f));
  }
}

function step9_installProdDeps() {
  log('build-deployment/ icinde npm install (sadece bytenode)...');
  run('npm install --omit=dev --no-audit --no-fund --prefix build-deployment', {
    cwd: ROOT,
  });
}

function step10_seedEmptyDb() {
  // Production server kendi db.json'unu tasimasi gerekir.
  // Ilk kurulumda bos sablon ekliyoruz; mevcut DB varsa onun uzerine yazmaz.
  const dbDst = path.join(DEPLOY_DIR, 'server', 'db.json');
  if (fs.existsSync(dbDst)) return;
  ensureDir(path.dirname(dbDst));
  // Mehmet PC'sindeki db.json'i seed olarak kopyalama. Server PC'de gercek
  // veri zaten var olacaksa kurulum talimatlari uyarir.
  const dbSrc = path.join(ROOT, 'server', 'db.json');
  if (fs.existsSync(dbSrc)) {
    fs.copyFileSync(dbSrc, dbDst);
    log('server/db.json kopyalandi (Mehmet PC -> deploy).');
  }
}

// ---------------------------------------------------------------------------

function main() {
  const t0 = Date.now();
  step1_clean();
  step2_buildFrontend();
  step3_compileServer();
  step4_copyDist();
  step5_copyNodeBinary();
  step6_copyConfig();
  step7_writeSlimPackageJson();
  step8_copyDeployArtifacts();
  step9_installProdDeps();
  step10_seedEmptyDb();

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  log('---');
  log(`Hazir: ${DEPLOY_DIR}`);
  log(`Sure: ${dt}s`);
  log('Sunucuda calistir: bin/node.exe launcher.cjs   (veya start.bat)');
}

if (require.main === module) main();
module.exports = { main };
