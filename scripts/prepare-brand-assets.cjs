const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const at = p => path.join(root, p);
const write = (p, text) => {
  fs.mkdirSync(path.dirname(at(p)), { recursive: true });
  fs.writeFileSync(at(p), text);
};
async function main() {
  const icon = at('src/assets/shopkeeper-icon.png');
  for (const [density, size] of Object.entries({
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
  })) {
    const target = `android/app/src/main/res/mipmap-${density}`;
    await sharp(icon)
      .resize(size, size)
      .png()
      .toFile(at(`${target}/ic_launcher.png`));
    await sharp(icon)
      .resize(size, size)
      .png()
      .toFile(at(`${target}/ic_launcher_round.png`));
  }
  // Place the full master inside the adaptive icon safe area; storefront remains visible.
  const foreground = await sharp(icon).resize(666, 666).png().toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: foreground, left: 179, top: 179 }])
    .png()
    .toFile(
      at(
        'android/app/src/main/res/drawable-nodpi/zest_launcher_foreground.png',
      ),
    );
  const gradient = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#FF9817"/><stop offset=".52" stop-color="#F20A86"/><stop offset="1" stop-color="#5708E8"/></linearGradient></defs><path fill="url(#g)" d="M0 0h1024v1024H0z"/></svg>',
  );
  await sharp(gradient)
    .png()
    .toFile(
      at(
        'android/app/src/main/res/drawable-nodpi/zest_launcher_background.png',
      ),
    );
  await sharp(at('src/assets/shopkeeper-mascot.png'))
    .png()
    .toFile(
      at('android/app/src/main/res/drawable-nodpi/shopkeeper_launch.png'),
    );
  const ios = 'ios/ShopkeeperApp/Images.xcassets';
  const images = [];
  for (const [idiom, sizes, scales] of [
    ['iphone', [20, 29, 40, 60], [2, 3]],
    ['ipad', [20, 29, 40, 76], [1, 2]],
    ['ipad', [83.5], [2]],
    ['ios-marketing', [1024], [1]],
  ]) {
    for (const size of sizes)
      for (const scale of scales) {
        const filename = `icon-${idiom}-${size}@${scale}x.png`;
        await sharp(icon)
          .resize(Math.round(size * scale), Math.round(size * scale))
          .flatten({ background: '#5708E8' })
          .png()
          .toFile(at(`${ios}/AppIcon.appiconset/${filename}`));
        images.push({
          idiom,
          size: `${size}x${size}`,
          scale: `${scale}x`,
          filename,
        });
      }
  }
  write(
    `${ios}/AppIcon.appiconset/Contents.json`,
    JSON.stringify({ images, info: { author: 'xcode', version: 1 } }, null, 2),
  );
  const launch = `${ios}/ShopkeeperLaunch.imageset`;
  fs.mkdirSync(at(launch), { recursive: true });
  const launchImages = [];
  for (const scale of [1, 2, 3]) {
    const filename = `shopkeeper-launch@${scale}x.png`;
    await sharp(at('src/assets/shopkeeper-mascot.png'))
      .resize(240 * scale, 360 * scale)
      .png()
      .toFile(at(`${launch}/${filename}`));
    launchImages.push({ idiom: 'universal', scale: `${scale}x`, filename });
  }
  write(
    `${launch}/Contents.json`,
    JSON.stringify(
      { images: launchImages, info: { author: 'xcode', version: 1 } },
      null,
      2,
    ),
  );
  console.log(
    'Prepared launcher icons for Android/iOS and native splash artwork.',
  );
}
main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
