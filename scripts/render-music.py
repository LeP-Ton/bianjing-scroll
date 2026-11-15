"""把原创乐谱渲染为离线合成配乐，不依赖网页运行时或第三方乐器采样。"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
import wave
from collections import OrderedDict
from pathlib import Path

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parents[1]
SAMPLE_RATE = 48000
PEAK_CEILING_DBFS = -2.8
TARGET_RMS_DBFS = -22.0
TAU = math.tau

INSTRUMENTS = {
    "qin": {"gain": 0.63, "tail": 1.65, "minimum": 1.9, "t60": 3.2, "stretch": 0.000065,
            "rolloff": 1.26, "pick": 0.14, "noise": 0.032, "brightness": 4200},
    "zheng": {"gain": 0.49, "tail": 1.4, "minimum": 1.7, "t60": 3.9, "stretch": 0.000045,
              "rolloff": 1.04, "pick": 0.105, "noise": 0.042, "brightness": 6200},
    "pipa": {"gain": 0.46, "tail": 0.6, "minimum": 0.8, "t60": 1.45, "stretch": 0.00014,
             "rolloff": 1.10, "pick": 0.2, "noise": 0.065, "brightness": 4800},
    "xiao": {"gain": 0.37},
    "sheng": {"gain": 0.16},
    "wood": {"gain": 0.16},
}


def stable_seed(value: str) -> int:
    return int.from_bytes(hashlib.sha256(value.encode("utf-8")).digest()[:8], "little")


def peak(signal: np.ndarray) -> float:
    return float(np.max(np.abs(signal))) if signal.size else 0.0


def db(value: float) -> float:
    return 20 * math.log10(max(value, 1e-14))


def normalize_voice(signal: np.ndarray, headroom: float = 0.92) -> np.ndarray:
    maximum = peak(signal)
    if maximum:
        signal *= headroom / maximum
    # 每个声部末尾单独释放，避免整首淡出之前出现乐器门限爆音。
    length = min(len(signal), round(SAMPLE_RATE * 0.035))
    if length:
        signal[-length:] *= np.linspace(1, 0, length, dtype=np.float32) ** 2
    return signal.astype(np.float32, copy=False)


def colored_noise(length: int, rng: np.random.Generator, low: float, high: float) -> np.ndarray:
    """频域带限随机接触声；相位和振幅均来自固定种子。"""
    if length < 2:
        return np.zeros(length, dtype=np.float32)
    size = 1 << (length - 1).bit_length()
    white = rng.standard_normal(size)
    spectrum = np.fft.rfft(white)
    frequencies = np.fft.rfftfreq(size, 1 / SAMPLE_RATE)
    low_shape = frequencies / np.sqrt(frequencies * frequencies + low * low)
    high_shape = 1 / np.sqrt(1 + (frequencies / high) ** 6)
    spectrum *= low_shape * high_shape
    signal = np.fft.irfft(spectrum, size)[:length]
    signal -= np.mean(signal)
    rms = float(np.sqrt(np.mean(signal * signal)))
    if rms:
        signal /= rms
    return signal.astype(np.float32)


def plucked_voice(instrument: str, midi: int, duration: float, variant: int, intensity: float) -> np.ndarray:
    settings = INSTRUMENTS[instrument]
    rng = np.random.default_rng(stable_seed(f"{instrument}:{midi}:{duration}:{variant}:{intensity}"))
    seconds = max(settings["minimum"], duration + settings["tail"])
    length = math.ceil(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    tuning = (-0.8, 0.15, 0.7)[variant] + rng.uniform(-0.12, 0.12)
    frequency = 440 * 2 ** ((midi - 69 + tuning / 100) / 12)
    signal = np.zeros(length, dtype=np.float64)
    pick_position = settings["pick"] + rng.uniform(-0.012, 0.012)
    modes = min(24, int(11000 / frequency))
    for mode in range(1, modes + 1):
        # 弦的刚度造成轻微非整数泛音；高阶泛音衰减更快，避免持续的塑料键盘音。
        modal_frequency = frequency * mode * math.sqrt(1 + settings["stretch"] * mode * mode)
        amplitude = math.sin(math.pi * mode * pick_position) / mode ** settings["rolloff"]
        amplitude *= math.exp(-modal_frequency / (settings["brightness"] * (0.76 + 0.42 * intensity)))
        damping = settings["t60"] / (1 + 0.13 * mode ** 1.12)
        envelope = np.exp(-math.log(1000) * t / damping)
        # 两个振动方向有不同阻尼和微小失谐，形成自然的衰减拍频。
        detune = 1 + (0.00035 + rng.uniform(-0.0001, 0.0001)) * (1 if mode % 2 else -1)
        pitch_relaxation = frequency * mode * 0.0007 * 0.026 * (1 - np.exp(-t / 0.026))
        phase = TAU * (modal_frequency * t + pitch_relaxation)
        vibration = np.sin(phase) + 0.22 * np.sin(phase * detune + 0.07)
        signal += amplitude * envelope * vibration
    # 木质共鸣只作低能量底色，不以固定正弦音代替主体弦振。
    for body_frequency, body_gain in [(147, 0.025), (281, 0.018), (413, 0.009)]:
        signal += body_gain * np.sin(TAU * body_frequency * t) * np.exp(-t / 0.055)
    attack = 1 - np.exp(-t / (0.0025 if instrument != "pipa" else 0.0012))
    signal *= attack
    release_start = max(0.08, duration)
    release = np.exp(-np.maximum(0, t - release_start) / settings["tail"] * 2.1)
    signal *= release
    contact_length = min(length, round(SAMPLE_RATE * (0.075 if instrument == "qin" else 0.046)))
    contact = colored_noise(contact_length, rng, 500, 4300)
    ct = np.arange(contact_length) / SAMPLE_RATE
    contact *= np.exp(-ct / (0.012 if instrument == "pipa" else 0.021)) * (1 - np.exp(-ct / 0.001))
    signal[:contact_length] += contact * settings["noise"] * (0.65 + 0.45 * intensity)
    return normalize_voice(signal)


def wind_voice(instrument: str, midi: int, duration: float, variant: int, intensity: float) -> np.ndarray:
    rng = np.random.default_rng(stable_seed(f"{instrument}:{midi}:{duration}:{variant}:{intensity}"))
    release = 0.22 if instrument == "xiao" else 0.37
    length = math.ceil((duration + release) * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float64) / SAMPLE_RATE
    fundamental = 440 * 2 ** ((midi - 69) / 12)
    attack_time = min(duration * 0.24, 0.09 if instrument == "xiao" else 0.22)
    attack = np.sin(np.minimum(1, t / max(0.016, attack_time)) * math.pi / 2) ** 2
    released = np.exp(-np.maximum(0, t - duration) / (release / 6.5))
    breath_cycle = 1 + 0.035 * np.sin(TAU * (0.42 + variant * 0.055) * t + variant * 0.8)
    breath_cycle += 0.018 * np.sin(TAU * 1.17 * t + 0.3)
    vibrato = (1 - np.exp(-t / 0.44)) * np.sin(TAU * (4.7 + variant * 0.13) * t)
    cents = vibrato * (5.0 if instrument == "xiao" else 1.7)
    cents += (-0.8, 0.1, 0.65)[variant]
    cents += -6.0 * np.exp(-t / 0.075) if instrument == "xiao" else 0
    phase = np.cumsum(TAU * fundamental * 2 ** (cents / 1200) / SAMPLE_RATE)
    if instrument == "xiao":
        harmonics = [1, 0.17, 0.10, 0.044, 0.025, 0.013]
        noise_gain = 0.038
    else:
        harmonics = [1, 0.33, 0.23, 0.14, 0.085, 0.046, 0.025, 0.012]
        noise_gain = 0.008
    signal = np.zeros(length, dtype=np.float64)
    for harmonic, amplitude in enumerate(harmonics, start=1):
        brightness = math.exp(-fundamental * harmonic / (5500 if instrument == "xiao" else 3900))
        variation = 1 + 0.015 * np.sin(TAU * (0.31 + harmonic * 0.05) * t + harmonic)
        signal += amplitude * brightness * variation * np.sin(phase * harmonic + harmonic * 0.013)
        if instrument == "sheng":
            signal += amplitude * brightness * 0.08 * np.sin(phase * harmonic * 1.0009 + 0.1)
    air = colored_noise(length, rng, 650 if instrument == "xiao" else 350, 5200)
    signal += noise_gain * air * (0.87 + 0.13 * np.sin(TAU * 1.3 * t))
    signal *= attack * released * breath_cycle
    return normalize_voice(signal)


def wooden_voice(midi: int, duration: float, variant: int, intensity: float) -> np.ndarray:
    rng = np.random.default_rng(stable_seed(f"wood:{midi}:{variant}"))
    length = round(max(0.16, min(0.45, duration + 0.12)) * SAMPLE_RATE)
    t = np.arange(length) / SAMPLE_RATE
    base = 440 * 2 ** ((midi - 69) / 12)
    base = max(120, min(420, base))
    signal = np.zeros(length)
    for ratio, weight, damping in [(1, 1, 0.055), (1.83, 0.5, 0.036), (3.19, 0.24, 0.025), (4.61, 0.11, 0.017)]:
        signal += weight * np.sin(TAU * base * ratio * t) * np.exp(-t / damping)
    contact = colored_noise(length, rng, 500, 3600)
    signal += 0.15 * contact * np.exp(-t / 0.008)
    signal *= 1 - np.exp(-t / 0.0007)
    return normalize_voice(signal)


class VoiceCache:
    def __init__(self, limit: int = 96):
        self.voices = OrderedDict()
        self.limit = limit
        self.hits = 0
        self.misses = 0

    def get(self, instrument: str, midi: int, duration: float, variant: int, velocity: float) -> np.ndarray:
        duration_bucket = math.ceil(duration * 4) / 4
        intensity_bucket = min(2, max(0, int(velocity * 3)))
        intensity = (0.25, 0.52, 0.8)[intensity_bucket]
        key = (instrument, midi, duration_bucket, variant, intensity_bucket)
        if key in self.voices:
            self.hits += 1
            self.voices.move_to_end(key)
            return self.voices[key]
        self.misses += 1
        if instrument in ("qin", "zheng", "pipa"):
            voice = plucked_voice(instrument, midi, duration_bucket, variant, intensity)
        elif instrument in ("xiao", "sheng"):
            voice = wind_voice(instrument, midi, duration_bucket, variant, intensity)
        else:
            voice = wooden_voice(midi, duration_bucket, variant, intensity)
        self.voices[key] = voice
        while len(self.voices) > self.limit:
            self.voices.popitem(last=False)
        return voice


def warm_room_impulse(side: int) -> np.ndarray:
    rng = np.random.default_rng(93817 + side * 2017)
    length = round(SAMPLE_RATE * 0.48)
    t = np.arange(length) / SAMPLE_RATE
    response = colored_noise(length, rng, 170, 4100)
    response *= np.exp(-t * 17.5) * np.minimum(1, np.maximum(0, (t - 0.018) / 0.018))
    response[:round(0.018 * SAMPLE_RATE)] = 0
    response *= 0.015
    for delay, gain in [(0.0087, 0.23), (0.0173, 0.15), (0.0271, 0.11), (0.0419, 0.07), (0.0613, 0.045)]:
        index = round((delay + side * 0.0007) * SAMPLE_RATE)
        response[index] += gain * (1 if rng.random() > 0.22 else -1)
    response *= np.linspace(1, 0, length) ** 1.1
    response /= max(1e-12, float(np.sqrt(np.sum(response * response))))
    return response.astype(np.float32)


def overlap_add_convolve(signal: np.ndarray, impulse: np.ndarray) -> np.ndarray:
    """固定小块 FFT 卷积，避免给整首三分钟音轨分配巨型频域数组。"""
    block = 32768
    fft_size = 65536
    if len(impulse) + block - 1 > fft_size:
        raise ValueError("空间脉冲超出分块 FFT 容量")
    response_spectrum = np.fft.rfft(impulse, fft_size)
    output = np.zeros(len(signal) + len(impulse) - 1, dtype=np.float32)
    for start in range(0, len(signal), block):
        piece = signal[start:start + block]
        transformed = np.fft.rfft(piece, fft_size) * response_spectrum
        convolved = np.fft.irfft(transformed, fft_size)
        length = min(len(piece) + len(impulse) - 1, len(output) - start)
        output[start:start + length] += convolved[:length]
    return output[:len(signal)]


def master_audio(mix: np.ndarray, fade_in: float, fade_out: float) -> dict:
    length = len(mix)
    incoming = min(length, round(fade_in * SAMPLE_RATE))
    outgoing = min(length, round(fade_out * SAMPLE_RATE))
    in_envelope = np.sin(np.linspace(0, math.pi / 2, incoming)) ** 2 if incoming else np.array([])
    out_envelope = np.cos(np.linspace(0, math.pi / 2, outgoing)) ** 2 if outgoing else np.array([])
    for channel in range(2):
        mix[:, channel] -= np.mean(mix[:, channel], dtype=np.float64)
        if incoming:
            mix[:incoming, channel] *= in_envelope
        if outgoing:
            mix[-outgoing:, channel] *= out_envelope
        # 加权直流修正保留淡入淡出的零端点。
        sum_weights = length - incoming + float(np.sum(in_envelope)) - outgoing + float(np.sum(out_envelope))
        correction = float(np.sum(mix[:, channel], dtype=np.float64)) / max(1, sum_weights)
        mix[:, channel] -= correction
        if incoming:
            mix[:incoming, channel] += correction * (1 - in_envelope)
        if outgoing:
            mix[-outgoing:, channel] += correction * (1 - out_envelope)
    current_rms = float(np.sqrt(np.mean(mix.astype(np.float64) ** 2)))
    if not current_rms or not np.isfinite(current_rms):
        raise ValueError("音轨没有有效信号")
    current_peak = peak(mix)
    target_peak = 10 ** (PEAK_CEILING_DBFS / 20)
    gain = 10 ** (TARGET_RMS_DBFS / 20) / current_rms
    # 仅给超过母带余量的少量瞬态留柔和增益控制，最多约 3 dB，不挤平留白。
    gain = min(gain, target_peak * 10 ** (3 / 20) / max(current_peak, 1e-12))
    mix *= gain
    block = 480
    blocks = math.ceil(length / block)
    maxima = np.zeros(blocks)
    for index in range(blocks):
        maxima[index] = peak(mix[index * block:(index + 1) * block])
    desired = np.minimum(1, target_peak / np.maximum(maxima, 1e-12))
    anticipated = desired.copy()
    for lookahead in (1, 2, 3):
        anticipated[:-lookahead] = np.minimum(anticipated[:-lookahead], desired[lookahead:])
    smoothed = np.ones(blocks)
    release = math.exp(-0.010 / 0.19)
    state = 1.0
    for index, target in enumerate(anticipated):
        state = float(target) if target < state else min(float(target), 1 - (1 - state) * release)
        smoothed[index] = state
    positions = np.arange(length, dtype=np.float64) / block
    smooth_gain = np.interp(positions, np.arange(blocks), smoothed).astype(np.float32)
    mix *= smooth_gain[:, None]
    del smooth_gain, positions
    final_peak = peak(mix)
    if final_peak > target_peak:
        mix *= target_peak / final_peak
    mix[0] = 0
    mix[-1] = 0
    return {
        "masterGainDb": round(db(gain), 3),
        "maximumGainReductionDb": round(-db(float(np.min(smoothed))), 3),
        "targetRmsDbfs": TARGET_RMS_DBFS,
        "peakCeilingDbfs": PEAK_CEILING_DBFS,
        "fadeInSeconds": fade_in,
        "fadeOutSeconds": fade_out,
    }


def write_pcm24(filename: Path, mix: np.ndarray, seed: int) -> None:
    rng = np.random.default_rng(seed)
    with wave.open(str(filename), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(3)
        target.setframerate(SAMPLE_RATE)
        for start in range(0, len(mix), SAMPLE_RATE * 4):
            piece = mix[start:start + SAMPLE_RATE * 4]
            dither = (rng.random(piece.shape) - rng.random(piece.shape)) * 0.5
            quantized = np.rint(piece.astype(np.float64) * 8388607 + dither)
            quantized[piece == 0] = 0
            integers = np.clip(quantized, -8388608, 8388607).astype(np.int32).reshape(-1)
            packed = np.empty((integers.size, 3), dtype=np.uint8)
            packed[:, 0] = integers & 255
            packed[:, 1] = (integers >> 8) & 255
            packed[:, 2] = (integers >> 16) & 255
            target.writeframesraw(packed.tobytes())


def section_bounds(score: dict) -> list[dict]:
    output = []
    for section in score.get("sections", []):
        start = float(section.get("start", section.get("t", 0)))
        end = float(section.get("end", start + section.get("duration", section.get("d", 0))))
        if end > start:
            output.append({"name": section.get("name", section.get("label", "段落")), "start": start, "end": end})
    return output


def analyze_written_wav(filename: Path, score: dict) -> dict:
    sections = section_bounds(score)
    section_energy = np.zeros(len(sections))
    section_samples = np.zeros(len(sections), dtype=np.int64)
    window_energy = np.zeros(math.ceil(score["duration"] / 10))
    window_samples = np.zeros(len(window_energy), dtype=np.int64)
    sum_squares = 0.0
    channel_sums = np.zeros(2)
    maximum = 0.0
    clipped = 0
    first_peak = 0.0
    last_peak = 0.0
    frames_seen = 0
    with wave.open(str(filename), "rb") as source:
        if source.getnchannels() != 2 or source.getsampwidth() != 3 or source.getframerate() != SAMPLE_RATE:
            raise ValueError("落盘 WAV 格式不正确")
        total_frames = source.getnframes()
        while raw := source.readframes(SAMPLE_RATE * 4):
            triplets = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
            integers = triplets[:, 0].astype(np.int32) | (triplets[:, 1].astype(np.int32) << 8) | (triplets[:, 2].astype(np.int32) << 16)
            integers = np.where(integers & 0x800000, integers - 0x1000000, integers)
            values = (integers.astype(np.float64) / 8388607).reshape(-1, 2)
            end_frame = frames_seen + len(values)
            current_peak = peak(values)
            maximum = max(maximum, current_peak)
            sum_squares += float(np.sum(values * values))
            channel_sums += np.sum(values, axis=0)
            clipped += int(np.count_nonzero(np.abs(values) >= 0.99999))
            if not frames_seen:
                first_peak = peak(values[:1])
            last_peak = peak(values[-1:])
            for index in range(frames_seen // (SAMPLE_RATE * 10), min(len(window_energy), (end_frame - 1) // (SAMPLE_RATE * 10) + 1)):
                left = max(0, index * SAMPLE_RATE * 10 - frames_seen)
                right = min(len(values), (index + 1) * SAMPLE_RATE * 10 - frames_seen)
                window_energy[index] += float(np.sum(values[left:right] ** 2))
                window_samples[index] += (right - left) * 2
            for index, section in enumerate(sections):
                left = max(0, round(section["start"] * SAMPLE_RATE) - frames_seen)
                right = min(len(values), round(section["end"] * SAMPLE_RATE) - frames_seen)
                if right > left:
                    section_energy[index] += float(np.sum(values[left:right] ** 2))
                    section_samples[index] += (right - left) * 2
            frames_seen = end_frame
    duration = total_frames / SAMPLE_RATE
    if abs(duration - score["duration"]) > 1 / SAMPLE_RATE:
        raise ValueError("落盘时长不等于乐谱完整时长")
    if clipped or maximum > 10 ** (-2.5 / 20) or first_peak > 1e-6 or last_peak > 1e-6:
        raise ValueError("母带存在削波、过高峰值或非零首尾")
    energy_windows = [
        {"start": index * 10, "end": min(duration, (index + 1) * 10),
         "rmsDbfs": round(db(math.sqrt(value / max(1, int(window_samples[index])))), 3)}
        for index, value in enumerate(window_energy)
    ]
    return {
        "duration": duration, "frames": total_frames, "sampleRate": SAMPLE_RATE,
        "channels": 2, "bitDepth": 24, "peakDbfs": round(db(maximum), 3),
        "rmsDbfs": round(db(math.sqrt(sum_squares / (total_frames * 2))), 3),
        "clippedSamples": clipped, "startPeak": first_peak, "endPeak": last_peak,
        "dcOffset": float(np.max(np.abs(channel_sums / total_frames))),
        "tenSecondWindows": energy_windows,
        "sections": [{**section, "rmsDbfs": round(db(math.sqrt(section_energy[index] / max(1, int(section_samples[index])))), 3)}
                     for index, section in enumerate(sections)],
    }


def validate_score(score: dict, smoke: bool = False) -> None:
    if not isinstance(score.get("id"), str) or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for character in score["id"]):
        raise ValueError("乐谱 id 必须是安全的 ASCII 文件名")
    if not smoke and float(score.get("duration", 0)) < 120:
        raise ValueError("正式配乐必须不少于两分钟")
    if score.get("sampleRate", SAMPLE_RATE) != SAMPLE_RATE or not score.get("notes"):
        raise ValueError("乐谱采样率或音符列表不正确")
    for note in score["notes"]:
        velocity = float(note.get("v", note.get("velocity", 0.5)))
        if note["instrument"] not in INSTRUMENTS or not 0 <= velocity <= 1:
            raise ValueError("未知音色或力度超出范围")
        if not 0 <= float(note["t"]) < score["duration"] or float(note["d"]) <= 0 or not 24 <= int(note["m"]) <= 100:
            raise ValueError("音符时间、音高或时值超出范围")
        if not -1 <= float(note.get("pan", 0)) <= 1:
            raise ValueError("声像超出范围")


def render_score(score: dict, out_directory: Path, smoke: bool = False) -> dict:
    validate_score(score, smoke)
    started = time.perf_counter()
    rng = np.random.default_rng(stable_seed(score["id"]))
    mix = np.zeros((round(score["duration"] * SAMPLE_RATE), 2), dtype=np.float32)
    cache = VoiceCache()
    instrument_counts = {}
    for index, note in enumerate(sorted(score["notes"], key=lambda value: value["t"])):
        velocity = float(note.get("v", note.get("velocity", 0.5)))
        if not velocity:
            continue
        instrument = note["instrument"]
        variation = int(rng.integers(0, 3))
        voice = cache.get(instrument, int(note["m"]), float(note["d"]), variation, velocity)
        timing_offset = float(rng.uniform(-0.006, 0.006)) if instrument != "sheng" else float(rng.uniform(-0.009, 0.009))
        start = max(0, round((float(note["t"]) + timing_offset) * SAMPLE_RATE))
        available = min(len(voice), len(mix) - start)
        if available <= 0:
            continue
        amplitude = INSTRUMENTS[instrument]["gain"] * velocity ** 1.16 * float(rng.uniform(0.965, 1.035))
        pan = max(-0.7, min(0.7, float(note.get("pan", 0)) + float(rng.uniform(-0.018, 0.018))))
        angle = (pan + 1) * math.pi / 4
        mix[start:start + available, 0] += voice[:available] * (amplitude * math.cos(angle))
        mix[start:start + available, 1] += voice[:available] * (amplitude * math.sin(angle))
        instrument_counts[instrument] = instrument_counts.get(instrument, 0) + 1
        if (index + 1) % 120 == 0:
            print(f"{score['id']}：已编配 {index + 1}/{len(score['notes'])} 个音符", flush=True)
    del cache.voices
    # 两声道共用一个温暖短房间；保持干声清楚，不让持续混响掩盖寻物交互。
    middle = (mix[:, 0] + mix[:, 1]) * 0.5
    for channel in range(2):
        room = overlap_add_convolve(middle, warm_room_impulse(channel))
        mix[:, channel] = mix[:, channel] * 0.94 + room * 0.12
        del room
    del middle
    mastering = master_audio(mix, 0.02 if smoke else 3, 0.4 if smoke else 5)
    out_directory.mkdir(parents=True, exist_ok=True)
    filename = out_directory / f"{score['id']}.wav"
    write_pcm24(filename, mix, stable_seed(score["id"] + ":dither"))
    del mix
    metrics = analyze_written_wav(filename, score)
    result = {
        "id": score["id"], "title": score.get("title", score["id"]),
        "chapter": score.get("chapter"), "master": str(filename), "bytes": filename.stat().st_size,
        "noteCount": len(score["notes"]), "instrumentNotes": instrument_counts,
        "activeScoreStart": min(float(note["t"]) for note in score["notes"]),
        "activeScoreEnd": max(float(note["t"]) + float(note["d"]) for note in score["notes"]),
        "cacheHits": cache.hits, "cacheMisses": cache.misses,
        "renderSeconds": round(time.perf_counter() - started, 3),
        "sha256": hashlib.sha256(filename.read_bytes()).hexdigest(),
        "mastering": mastering, **metrics,
        "source": "原创乐谱与物理启发离线合成；非真实乐器录音；未声称完成听审。",
    }
    print(json.dumps({key: result[key] for key in ["id", "duration", "peakDbfs", "rmsDbfs", "renderSeconds", "bytes"]}, ensure_ascii=False), flush=True)
    return result


def smoke_score() -> dict:
    names = ["qin", "zheng", "pipa", "xiao", "sheng", "wood"]
    return {
        "id": "timbre-smoke", "title": "音色与母带校验", "duration": 15, "sampleRate": SAMPLE_RATE,
        "notes": [{"t": 0.2 + index * 2.2, "d": 1.25 if name != "wood" else 0.2,
                   "m": 62 if name not in ["qin", "wood"] else 50,
                   "v": 0.65, "instrument": name, "pan": -0.15 + index * 0.06}
                  for index, name in enumerate(names)],
        "sections": [{"name": name, "start": index * 2.2, "end": min(15, (index + 1) * 2.2)}
                     for index, name in enumerate(names)]
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="渲染原创宋画氛围配乐，输出无损 PCM 母带")
    parser.add_argument("--scores", type=Path, default=PROJECT_ROOT / "scripts/scores")
    parser.add_argument("--out", type=Path, default=WORKSPACE_ROOT / "outputs/music-masters")
    parser.add_argument("--report", type=Path, default=WORKSPACE_ROOT / "outputs/music-render-report.json")
    parser.add_argument("--only", help="只渲染指定曲目 id，多首用逗号分隔")
    parser.add_argument("--smoke", action="store_true", help="渲染六音色短校验，不替代正式配乐")
    args = parser.parse_args()
    if args.smoke:
        scores = [smoke_score()]
    else:
        requested = set(args.only.split(",")) if args.only else None
        filenames = [filename for filename in sorted(args.scores.glob("*.json"))
                     if requested is None or filename.stem in requested]
        scores = [json.loads(filename.read_text(encoding="utf-8-sig")) for filename in filenames]
        scores = [score for score in scores if requested is None or score.get("id") in requested]
        if not scores:
            raise ValueError("没有找到待渲染的完整乐谱")
    results = [render_score(score, args.out, args.smoke) for score in scores]
    report = {
        "engine": "原创模态弦振、气息与簧管的 NumPy 离线合成",
        "sampleRate": SAMPLE_RATE, "channels": 2, "bitDepth": 24,
        "smokeOnly": args.smoke, "tracks": results,
        "verification": "报告基于重新读取落盘 PCM；时长、峰值、RMS、无削波和零端点已检查；不代表已完成听审。"
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"已保存渲染报告：{args.report}", flush=True)


if __name__ == "__main__":
    main()
