/**
 * Resizes assets/icon.jpg and places it into all Android mipmap folders.
 * Run with: node scripts/set-icon.js
 */
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../assets/icon.png');

const ANDROID_SIZES = [
  { folder: 'mipmap-mdpi',     size: 48  },
  { folder: 'mipmap-hdpi',     size: 72  },
  { folder: 'mipmap-xhdpi',    size: 96  },
  { folder: 'mipmap-xxhdpi',   size: 144 },
  { folder: 'mipmap-xxxhdpi',  size: 192 },
];

const RES_DIR = path.resolve(__dirname, '../android/app/src/main/res');

async function run() {
  if (!fs.existsSync(SRC)) {
    console.error('Source icon not found at: ' + SRC);
    process.exit(1);
  }

  const img = await Jimp.read(SRC);
  console.log(`✅  Loaded source icon (${img.width}x${img.height})`);

  for (const { folder, size } of ANDROID_SIZES) {
    const dir = path.join(RES_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    const launcherPath      = path.join(dir, 'ic_launcher.png');
    const launcherRoundPath = path.join(dir, 'ic_launcher_round.png');

    const resized = img.clone().resize({ w: size, h: size });
    await resized.write(launcherPath);
    await img.clone().resize({ w: size, h: size }).write(launcherRoundPath);

    console.log(`  ${folder}  →  ${size}x${size}px`);
  }

  console.log('\nAndroid icons generated successfully!');
  console.log(' Rebuild the app with: npx react-native run-android');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
