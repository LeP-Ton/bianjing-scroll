import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(projectRoot, 'dist/assets/audio/sfx');
const sampleRate = 48000;
const bitDepth = 24;
const tau = Math.PI * 2;

function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function createSound(seconds) {
  const length = Math.round(seconds * sampleRate);
  return { left: new Float64Array(length), right: new Float64Array(length) };
}

function addAt(sound, index, value, pan = 0) {
  if (index < 0 || index >= sound.left.length) return;
  const angle = (pan + 1) * Math.PI / 4;
  sound.left[index] += value * Math.cos(angle);
  sound.right[index] += value * Math.sin(angle);
}

function normalizeToPeak(signal, peak = 1) {
  let maximum = 0;
  for (const value of signal) maximum = Math.max(maximum, Math.abs(value));
  if (maximum) for (let index = 0; index < signal.length; index++) signal[index] *= peak / maximum;
}

// 短噪声激励一组非整数共振模态，保留木、石材质的敲击感，避免电子纯音提示。
function addModalStrike(sound, {
  at, duration, fundamental, ratios, weights, decays, gain, pan = 0, seed = 1,
  contact = 0.0015
}) {
  const random = randomGenerator(seed);
  const offset = Math.round(at * sampleRate);
  const length = Math.min(Math.ceil(duration * sampleRate), sound.left.length - offset);
  const excitationLength = Math.max(4, Math.round(contact * sampleRate));
  const excitation = new Float64Array(excitationLength);
  let previous = 0;
  for (let index = 0; index < excitationLength; index++) {
    previous = previous * 0.35 + (random() * 2 - 1) * 0.65;
    excitation[index] = previous * Math.sin(Math.PI * index / (excitationLength - 1));
  }
  const signal = new Float64Array(length);
  for (let mode = 0; mode < ratios.length; mode++) {
    const frequency = fundamental * ratios[mode];
    const decay = decays[mode] || decays.at(-1);
    const radius = Math.exp(-Math.log(1000) / (decay * sampleRate));
    const coefficient = 2 * radius * Math.cos(tau * frequency / sampleRate);
    const radiusSquared = radius * radius;
    let previous1 = 0;
    let previous2 = 0;
    for (let index = 0; index < length; index++) {
      const input = index < excitationLength ? excitation[index] : 0;
      const value = input + coefficient * previous1 - radiusSquared * previous2;
      signal[index] += value * weights[mode];
      previous2 = previous1;
      previous1 = value;
    }
  }
  normalizeToPeak(signal);
  for (let index = 0; index < length; index++) addAt(sound, offset + index, signal[index] * gain, pan);
}

function cosineEnvelope(position, power = 1) {
  return Math.pow(Math.max(0, Math.sin(Math.PI * position)), power);
}

// 不均匀的带限摩擦与微小折痕共同表现纸绢；没有使用第三方实录采样。
function addFriction(sound, {
  at, duration, gain, low = 260, high = 4200, panFrom = -0.12, panTo = 0.16,
  seed = 2, flutter = 16, density = 0.65, power = 1.3
}) {
  const random = randomGenerator(seed);
  const offset = Math.round(at * sampleRate);
  const length = Math.min(Math.round(duration * sampleRate), sound.left.length - offset);
  let lowState = 0;
  let highState = 0;
  let slowGrain = 0;
  const lowCoefficient = 1 - Math.exp(-tau * low / sampleRate);
  const highCoefficient = 1 - Math.exp(-tau * high / sampleRate);
  const grainCoefficient = 1 - Math.exp(-tau * 48 / sampleRate);
  const impulses = new Float64Array(length);
  for (let index = 0; index < length; index++) {
    const white = random() * 2 - 1;
    lowState += lowCoefficient * (white - lowState);
    const highPassed = white - lowState;
    highState += highCoefficient * (highPassed - highState);
    slowGrain += grainCoefficient * (white - slowGrain);
    const position = index / Math.max(1, length - 1);
    const unevenness = 0.72 + 0.18 * Math.sin(tau * flutter * index / sampleRate + Math.sin(position * 13))
      + Math.min(0.24, Math.abs(slowGrain) * 2.3);
    impulses[index] = highState * cosineEnvelope(position, power) * unevenness;
  }
  // 不规则微折痕以极低能量混入，避免大片白噪声形成电子扫频的印象。
  const grains = Math.round(duration * 120 * density);
  for (let grain = 0; grain < grains; grain++) {
    const start = Math.floor(random() * length);
    const grainLength = Math.round((0.0014 + random() * 0.004) * sampleRate);
    const strength = 0.04 + random() * 0.10;
    let grainState = 0;
    for (let index = 0; index < grainLength && start + index < length; index++) {
      grainState = grainState * 0.63 + (random() * 2 - 1) * 0.37;
      const envelope = cosineEnvelope(index / Math.max(1, grainLength - 1), 1.2);
      impulses[start + index] += grainState * envelope * strength
        * cosineEnvelope((start + index) / Math.max(1, length - 1));
    }
  }
  normalizeToPeak(impulses);
  for (let index = 0; index < length; index++) {
    const position = index / Math.max(1, length - 1);
    addAt(sound, offset + index, impulses[index] * gain, panFrom + (panTo - panFrom) * position);
  }
}

