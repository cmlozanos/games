'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
(async () => {
  fs.mkdirSync(path.join(root, 'icons'), {recursive: true});
  for (const size of [192, 512]) {
    const target = path.join(root, 'icons', 'icon-' + size + '.png');
    await sharp(path.join(root, 'icon.svg')).resize(size, size).png().toFile(target);
    const metadata = await sharp(target).metadata();
    if (metadata.width !== size || metadata.height !== size) throw Error('Invalid icon size');
    console.log('Generated icons/icon-' + size + '.png');
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
