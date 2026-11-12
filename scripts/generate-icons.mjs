// Genera logo, favicon e icone PWA di Agendly a partire da SVG.
// Uso: npm run icons
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const BLUE = '#2563EB';
const BLUE_DARK = '#1E3A8A';
const WHITE = '#FFFFFF';

// Simbolo: calendario minimal con un check che prosegue in una freccia in avanti.
// Disegnato su una griglia 512x512, centrato.
const symbol = (color, scale = 1) => {
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`;
  return `
  <g transform="${t}" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="112" y="128" width="288" height="272" rx="56" stroke-width="32"/>
    <path d="M192 96v64M320 96v64" stroke-width="32"/>
    <path d="M176 296l52 52 108-108" stroke-width="40"/>
    <path d="M300 240h36v36" stroke-width="28"/>
  </g>`;
};

const svg = (inner, size = 512, bg) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${bg ?? ''}${inner}
</svg>`;

const rounded = (fill, rx = 112) => `<rect width="512" height="512" rx="${rx}" fill="${fill}"/>`;
const full = (fill) => `<rect width="512" height="512" fill="${fill}"/>`;

const appIcon = svg(symbol(WHITE, 0.92), 512, rounded(BLUE));
const maskable = svg(symbol(WHITE, 0.68), 512, full(BLUE));
const monoWhite = svg(symbol(WHITE));
const monoBlack = svg(symbol('#000000'));
const markBlue = svg(symbol(BLUE));

const wordmark = (textColor, iconBg, iconFg) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="240" viewBox="0 0 880 240">
  <svg x="20" y="20" width="200" height="200" viewBox="0 0 512 512">${rounded(iconBg)}${symbol(iconFg, 0.92)}</svg>
  <text x="252" y="158" font-family="Inter, 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif" font-size="124" font-weight="700" letter-spacing="-3" fill="${textColor}">Agendly</text>
</svg>`;

const splash = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BLUE}"/>
  <svg x="352" y="300" width="320" height="320" viewBox="0 0 512 512">${symbol(WHITE)}</svg>
  <text x="512" y="720" text-anchor="middle" font-family="Inter, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="88" font-weight="700" letter-spacing="-2" fill="${WHITE}">Agendly</text>
</svg>`;

const files = {
  'public/favicon.svg': appIcon,
  'public/logo/agendly-icon.svg': appIcon,
  'public/logo/agendly-mark.svg': markBlue,
  'public/logo/agendly-mono-white.svg': monoWhite,
  'public/logo/agendly-mono-black.svg': monoBlack,
  'public/logo/agendly-logo.svg': wordmark(BLUE_DARK, BLUE, WHITE),
  'public/logo/agendly-logo-dark.svg': wordmark(WHITE, WHITE, BLUE),
  'public/logo/agendly-splash.svg': splash,
};

await mkdir('public/icons', { recursive: true });
await mkdir('public/logo', { recursive: true });
for (const [path, content] of Object.entries(files)) await writeFile(path, content);

const png = (src, size, out) => sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toFile(out);
await png(appIcon, 192, 'public/icons/icon-192.png');
await png(appIcon, 512, 'public/icons/icon-512.png');
await png(maskable, 512, 'public/icons/icon-maskable-512.png');
await png(maskable, 180, 'public/apple-touch-icon.png');
await png(monoWhite, 96, 'public/icons/badge-96.png');
await png(appIcon, 32, 'public/icons/favicon-32.png');
await png(appIcon, 16, 'public/icons/favicon-16.png');
await writeFile('public/favicon.ico', await pngToIco(['public/icons/favicon-32.png', 'public/icons/favicon-16.png']));
await sharp(Buffer.from(splash), { density: 144 }).png().toFile('public/logo/agendly-splash.png');
console.log('Icone generate.');
