import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';

// FFmpeg 仅供离线制作；网页播放不依赖本机编码工具。
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const ffmpeg = option('--ffmpeg', 'ffmpeg');
const masters = resolve(option('--masters', '../../outputs/music-masters'));
const output = resolve(option('--output', 'dist/assets/audio/music'));
const reportPath = resolve(option('--report', '../../outputs/music-encoding-report.json'));
const scoreDirectory = resolve('scripts/scores');
mkdirSync(output, { recursive: true });
mkdirSync(dirname(reportPath), { recursive: true });

function run(parameters, binary = false) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', ...parameters], {
    encoding: binary ? undefined : 'utf8', maxBuffer: 160 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(String(result.stderr));
  return result;
}

function measure(file) {
  const result = run(['-i', file, '-af', 'loudnorm=I=-20:TP=-2:LRA=10:print_format=json', '-f', 'null', '-']);
  const block = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  if (!block) throw new Error(`无法分析音频：${file}`);
  return JSON.parse(block);
}

const report = [];
for (const file of readdirSync(scoreDirectory).filter(file => file.endsWith('.json')).sort()) {
  const score = JSON.parse(readFileSync(resolve(scoreDirectory, file), 'utf8'));
  const master = resolve(masters, `${score.id}.wav`);
  const target = resolve(output, `${score.id}.mp3`);
  const first = measure(master);
  const normalization = [
    'loudnorm=I=-20:TP=-2:LRA=10',
    `measured_I=${first.input_i}`, `measured_TP=${first.input_tp}`,
    `measured_LRA=${first.input_lra}`, `measured_thresh=${first.input_thresh}`,
    `offset=${first.target_offset}`, 'linear=true',
  ].join(':');
  run(['-y', '-i', master, '-af', normalization, '-ar', '48000', '-ac', '2',
    '-c:a', 'libmp3lame', '-b:a', '192k', '-id3v2_version', '3',
    '-metadata', `title=${score.title}`, '-metadata', 'artist=入画 · 汴京寻物',
    '-metadata', 'album=汴京六景', '-metadata', 'comment=本地原创作曲与合成音色', target]);
  const measured = measure(target);
  const decoded = run(['-i', target, '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2', '-'], true);
  const pcm = decoded.stdout;
  const sampleCount = pcm.length / 2;
  const duration = sampleCount / 48000 / 2;
  let square = 0;
  let peak = 0;
  const windows = [];
  let windowSquare = 0;
  let windowCount = 0;
  for (let index = 0; index < sampleCount; index++) {
    const sample = pcm.readInt16LE(index * 2) / 32768;
    square += sample * sample;
    windowSquare += sample * sample;
    windowCount++;
    peak = Math.max(peak, Math.abs(sample));
    if (windowCount === 48000 * 2 * 10 || index === sampleCount - 1) {
      windows.push(Number((10 * Math.log10(windowSquare / windowCount + 1e-16)).toFixed(2)));
      windowSquare = 0;
      windowCount = 0;
    }
  }
  if (duration < 120 || Math.abs(duration - score.duration) > 0.15) throw new Error(`${score.id} 时长不符合乐谱`);
  if (Number(measured.input_tp) > -1) throw new Error(`${score.id} 真峰值过高`);
  if (windows.slice(1, -1).some(value => value < -60)) throw new Error(`${score.id} 中间存在长静音`);
  const entry = {
    id: score.id, title: score.title, chapter: score.chapter,
    src: `assets/audio/music/${basename(target)}`,
    duration: Number(duration.toFixed(3)), bytes: statSync(target).size,
    sampleRate: 48000, channels: 2, bitrateKbps: 192,
    integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp),
    loudnessRangeLu: Number(measured.input_lra),
    samplePeakDbfs: Number((20 * Math.log10(peak)).toFixed(2)),
    rmsDbfs: Number((10 * Math.log10(square / sampleCount)).toFixed(2)),
    tenSecondRmsDbfs: windows,
    sha256: createHash('sha256').update(readFileSync(target)).digest('hex'),
    origin: '本地原创乐谱与合成音色，无外部录音采样',
  };
  report.push(entry);
  console.log(`${entry.title} ${entry.duration}s / ${entry.integratedLufs} LUFS / ${entry.truePeakDbtp} dBTP`);
}
if (report.length !== 6) throw new Error(`应生成六首，实际为 ${report.length} 首`);
writeFileSync(reportPath, `${JSON.stringify({ album: '汴京六景', tracks: report }, null, 2)}\n`);
console.log(`编码与客观检查完成：${reportPath}`);