function addShortRoom(sound, wet, seed) {
  const random = randomGenerator(seed);
  const left = sound.left.slice();
  const right = sound.right.slice();
  const taps = 26;
  for (let tap = 0; tap < taps; tap++) {
    const time = 0.006 + Math.pow((tap + random()) / taps, 1.15) * 0.115;
    const delay = Math.round(time * sampleRate);
    const cross = tap % 2 === 0;
    const gain = wet * Math.exp(-time * 21) / Math.sqrt(taps)
      * (0.74 + random() * 0.26) * (random() < 0.3 ? -1 : 1);
    let blurredLeft = 0;
    let blurredRight = 0;
    const coefficient = 1 - Math.exp(-tau * (5200 - time * 20000) / sampleRate);
    for (let index = 0; index + delay < left.length; index++) {
      blurredLeft += coefficient * ((cross ? right[index] : left[index]) - blurredLeft);
      blurredRight += coefficient * ((cross ? left[index] : right[index]) - blurredRight);
      sound.left[index + delay] += blurredLeft * gain;
      sound.right[index + delay] += blurredRight * gain;
    }
  }
}

function finish(sound, peakDbfs, seed) {
  const fadeIn = Math.round(0.0018 * sampleRate);
  const fadeOut = Math.round(Math.min(0.045, sound.left.length / sampleRate * 0.18) * sampleRate);
  const dcCoefficient = Math.exp(-tau * 28 / sampleRate);
  const highCoefficient = 1 - Math.exp(-tau * 6500 / sampleRate);
  const envelope = new Float64Array(sound.left.length);
  for (let index = 0; index < envelope.length; index++) {
    const incoming = Math.min(1, index / Math.max(1, fadeIn));
    const outgoing = Math.min(1, (envelope.length - 1 - index) / Math.max(1, fadeOut));
    envelope[index] = Math.sin(Math.PI / 2 * incoming) ** 2 * Math.sin(Math.PI / 2 * outgoing) ** 2;
  }
  for (const channel of [sound.left, sound.right]) {
    let previousInput = 0;
    let previousOutput = 0;
    let lowPassed = 0;
    let mean = 0;
    let envelopeSum = 0;
    for (let index = 0; index < channel.length; index++) {
      const input = channel[index];
      const dcBlocked = input - previousInput + dcCoefficient * previousOutput;
      previousInput = input;
      previousOutput = dcBlocked;
      lowPassed += highCoefficient * (dcBlocked - lowPassed);
      channel[index] = lowPassed * envelope[index];
      mean += channel[index];
      envelopeSum += envelope[index];
    }
    // 保留零值首尾的同时消除微小直流偏置，防止多次触发时产生低频点击。
    const correction = mean / envelopeSum;
    for (let index = 0; index < channel.length; index++) channel[index] -= correction * envelope[index];
  }
  let peak = 0;
  for (let index = 0; index < sound.left.length; index++) {
    peak = Math.max(peak, Math.abs(sound.left[index]), Math.abs(sound.right[index]));
  }
  if (!peak) throw new Error('音效没有有效信号');
  const scale = 10 ** (peakDbfs / 20) / peak;
  for (const channel of [sound.left, sound.right]) {
    for (let index = 0; index < channel.length; index++) channel[index] *= scale;
  }
  sound.dither = randomGenerator(seed);
  return sound;
}

