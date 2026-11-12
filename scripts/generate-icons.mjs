// Genera logo, favicon e icone PWA di Agendly a partire da SVG.
// Uso: npm run icons
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

// Android / Chrome / Edge: dimensioni aggiuntive per launcher e installazione.
for (const size of [48, 72, 96, 128, 144, 256, 384]) await png(appIcon, size, `public/icons/icon-${size}.png`);
await png(maskable, 192, 'public/icons/icon-maskable-192.png');

// Windows: riquadri del menu Start (browserconfig.xml).
for (const size of [70, 150, 310]) await png(svg(symbol(WHITE, 0.62)), size, `public/icons/mstile-${size}.png`);
await sharp({ create: { width: 310, height: 150, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await sharp(Buffer.from(svg(symbol(WHITE, 0.62))), { density: 384 }).resize(150, 150).png().toBuffer(), left: 80, top: 0 }])
  .png()
  .toFile('public/icons/mstile-310x150.png');

// iOS: schermate di avvio (apple-touch-startup-image), solo verticale.
const IOS_SPLASH = [
  [1320, 2868, 440, 956, 3], [1206, 2622, 402, 874, 3], [1290, 2796, 430, 932, 3], [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3], [1170, 2532, 390, 844, 3], [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2], [1242, 2208, 414, 736, 3], [750, 1334, 375, 667, 2], [640, 1136, 320, 568, 2],
  [2048, 2732, 1024, 1366, 2], [1668, 2388, 834, 1194, 2], [1640, 2360, 820, 1180, 2], [1668, 2224, 834, 1112, 2],
  [1620, 2160, 810, 1080, 2], [1536, 2048, 768, 1024, 2], [1488, 2266, 744, 1133, 2],
];
const splashSvg = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.3);
  const fs = Math.round(s * 0.28);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BLUE}"/>
  <svg x="${(w - s) / 2}" y="${h / 2 - s * 0.75}" width="${s}" height="${s}" viewBox="0 0 512 512">${symbol(WHITE)}</svg>
  <text x="${w / 2}" y="${h / 2 + s * 0.55}" text-anchor="middle" font-family="Inter, 'Plus Jakarta Sans', system-ui, sans-serif" font-size="${fs}" font-weight="700" fill="${WHITE}">Agendly</text>
</svg>`;
};
await mkdir('public/splash', { recursive: true });
const links = [];
for (const [w, h, cw, ch, dpr] of IOS_SPLASH) {
  const file = `/splash/apple-splash-${w}x${h}.png`;
  await sharp(Buffer.from(splashSvg(w, h))).png({ compressionLevel: 9 }).toFile(`public${file}`);
  links.push(
    `    <link rel="apple-touch-startup-image" href="${file}" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`,
  );
}
const html = await readFile('index.html', 'utf8');
await writeFile(
  'index.html',
  html.replace(/ *<!-- ios-splash:start -->[\s\S]*<!-- ios-splash:end -->/, `    <!-- ios-splash:start -->\n${links.join('\n')}\n    <!-- ios-splash:end -->`),
);
console.log('Icone generate.');
