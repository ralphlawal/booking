import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgBuffer = readFileSync(join(root, 'assets/icon.svg'));

const mkd = (p) => mkdirSync(p, { recursive: true });

// iOS icon sizes required by App Store Connect
const iosSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

// Android icon sizes (mipmap densities)
const androidSizes = [
  { size: 48,  dir: 'mipmap-mdpi' },
  { size: 72,  dir: 'mipmap-hdpi' },
  { size: 96,  dir: 'mipmap-xhdpi' },
  { size: 144, dir: 'mipmap-xxhdpi' },
  { size: 192, dir: 'mipmap-xxxhdpi' },
  { size: 512, dir: 'playstore' },
];

// PWA manifest sizes
const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  // ── iOS ────────────────────────────────────
  const iosOut = join(root, 'assets/ios');
  mkd(iosOut);
  for (const size of iosSizes) {
    await sharp(svgBuffer).resize(size, size).png().toFile(join(iosOut, `icon-${size}.png`));
    console.log(`iOS  ${size}x${size}`);
  }

  // ── Android ────────────────────────────────
  for (const { size, dir } of androidSizes) {
    const out = join(root, 'assets/android', dir);
    mkd(out);
    await sharp(svgBuffer).resize(size, size).png().toFile(join(out, 'ic_launcher.png'));
    // Round icon variant
    await sharp(svgBuffer).resize(size, size).png().toFile(join(out, 'ic_launcher_round.png'));
    console.log(`Android ${dir} ${size}x${size}`);
  }

  // ── PWA (public/icons) ────────────────────
  const pwaOut = join(root, 'public/icons');
  mkd(pwaOut);
  for (const size of pwaSizes) {
    await sharp(svgBuffer).resize(size, size).png().toFile(join(pwaOut, `icon-${size}.png`));
    console.log(`PWA  ${size}x${size}`);
  }

  // ── Splash screen (2732x2732 purple bg with centred icon) ─
  const splashOut = join(root, 'assets/splash');
  mkd(splashOut);
  const iconLayer = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: { r: 91, g: 62, b: 234, alpha: 1 } },
  })
    .composite([{ input: iconLayer, gravity: 'center' }])
    .png()
    .toFile(join(splashOut, 'splash.png'));
  console.log('Splash 2732x2732');

  // Copy 1024 icon to public/ for favicon
  await sharp(svgBuffer).resize(1024, 1024).png().toFile(join(root, 'public/icon-1024.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(join(root, 'public/icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(join(root, 'public/icon-512.png'));

  console.log('\n✓ All icons generated');
}

run().catch(err => { console.error(err); process.exit(1); });