function writeWav(sound) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = 2 * bytesPerSample;
  const dataLength = sound.left.length * blockAlign;
  const bytes = Buffer.alloc(44 + dataLength);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * blockAlign, 28);
  bytes.writeUInt16LE(blockAlign, 32);
  bytes.writeUInt16LE(bitDepth, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(dataLength, 40);
  let offset = 44;
  for (let index = 0; index < sound.left.length; index++) {
    for (const value of [sound.left[index], sound.right[index]]) {
      const dither = value === 0 ? 0 : (sound.dither() - sound.dither()) * 0.5;
      const quantized = Math.max(-8388608, Math.min(8388607, Math.round(value * 8388607 + dither)));
      bytes.writeIntLE(quantized, offset, 3);
      offset += bytesPerSample;
    }
  }
  return bytes;
}

function analyzeWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('WAV 文件头无效');
  }
  const channels = bytes.readUInt16LE(22);
  const rate = bytes.readUInt32LE(24);
  const depth = bytes.readUInt16LE(34);
  const dataLength = bytes.readUInt32LE(40);
  if (depth !== 24 || channels !== 2 || rate !== sampleRate || dataLength !== bytes.length - 44) {
    throw new Error('WAV 编码参数校验失败');
  }
  const frames = dataLength / 6;
  let peak = 0;
  let energy = 0;
  let clippedSamples = 0;
  let maxAdjacentDelta = 0;
  const sums = [0, 0];
  const previous = [0, 0];
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const value = bytes.readIntLE(44 + frame * 6 + channel * 3, 3) / 8388607;
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
      sums[channel] += value;
      maxAdjacentDelta = Math.max(maxAdjacentDelta, Math.abs(value - previous[channel]));
      previous[channel] = value;
      if (Math.abs(value) >= 0.99999) clippedSamples++;
    }
  }
  const beginningPeak = Math.max(Math.abs(bytes.readIntLE(44, 3)), Math.abs(bytes.readIntLE(47, 3))) / 8388607;
  const endOffset = bytes.length - 6;
  const endingPeak = Math.max(Math.abs(bytes.readIntLE(endOffset, 3)), Math.abs(bytes.readIntLE(endOffset + 3, 3))) / 8388607;
  const metrics = {
    duration: frames / rate,
    sampleRate: rate,
    channels,
    bitDepth: depth,
    peakDbfs: Number((20 * Math.log10(peak)).toFixed(2)),
    rmsDbfs: Number((20 * Math.log10(Math.sqrt(energy / (frames * channels)))).toFixed(2)),
    clippedSamples,
    startPeak: beginningPeak,
    endPeak: endingPeak,
    dcOffset: Math.max(...sums.map(value => Math.abs(value / frames))),
    maxAdjacentDelta: Number(maxAdjacentDelta.toFixed(6))
  };
  if (clippedSamples || beginningPeak > 1e-6 || endingPeak > 1e-6 || metrics.dcOffset > 1e-5) {
    throw new Error(`音效存在削波、非零端点或直流偏置：${JSON.stringify(metrics)}`);
  }
  return metrics;
}

