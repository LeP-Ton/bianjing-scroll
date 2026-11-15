import { readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

// 发布时验证落盘成品，防止清单引用缺失、未完成或被替换的音频。
const root = resolve('dist');
const scope = { window: {} };
runInNewContext(readFileSync(resolve(root, 'audio-catalog.js'), 'utf8'), scope);
const catalog = scope.window.RUHUA_AUDIO_CATALOG;
const music = JSON.parse(readFileSync(resolve(root, 'assets/audio/music-manifest.json'), 'utf8'));
const effects = JSON.parse(readFileSync(resolve(root, 'assets/audio/sfx-manifest.json'), 'utf8'));
assert.equal(catalog.tracks.length, 6, '必须包含六首已完成配乐');
assert.equal(music.tracks.length, 6);
assert.equal(Object.keys(catalog.effects).length, 7);
assert.equal(effects.effects.length, 7);

function checkFile(entry) {
  const file = resolve(root, entry.src);
  assert.ok(file.startsWith(resolve(root, 'assets/audio') + sep), '音频路径必须在素材目录内');
  assert.equal(statSync(file).size, entry.bytes, `${entry.id} 字节数不符`);
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.id} 哈希不符`);
  return bytes;
}

for (const entry of music.tracks) {
  const track = catalog.tracks.find(track => track.id === entry.id);
  assert.ok(track, `${entry.id} 未登记`);
  assert.equal(track.src, entry.src);
  assert.equal(track.duration, entry.duration);
  assert.equal(track.chapter, entry.chapter);
  assert.ok(entry.duration >= 120, `${entry.id} 少于两分钟`);
  assert.ok(Number.isFinite(entry.integratedLufs) && entry.integratedLufs >= -23 && entry.integratedLufs <= -18);
  assert.ok(Number.isFinite(entry.truePeakDbtp) && entry.truePeakDbtp <= -1);
  assert.equal(entry.sampleRate, 48000);
  assert.equal(entry.channels, 2);
  assert.ok(entry.tenSecondRmsDbfs.slice(1, -1).every(value => value > -60), '中间不能以长静音补足时长');
  checkFile(entry);
}
for (let chapter = 0; chapter < 3; chapter++) {
  assert.equal(catalog.tracks.filter(track => track.chapter === chapter).length, 2);
}
for (const entry of effects.effects) {
  assert.equal(catalog.effects[entry.id]?.src, entry.src);
  const wav = checkFile(entry);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  let format;
  let dataBytes;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const chunk = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (chunk === 'fmt ') format = offset + 8;
    if (chunk === 'data') dataBytes = size;
    offset += 8 + size + (size % 2);
  }
  assert.ok(format && dataBytes);
  assert.equal(wav.readUInt16LE(format), 1, '音效应为 PCM');
  assert.equal(wav.readUInt16LE(format + 2), 2);
  assert.equal(wav.readUInt32LE(format + 4), 48000);
  assert.equal(wav.readUInt16LE(format + 14), 24);
  assert.ok(Math.abs(dataBytes / 6 / 48000 - entry.duration) < 0.001);
  assert.equal(entry.clippedSamples, 0);
}
console.log('六首配乐与七种音效：文件、哈希、格式、时长、响度清单验证通过');
