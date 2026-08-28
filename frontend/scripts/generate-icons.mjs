import sharp from 'sharp';
import { mkdirSync, existsSync, copyFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'assets/icon-source.png');

const mkd = (p) => mkdirSync(p, { recursive: true });

// Brand blue used to fill the four mask corners so the marketing icon is a
// clean, fully-opaque square (App Store Connect rejects icons with an alpha
// channel or transparency). The gradient direction matches the artwork.
const GRAD_TL = '#0125B5';
const GRAD_BR = '#0A85FF';
const FLAT_BG = '#0A5BEF';

// iOS icon sizes required by App Store Connect
const iosSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

// Android mipmap densities
const androidSizes = [
  { size: 48,  dir: 'mipmap-mdpi' },
  { size: 72,  dir: 'mipmap-hdpi' },
  { size: 96,  dir: 'mipmap-xhdpi' },
  { size: 144, dir: 'mipmap-xxhdpi' },
  { size: 192, dir: 'mipmap-xxxhdpi' },
  { size: 512, dir: 'playstore' },
];

// PWA sizes
const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Source artwork trimmed of its transparent margin, reused for every render.
const artwork = sharp(src).trim({ threshold: 12 }).toBuffer();

function gradient(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRAD_TL}"/>
      <stop offset="1" stop-color="${GRAD_BR}"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
  return Buffer.from(svg);
}

// Full-bleed, fully-opaque square. The source art is a rendered icon tile with
// its own rounded bevel; overscaling slightly pushes that rounding past the
// frame so the result reads as edge-to-edge on the brand gradient, and the
// platform corner mask only ever clips matching colour. Fully flattened —
// App Store Connect rejects any alpha channel on the 1024 marketing icon.
const OVERSCALE = 1.12;
async function iconSquare(size) {
  const zoom = Math.round(size * OVERSCALE);
  const off = Math.round((zoom - size) / 2);
  const art = await sharp(await artwork)
    .resize(zoom, zoom, { fit: 'cover', position: 'centre' })
    .extract({ left: off, top: off, width: size, height: size })
    .png()
    .toBuffer();

  return sharp(gradient(size))
    .composite([{ input: art }])
    .flatten({ background: FLAT_BG })
    .removeAlpha()
    .png()
    .toBuffer();
}

// Android adaptive-icon foreground: artwork inside the safe zone on a
// transparent canvas (the launcher supplies the blue background colour).
async function adaptiveForeground(size) {
  const inner = Math.round(size * 0.78);
  const art = await sharp(await artwork)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const pad = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toBuffer();
}

async function run() {
  // ── iOS ─────────────────────────────────────────────────────────
  const iosOut = join(root, 'assets/ios');
  mkd(iosOut);
  const appiconset = join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
  for (const size of iosSizes) {
    const buf = await iconSquare(size);
    await sharp(buf).toFile(join(iosOut, `icon-${size}.png`));
    if (existsSync(appiconset)) await sharp(buf).toFile(join(appiconset, `icon-${size}.png`));
    console.log(`iOS  ${size}x${size}`);
  }
  // Drop the stale, unreferenced icon that trips an Xcode asset-catalog warning.
  const stale = join(appiconset, 'AppIcon-512@2x.png');
  if (existsSync(stale)) { rmSync(stale); console.log('iOS  removed stale AppIcon-512@2x.png'); }

  // ── Android ──────────────────────────────────────────────────────
  const resDir = join(root, 'android/app/src/main/res');
  for (const { size, dir } of androidSizes) {
    const out = join(root, 'assets/android', dir);
    mkd(out);
    const buf = await iconSquare(size);
    await sharp(buf).toFile(join(out, 'ic_launcher.png'));
    await sharp(buf).toFile(join(out, 'ic_launcher_round.png'));

    if (dir !== 'playstore' && existsSync(join(resDir, dir))) {
      await sharp(buf).toFile(join(resDir, dir, 'ic_launcher.png'));
      await sharp(buf).toFile(join(resDir, dir, 'ic_launcher_round.png'));
      const fg = await adaptiveForeground(size);
      await sharp(fg).toFile(join(out, 'ic_launcher_foreground.png'));
      await sharp(fg).toFile(join(resDir, dir, 'ic_launcher_foreground.png'));
    }
    console.log(`Android ${dir} ${size}x${size}`);
  }

  // ── PWA (public/icons) ───────────────────────────────────────────
  const pwaOut = join(root, 'public/icons');
  mkd(pwaOut);
  for (const size of pwaSizes) {
    const buf = await iconSquare(size);
    await sharp(buf).toFile(join(pwaOut, `icon-${size}.png`));
    console.log(`PWA  ${size}x${size}`);
  }

  // ── Splash (2732x2732 — artwork centred on the app's navy backdrop,
  //    matching capacitor.config.ts SplashScreen.backgroundColor) ─────
  const SPLASH_BG = '#0a0a3a';
  const splashOut = join(root, 'assets/splash');
  mkd(splashOut);
  const splashArt = await sharp(await artwork)
    .resize(760, 760, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const splashBuf = await sharp({ create: { width: 2732, height: 2732, channels: 4, background: SPLASH_BG } })
    .composite([{ input: splashArt, gravity: 'center' }])
    .flatten({ background: SPLASH_BG })
    .removeAlpha()
    .png()
    .toBuffer();
  await sharp(splashBuf).toFile(join(splashOut, 'splash.png'));

  const iosSplash = join(root, 'ios/App/App/Assets.xcassets/Splash.imageset');
  if (existsSync(iosSplash)) {
    for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
      await sharp(splashBuf).toFile(join(iosSplash, name));
    }
  }
  for (const variant of [
    'drawable', 'drawable-land-mdpi', 'drawable-land-hdpi', 'drawable-land-xhdpi',
    'drawable-land-xxhdpi', 'drawable-land-xxxhdpi', 'drawable-port-mdpi', 'drawable-port-hdpi',
    'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi',
  ]) {
    const p = join(resDir, variant, 'splash.png');
    if (existsSync(p)) await sharp(splashBuf).toFile(p);
  }
  console.log('Splash 2732x2732');

  // ── Public root copies + favicon ─────────────────────────────────
  await sharp(await iconSquare(192)).toFile(join(root, 'public/icon-192.png'));
  await sharp(await iconSquare(512)).toFile(join(root, 'public/icon-512.png'));
  await sharp(await iconSquare(1024)).toFile(join(root, 'public/icon-1024.png'));
  await sharp(await iconSquare(32)).toFile(join(root, 'public/favicon.png'));
  await sharp(await iconSquare(180)).toFile(join(root, 'public/apple-touch-icon.png'));

  console.log('\n✓ All icons generated from assets/icon-source.png');
}

run().catch(err => { console.error(err); process.exit(1); });