const recipes = [
  {
    id: 'select', name: '轻叩', duration: 0.12, peak: -19,
    purpose: '选择待寻物件；轻木触碰，短而干净。', cooldownMs: 120,
    render(sound) {
      addModalStrike(sound, {
        at: 0.003, duration: 0.11, fundamental: 405,
        ratios: [1, 1.86, 3.14, 4.63], weights: [0.8, 0.59, 0.24, 0.11],
        decays: [0.088, 0.063, 0.039, 0.025], gain: 0.8, seed: 1103, contact: 0.0012
      });
      addFriction(sound, { at: 0.002, duration: 0.033, gain: 0.16, low: 420, high: 3600, seed: 1129, flutter: 25 });
      addShortRoom(sound, 0.025, 1171);
    }
  },
  {
    id: 'found', name: '玉应', duration: 1.05, peak: -14,
    purpose: '首次寻得物件；两次轻玉共鸣，温和确认。', cooldownMs: 240,
    render(sound) {
      addModalStrike(sound, {
        at: 0.007, duration: 0.88, fundamental: 587.3295,
        ratios: [1, 1.493, 2.143, 2.963, 4.373], weights: [1, 0.43, 0.24, 0.13, 0.055],
        decays: [0.67, 0.51, 0.34, 0.23, 0.13], gain: 0.68, pan: -0.07, seed: 2203
      });
      addModalStrike(sound, {
        at: 0.17, duration: 0.83, fundamental: 880,
        ratios: [1, 1.493, 2.143, 2.963], weights: [1, 0.37, 0.19, 0.07],
        decays: [0.62, 0.41, 0.29, 0.18], gain: 0.38, pan: 0.09, seed: 2237
      });
      addFriction(sound, { at: 0.004, duration: 0.07, gain: 0.07, low: 520, high: 2500, seed: 2281 });
      addShortRoom(sound, 0.13, 2293);
    }
  },
  {
    id: 'hint', name: '微光', duration: 0.68, peak: -17,
    purpose: '借一缕灵光；细软笔风与低能量泛音。', cooldownMs: 450,
    render(sound) {
      addFriction(sound, {
        at: 0.014, duration: 0.34, gain: 0.34, low: 620, high: 3700,
        panFrom: -0.16, panTo: 0.16, seed: 3301, flutter: 11, density: 0.24, power: 1.9
      });
      addModalStrike(sound, {
        at: 0.115, duration: 0.53, fundamental: 1174.659,
        ratios: [1, 1.508, 2.217], weights: [1, 0.27, 0.08],
        decays: [0.41, 0.29, 0.16], gain: 0.14, pan: 0.03, seed: 3329, contact: 0.0025
      });
      addShortRoom(sound, 0.09, 3371);
    }
  },
  {
    id: 'page-open', name: '展笺', duration: 0.38, peak: -19,
    purpose: '打开百科、图鉴或长览；轻纸展开，不为每次悬停触发。', cooldownMs: 220,
    render(sound) {
      addFriction(sound, {
        at: 0.008, duration: 0.29, gain: 0.7, low: 410, high: 4700,
        panFrom: -0.19, panTo: 0.19, seed: 4409, flutter: 22, density: 0.75, power: 1.15
      });
      addModalStrike(sound, {
        at: 0.04, duration: 0.13, fundamental: 193,
        ratios: [1, 2.74, 4.57], weights: [1, 0.17, 0.04],
        decays: [0.09, 0.055, 0.03], gain: 0.07, pan: -0.09, seed: 4441, contact: 0.003
      });
      addShortRoom(sound, 0.05, 4483);
    }
  },
  {
    id: 'page-close', name: '收笺', duration: 0.29, peak: -21,
    purpose: '关闭百科或图鉴；比展开更轻、更短的纸张收合。', cooldownMs: 220,
    render(sound) {
      addFriction(sound, {
        at: 0.006, duration: 0.215, gain: 0.65, low: 330, high: 3800,
        panFrom: 0.14, panTo: -0.10, seed: 5501, flutter: 25, density: 0.55, power: 1.1
      });
      addModalStrike(sound, {
        at: 0.135, duration: 0.13, fundamental: 234,
        ratios: [1, 2.37, 3.91], weights: [1, 0.2, 0.08],
        decays: [0.078, 0.043, 0.024], gain: 0.075, pan: -0.07, seed: 5521, contact: 0.002
      });
      addShortRoom(sound, 0.04, 5563);
    }
  },
  {
    id: 'chapter', name: '移卷', duration: 0.92, peak: -18,
    purpose: '主动切换画卷；绢面缓移与极轻卷轴木触，不伴随持续拖拽播放。', cooldownMs: 600,
    render(sound) {
      addFriction(sound, {
        at: 0.012, duration: 0.69, gain: 0.62, low: 210, high: 2900,
        panFrom: -0.17, panTo: 0.18, seed: 6607, flutter: 10, density: 0.38, power: 1.6
      });
      addFriction(sound, {
        at: 0.29, duration: 0.43, gain: 0.2, low: 570, high: 4100,
        panFrom: -0.06, panTo: 0.11, seed: 6637, flutter: 17, density: 0.2, power: 2
      });
      for (const [at, fundamental, gain, seed] of [[0.028, 175, 0.13, 6653], [0.59, 207, 0.08, 6673]]) {
        addModalStrike(sound, {
          at, duration: 0.16, fundamental, ratios: [1, 1.93, 3.34],
          weights: [1, 0.23, 0.09], decays: [0.12, 0.07, 0.04], gain, seed, contact: 0.0028
        });
      }
      addShortRoom(sound, 0.07, 6689);
    }
  },
  {
    id: 'complete', name: '卷成', duration: 2.18, peak: -15,
    purpose: '一卷寻物完成；疏朗三声玉石回应，保留余韵，不作夸张胜利号角。', cooldownMs: 1800,
    render(sound) {
      for (const [at, fundamental, gain, pan, seed] of [
        [0.014, 391.9954, 0.56, -0.08, 7703],
        [0.31, 440, 0.41, 0.02, 7723],
        [0.69, 587.3295, 0.48, 0.10, 7741]
      ]) {
        addModalStrike(sound, {
          at, duration: 1.45, fundamental,
          ratios: [1, 1.491, 2.139, 2.957, 4.381], weights: [1, 0.41, 0.21, 0.12, 0.04],
          decays: [1.16, 0.81, 0.54, 0.32, 0.19], gain, pan, seed, contact: 0.0018
        });
      }
      addFriction(sound, {
        at: 0.025, duration: 0.30, gain: 0.06, low: 430, high: 2400,
        panFrom: -0.1, panTo: 0.12, seed: 7757, flutter: 8, density: 0.15, power: 1.8
      });
      addShortRoom(sound, 0.16, 7789);
    }
  }
];

