import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'assets/icon-source.png');

const mkd = (p) => mkdirSync(p, { recursive: true });

// Dark navy background matching the icon's corner colour
const BG = { r: 10, g: 10, b: 58, alpha: 1 };


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

async function resized(size) {
  // Resize source onto a flat navy square (no transparency)
  const iconBuf = await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: iconBuf }])
    .png()
    .toBuffer();
}

async function run() {
  // ── iOS ─────────────────────────────────────────────────────────
  const iosOut = join(root, 'assets/ios');
  mkd(iosOut);
  for (const size of iosSizes) {
    const buf = await resized(size);
    await sharp(buf).toFile(join(iosOut, `icon-${size}.png`));
    console.log(`iOS  ${size}x${size}`);
  }

  // ── Android ──────────────────────────────────────────────────────
  for (const { size, dir } of androidSizes) {
    const out = join(root, 'assets/android', dir);
    mkd(out);
    const buf = await resized(size);
    await sharp(buf).toFile(join(out, 'ic_launcher.png'));
    await sharp(buf).toFile(join(out, 'ic_launcher_round.png'));
    console.log(`Android ${dir} ${size}x${size}`);
  }

  // ── PWA (public/icons) ───────────────────────────────────────────
  const pwaOut = join(root, 'public/icons');
  mkd(pwaOut);
  for (const size of pwaSizes) {
    const buf = await resized(size);
    await sharp(buf).toFile(join(pwaOut, `icon-${size}.png`));
    console.log(`PWA  ${size}x${size}`);
  }

  // ── Splash (2732x2732 — icon centred on navy background) ─────────
  const splashOut = join(root, 'assets/splash');
  mkd(splashOut);
  const iconLayer = await sharp(src).resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
    .composite([{ input: iconLayer, gravity: 'center' }])
    .png()
    .toFile(join(splashOut, 'splash.png'));
  console.log('Splash 2732x2732');

  // ── Public root copies ────────────────────────────────────────────
  const buf192  = await resized(192);
  const buf512  = await resized(512);
  const buf1024 = await resized(1024);
  await sharp(buf192).toFile(join(root, 'public/icon-192.png'));
  await sharp(buf512).toFile(join(root, 'public/icon-512.png'));
  await sharp(buf1024).toFile(join(root, 'public/icon-1024.png'));

  // ── Favicon (32x32) ───────────────────────────────────────────────
  const buf32 = await resized(32);
  await sharp(buf32).toFile(join(root, 'public/favicon.png'));

  console.log('\n✓ All icons generated from real asset');
}

run().catch(err => { console.error(err); process.exit(1); });
