const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_SRC   = String.raw`C:\Users\Joshan\.gemini\antigravity\brain\f3061532-f698-4a28-a008-25856d571be9\jpm_icon_1773016920540.png`;
const SPLASH_SRC = String.raw`C:\Users\Joshan\.gemini\antigravity\brain\f3061532-f698-4a28-a008-25856d571be9\jp_splash_1773017830589.png`;
const RES = path.join(__dirname, 'app', 'src', 'main', 'res');

const ICON_DENSITIES = [
  ['mipmap-mdpi',    48],
  ['mipmap-hdpi',    72],
  ['mipmap-xhdpi',   96],
  ['mipmap-xxhdpi',  144],
  ['mipmap-xxxhdpi', 192],
];

const SPLASH_DENSITIES = [
  ['drawable',              1080, 1920],
  ['drawable-port-mdpi',    320,  480 ],
  ['drawable-port-hdpi',    480,  800 ],
  ['drawable-port-xhdpi',   720,  1280],
  ['drawable-port-xxhdpi',  1080, 1920],
  ['drawable-port-xxxhdpi', 1440, 2560],
  ['drawable-land-mdpi',    480,  320 ],
  ['drawable-land-hdpi',    800,  480 ],
  ['drawable-land-xhdpi',   1280, 720 ],
  ['drawable-land-xxhdpi',  1920, 1080],
  ['drawable-land-xxxhdpi', 2560, 1440],
];

async function run() {
  // Icons
  for (const [folder, size] of ICON_DENSITIES) {
    const dir = path.join(RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      const dest = path.join(dir, name);
      await sharp(ICON_SRC).resize(size, size).png().toFile(dest);
      console.log(`icon → ${folder}/${name} (${size}x${size})`);
    }
  }

  // Splash screens — pad with white to fill target resolution
  for (const [folder, w, h] of SPLASH_DENSITIES) {
    const dir = path.join(RES, folder);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, 'splash.png');
    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 10, g: 10, b: 10, alpha: 1 }
      }
    })
      .png()
      .toFile(dest);
    console.log(`splash (blank) → ${folder}/splash.png (${w}x${h})`);
  }

  console.log('\n✅  All Android assets replaced!');
}

run().catch(e => { console.error(e); process.exit(1); });
