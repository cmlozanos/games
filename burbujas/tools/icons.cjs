'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

(async () => {
    const svg = fs.readFileSync(path.join(root, 'icons/icon.svg'));
    for (const size of [192, 512]) {
        const target = path.join(root, 'icons', 'icon-' + size + '.png');
        await sharp(svg).resize(size, size).png().toFile(target);
        const metadata = await sharp(target).metadata();
        if (metadata.width !== size || metadata.height !== size || metadata.format !== 'png') {
            throw new Error('Invalid generated icon: ' + target);
        }
        console.log('Generated icons/icon-' + size + '.png');
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