await fs.mkdir(destination, { recursive: true });
const manifest = {
  version: 1,
  source: '原创程序化声学合成，不使用第三方采样；不声称真实历史器物录音。',
  format: { container: 'wav', encoding: 'PCM', sampleRate, bitDepth, channels: 2 },
  playback: {
    note: '建议默认音量低于背景音乐的主要旋律；不为悬停、连续拖拽或滚轮逐帧触发。',
    recommendedMasterGain: 0.6,
    maxSimultaneousVoices: 4
  },
  effects: []
};
for (let index = 0; index < recipes.length; index++) {
  const recipe = recipes[index];
  const sound = createSound(recipe.duration);
  recipe.render(sound);
  finish(sound, recipe.peak, 9001 + index * 37);
  const encoded = writeWav(sound);
  const filename = `${recipe.id}.wav`;
  await fs.writeFile(path.join(destination, filename), encoded);
  // 验收读取落盘字节，而不是只检查合成前的浮点缓冲。
  const written = await fs.readFile(path.join(destination, filename));
  const metrics = analyzeWav(written);
  if (Math.abs(metrics.duration - recipe.duration) > 1 / sampleRate) throw new Error('文件时长不一致');
  const item = {
    id: recipe.id, name: recipe.name, src: `assets/audio/sfx/${filename}`,
    purpose: recipe.purpose, cooldownMs: recipe.cooldownMs,
    bytes: written.length,
    sha256: crypto.createHash('sha256').update(written).digest('hex'),
    ...metrics
  };
  manifest.effects.push(item);
  console.log(JSON.stringify(item));
}
await fs.writeFile(path.join(destination, '../sfx-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`已生成并校验 ${manifest.effects.length} 类音效，总计 ${manifest.effects.reduce((sum, item) => sum + item.bytes, 0)} 字节。`);
