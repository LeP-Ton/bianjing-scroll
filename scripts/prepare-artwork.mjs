import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  if (!['--source', '--sharp-module'].includes(flag) || !process.argv[index + 1]) {
    throw new Error('用法：node scripts/prepare-artwork.mjs --source <原图JPG> [--sharp-module <sharp模块路径>]');
  }
  options[flag.slice(2)] = process.argv[index + 1];
}
if (!options.source) throw new Error('请通过 --source 指定高清原图');

// 编码工具可来自独立工具目录，不为静态网页增加运行依赖。
const sharp = require(options['sharp-module'] || 'sharp');
const sourcePath = path.resolve(options.source);
const outputDirectory = path.join(projectRoot, 'dist/assets/painting');
const originalPath = path.join(projectRoot, 'dist/assets/qingming-original.jpg');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const tileWidth = 1920;
const overlap = 1;

await fs.mkdir(outputDirectory, { recursive: true });
const originalBytes = await fs.readFile(sourcePath);
const originalHash = hash(originalBytes);
const normalizePath = filePath => process.platform === 'win32' ? filePath.toLowerCase() : filePath;
if (normalizePath(sourcePath) !== normalizePath(originalPath)) {
  await fs.copyFile(sourcePath, originalPath);
}
if (hash(await fs.readFile(originalPath)) !== originalHash) {
  throw new Error('原始 JPG 复制后哈希不一致');
}

// 只解码一次，在原始像素中裁切；不调用 resize，不再次使用有损编码。
const { data: sourcePixels, info } = await sharp(originalBytes, { limitInputPixels: false })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (info.width !== 38414 || info.height !== 1800 || info.channels !== 3) {
  throw new Error(`源图不符合本画卷尺寸：${info.width} × ${info.height}，${info.channels} 通道`);
}

const restoredPixels = Buffer.alloc(sourcePixels.length);
const rowBytes = info.width * info.channels;
const tiles = [];
let tileBytesTotal = 0;
for (let index = 0, left = 0; left < info.width; index++, left += tileWidth) {
  // 两侧保留原图中相邻的一个像素，避免浏览器变换时显出拼缝。
  const x = Math.max(0, left - overlap);
  const right = Math.min(info.width, left + tileWidth + overlap);
  const width = right - x;
  const tileRowBytes = width * info.channels;
  const tilePixels = Buffer.alloc(tileRowBytes * info.height);
  for (let y = 0; y < info.height; y++) {
    sourcePixels.copy(tilePixels, y * tileRowBytes, y * rowBytes + x * info.channels,
      y * rowBytes + right * info.channels);
  }

  const filename = `tile-${String(index).padStart(3, '0')}.webp`;
  const encoded = await sharp(tilePixels, {
    raw: { width, height: info.height, channels: info.channels }
  }).webp({ lossless: true, effort: 4 }).toBuffer();
  const decoded = await sharp(encoded).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== width || decoded.info.height !== info.height ||
      decoded.info.channels !== info.channels || !decoded.data.equals(tilePixels)) {
    throw new Error(`无损切片逐像素校验失败：${filename}`);
  }
  for (let y = 0; y < info.height; y++) {
    decoded.data.copy(restoredPixels, y * rowBytes + x * info.channels,
      y * tileRowBytes, (y + 1) * tileRowBytes);
  }
  await fs.writeFile(path.join(outputDirectory, filename), encoded);
  tiles.push({ x, y: 0, width, height: info.height, src: `assets/painting/${filename}` });
  tileBytesTotal += encoded.length;
  console.log(`${filename}：${width} × ${info.height}，${encoded.length} 字节，逐像素校验通过`);
}

const sourcePixelHash = hash(sourcePixels);
const restoredPixelHash = hash(restoredPixels);
if (sourcePixelHash !== restoredPixelHash || !restoredPixels.equals(sourcePixels)) {
  throw new Error('整卷拼接后像素与原图不一致');
}

const manifest = {
  width: info.width,
  height: info.height,
  tileWidth,
  overlap,
  format: 'webp',
  lossless: true,
  original: { src: 'assets/qingming-original.jpg', sha256: originalHash, bytes: originalBytes.length },
  decodedPixelSha256: sourcePixelHash,
  tiles
};
const manifestJson = JSON.stringify(manifest, null, 2);
await fs.writeFile(path.join(outputDirectory, 'tiles.json'), manifestJson + '\n');
await fs.writeFile(path.join(outputDirectory, 'manifest.js'),
  '// 高清画卷清单：切片保留原始像素，支持直接以文件方式打开页面。\n' +
  `window.RUHUA_ARTWORK = ${manifestJson};\n`);

console.log(JSON.stringify({
  width: info.width, height: info.height, tileCount: tiles.length,
  tileBytes: tileBytesTotal, originalBytes: originalBytes.length,
  originalSha256: originalHash, decodedPixelSha256: sourcePixelHash,
  restoredPixelSha256: restoredPixelHash, pixelIdentical: true
}));
