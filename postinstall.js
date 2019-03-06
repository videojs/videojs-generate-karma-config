#!/usr/bin/env node

/* eslint-disable no-console */
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const findRoot = require('find-root');
// get the patch package binary location
const patchPackageRoot = path.dirname(require.resolve('patch-package/package.json'));
const patchPackagePkg = require(path.join(patchPackageRoot, 'package.json'));
const patchPackage = path.join(patchPackageRoot, patchPackagePkg.bin['patch-package']);

let rootDir;

if (process.env.INIT_CWD) {
  rootDir = process.env.INIT_CWD;
} else {
  rootDir = findRoot(process.cwd());
}

const result = spawnSync(patchPackage, [
  // patch package expects a relative patch dir
  '--patch-dir', path.relative(rootDir, path.join(__dirname, 'patches'))
], {cwd: rootDir, stdio: 'inherit', env: process.env});

process.exit(result.status);
