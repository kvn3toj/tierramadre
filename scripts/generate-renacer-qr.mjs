/**
 * Generates the print-ready QR for the Kit Renacer bracelet tag.
 *
 * Target: https://tierramadre.app/renacer
 * Output: public/qr-renacer.svg (vector, use this for printing)
 *
 * Run: node scripts/generate-renacer-qr.mjs [url] [outfile]
 */
import { writeFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const url = process.argv[2] ?? 'https://tierramadre.app/renacer';
const out = process.argv[3] ?? 'public/qr-renacer.svg';

const svg = renderToStaticMarkup(
  React.createElement(QRCodeSVG, {
    value: url,
    size: 1024,
    level: 'H', // highest error correction — survives print + fabric tags
    marginSize: 4,
    bgColor: '#FFFFFF',
    fgColor: '#04150F',
  }),
);

writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log(`QR -> ${out}  (${url})`);
