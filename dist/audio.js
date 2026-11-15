// 曲目由真实素材清单注入；不在控制器中预设尚未制作的歌曲。
window.createGameAudio = function createGameAudio({ onChange = () => {} } = {}) {
  const storageKey = 'ruhua-audio-v1';
  const clamp = (value, fallback) => Number.isFinite(Number(value))
    ? Math.max(0, Math.min(1, Number(value))) : fallback;
  const preferences = {
    musicEnabled: false, effectsEnabled: true, musicVolume: 0.38,
    effectsVolume: 0.55, trackId: ''
  };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      for (const key of ['musicEnabled', 'effectsEnabled']) {
        if (typeof saved[key] === 'boolean') preferences[key] = saved[key];
      }
      if (typeof saved.musicVolume === 'number') preferences.musicVolume = clamp(saved.musicVolume, preferences.musicVolume);
      if (typeof saved.effectsVolume === 'number') preferences.effectsVolume = clamp(saved.effectsVolume, preferences.effectsVolume);
      if (typeof saved.trackId === 'string') preferences.trackId = saved.trackId;
    }
  } catch { /* 存储不可用不阻断声音操作。 */ }

  const music = new Audio();
  music.preload = 'none';
  music.volume = 0;
  let tracks = [];
  let effects = new Map();
  let unlocked = false;
  let disposed = false;
  let chapter = 0;
  let activeSource = '';
  let activeId = '';
  let transition = 0;
  let volumeRamp = 0;
  let loading = false;
  let error = '';
  let duck = 1;
  let duckTimer;
  let context;
  let effectsMaster;
  let pendingEffects = 0;
  let effectEpoch = 0;
  const effectBuffers = new Map();
  const effectDownloads = new Set();
  const effectTimes = new Map();
  const effectVersions = new Map();
  const voices = new Set();

  const selectedTrack = () => tracks.find(track => track.id === preferences.trackId) || null;
  const wantsMusic = () => !disposed && unlocked && preferences.musicEnabled
    && !document.hidden && Boolean(selectedTrack());
  const targetVolume = () => preferences.musicVolume * duck;

  function getState() {
    const track = selectedTrack();
    return {
      title: track?.title || '', trackId: track?.id || '', trackCount: tracks.length,
      isPlaying: wantsMusic() && !music.paused && !music.ended,
      musicEnabled: preferences.musicEnabled, effectsEnabled: preferences.effectsEnabled,
      musicVolume: preferences.musicVolume, effectsVolume: preferences.effectsVolume,
      loading, error, unlocked
    };
  }
  function emit() { if (!disposed) onChange(getState()); }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
  }

  function fadeMusic(to, seconds, token = transition) {
    const ramp = ++volumeRamp;
    const from = music.volume;
    const start = Date.now();
    return new Promise(resolve => {
      function step() {
        if (disposed || token !== transition || ramp !== volumeRamp) return resolve(false);
        const progress = seconds ? Math.min(1, (Date.now() - start) / (seconds * 1000)) : 1;
        music.volume = clamp(from + (to - from) * progress, 0);
        if (progress === 1) resolve(true);
        else requestAnimationFrame(step);
      }
      step();
    });
  }

  async function synchronizeMusic() {
    const token = ++transition;
    const track = selectedTrack();
    if (!wantsMusic()) {
      loading = false;
      emit();
      if (!music.paused && !document.hidden) await fadeMusic(0, 0.18, token);
      if (token !== transition || disposed) return false;
      music.pause();
      music.volume = 0;
      emit();
      return false;
    }

    error = '';
    loading = true;
    emit();
    try {
      const changed = activeSource !== track.src || activeId !== track.id;
      if (changed && !music.paused) await fadeMusic(0, 0.2, token);
      if (token !== transition || !wantsMusic()) return false;
      if (changed) {
        // 单个媒体元素先停旧曲再换源，快速切换也不会留下重叠播放。
        music.pause();
        music.volume = 0;
        activeSource = track.src;
        activeId = track.id;
        music.src = track.src;
        music.load();
      } else if (music.ended) music.currentTime = 0;
      // 初次启用时不在 play() 前等待异步任务，保留用户手势的播放许可。
      await music.play();
      if (token !== transition || !wantsMusic()) return false;
      loading = false;
      emit();
      await fadeMusic(targetVolume(), 0.4, token);
      return token === transition && wantsMusic();
    } catch (failure) {
      if (token !== transition || disposed) return false;
      loading = false;
      music.pause();
      if (failure?.name === 'NotAllowedError') {
        unlocked = false;
        error = '请轻点开启音乐';
      } else error = '这支曲暂未奏响，请重试';
      emit();
      return false;
    }
  }

  function ensureContext() {
    if (!context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) throw new Error('当前浏览器不支持音效');
      context = new Context();
      effectsMaster = context.createGain();
      effectsMaster.gain.value = preferences.effectsVolume;
      effectsMaster.connect(context.destination);
    }
    return context;
  }

  async function resume() {
    if (disposed) return false;
    unlocked = true;
    error = '';
    // 解锁只能由游戏在用户手势中调用；配置清单和恢复偏好不会自行发声。
    let contextReady = Promise.resolve();
    if (preferences.effectsEnabled && !document.hidden) {
      try { contextReady = ensureContext().resume().catch(() => {}); } catch {}
    }
    const musicReady = synchronizeMusic();
    await contextReady;
    return musicReady;
  }
  function enable() {
    preferences.musicEnabled = true;
    save();
    return resume();
  }
  function setMusicEnabled(enabled) {
    preferences.musicEnabled = Boolean(enabled);
    save();
    return synchronizeMusic();
  }
  function toggle() {
    return unlocked && preferences.musicEnabled ? setMusicEnabled(false) : enable();
  }
  function setMusicVolume(value) {
    preferences.musicVolume = clamp(value, preferences.musicVolume);
    save();
    if (wantsMusic() && !loading && !music.paused) void fadeMusic(targetVolume(), 0.08);
    emit();
  }
  function stopEffects() {
    effectEpoch++;
    voices.forEach(voice => {
      try { voice.source.stop(); } catch {}
      voice.source.disconnect();
      voice.gain.disconnect();
    });
    voices.clear();
  }
  function setEffectsEnabled(enabled) {
    preferences.effectsEnabled = Boolean(enabled);
    if (!preferences.effectsEnabled) stopEffects();
    save();
    emit();
  }
  function setEffectsVolume(value) {
    preferences.effectsVolume = clamp(value, preferences.effectsVolume);
    if (context && effectsMaster) {
      effectsMaster.gain.setTargetAtTime(preferences.effectsVolume, context.currentTime, 0.015);
    }
    save();
    emit();
  }

  function playTrack(id) {
    if (!tracks.some(track => track.id === id)) return Promise.resolve(false);
    preferences.trackId = id;
    save();
    return synchronizeMusic();
  }
  function stepTrack(direction) {
    if (!tracks.length) return Promise.resolve(false);
    const current = Math.max(0, tracks.findIndex(track => track.id === preferences.trackId));
    return playTrack(tracks[(current + direction + tracks.length) % tracks.length].id);
  }
  function setChapter(index) {
    chapter = Number.isInteger(index) && index >= 0 ? index : 0;
    const matched = tracks.filter(track => track.chapter === chapter);
    const candidates = matched.length ? matched : tracks.slice(chapter * 2, chapter * 2 + 2);
    if (!candidates.length || candidates.some(track => track.id === preferences.trackId)) {
      return Promise.resolve(false);
    }
    return playTrack(candidates[0].id);
  }

  function configure({ tracks: nextTracks = [], effects: nextEffects = {} } = {}) {
    const seen = new Set();
    tracks = nextTracks.filter(track => {
      if (typeof track?.id !== 'string' || !track.id || typeof track.src !== 'string'
          || !track.src || seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    }).map(track => ({ ...track, title: track.title || track.id }));
    const entries = Array.isArray(nextEffects)
      ? nextEffects.map(effect => [effect.id, effect]) : Object.entries(nextEffects);
    effects = new Map(entries.map(([id, effect]) => [id,
      typeof effect === 'string' ? { src: effect } : effect]).filter(([id, effect]) => id && effect?.src));
    const track = selectedTrack();
    if (!track) preferences.trackId = (tracks.find(item => item.chapter === chapter) || tracks[0])?.id || '';
    error = '';
    save();
    emit();
    if (unlocked) void synchronizeMusic();
  }

  function duckMusic(id, duration) {
    if (id !== 'found' && id !== 'complete') return;
    duck = Math.min(duck, id === 'complete' ? 0.72 : 0.83);
    if (wantsMusic() && !loading && !music.paused) void fadeMusic(targetVolume(), 0.055);
    clearTimeout(duckTimer);
    duckTimer = setTimeout(() => {
      duck = 1;
      if (wantsMusic() && !loading && !music.paused) void fadeMusic(targetVolume(), 0.4);
    }, Math.min(2200, Math.max(650, duration * 1000)));
  }

  async function effectBuffer(effect) {
    if (!effectBuffers.has(effect.src)) {
      const request = new AbortController();
      effectDownloads.add(request);
      // 包含响应正文的下载也须限时，避免挂起请求永久占用音效并发名额。
      const timeout = setTimeout(() => request.abort(), 8000);
      const promise = fetch(effect.src, { signal: request.signal }).then(response => {
        if (!response.ok) throw new Error('音效文件未能加载');
        return response.arrayBuffer();
      }).finally(() => {
        clearTimeout(timeout);
        effectDownloads.delete(request);
      }).then(bytes => {
        if (disposed || request.signal.aborted) throw new Error('音效下载已取消');
        return ensureContext().decodeAudioData(bytes);
      });
      effectBuffers.set(effect.src, promise);
      promise.catch(() => { if (effectBuffers.get(effect.src) === promise) effectBuffers.delete(effect.src); });
    }
    return effectBuffers.get(effect.src);
  }

  async function playEffect(id, { cooldown } = {}) {
    const effect = effects.get(id);
    if (!effect || disposed || !unlocked || !preferences.effectsEnabled || document.hidden) return false;
    const interval = Number.isFinite(cooldown) ? Math.max(0, cooldown)
      : Number.isFinite(effect.cooldown) ? Math.max(0, effect.cooldown) : 100;
    const now = Date.now();
    if (now - (effectTimes.get(id) ?? -Infinity) < interval || voices.size + pendingEffects >= 4) return false;
    effectTimes.set(id, now);
    const epoch = effectEpoch;
    const family = id === 'page-open' || id === 'page-close' ? 'page' : id;
    const version = (effectVersions.get(family) || 0) + 1;
    effectVersions.set(family, version);
    pendingEffects++;
    try {
      const audioContext = ensureContext();
      const waking = audioContext.resume();
      const [buffer] = await Promise.all([effectBuffer(effect), waking]);
      // 网络迟到或已被新动作替代的反馈直接跳过，避免关页后才响起开页声。
      if (disposed || !unlocked || !preferences.effectsEnabled || document.hidden
          || epoch !== effectEpoch || version !== effectVersions.get(family)
          || Date.now() - now > (id === 'complete' || id === 'found' ? 1800 : 900)
          || effects.get(id)?.src !== effect.src) return false;
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      const time = audioContext.currentTime;
      const end = time + buffer.duration;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(1, time + Math.min(0.003, buffer.duration / 3));
      gain.gain.setValueAtTime(1, Math.max(time + 0.003, end - 0.008));
      gain.gain.linearRampToValueAtTime(0, end);
      source.connect(gain).connect(effectsMaster);
      const voice = { source, gain };
      voices.add(voice);
      source.onended = () => {
        voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
      duckMusic(id, buffer.duration);
      return true;
    } catch {
      if (!disposed) { error = '音效暂未响起，请重试'; emit(); }
      return false;
    } finally { pendingEffects--; }
  }

  music.addEventListener('playing', () => {
    if (!wantsMusic() || activeId !== preferences.trackId) { music.pause(); return; }
    loading = false;
    emit();
  });
  music.addEventListener('pause', emit);
  music.addEventListener('waiting', () => { if (wantsMusic()) { loading = true; emit(); } });
  music.addEventListener('error', () => {
    if (!disposed && wantsMusic()) { loading = false; error = '这支曲暂未奏响，请重试'; emit(); }
  });
  music.addEventListener('ended', () => { if (wantsMusic()) void stepTrack(1); });

  function onVisibilityChange() {
    if (document.hidden) {
      transition++;
      volumeRamp++;
      music.pause();
      music.volume = 0;
      loading = false;
      stopEffects();
      if (context?.state === 'running') void context.suspend().catch(() => {});
      emit();
    } else if (unlocked) {
      if (preferences.effectsEnabled && context) void context.resume().catch(() => {});
      void synchronizeMusic();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  function destroy() {
    disposed = true;
    transition++;
    volumeRamp++;
    clearTimeout(duckTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    music.pause();
    music.removeAttribute('src');
    music.load();
    stopEffects();
    effectDownloads.forEach(request => request.abort());
    effectDownloads.clear();
    effectBuffers.clear();
    if (context) void context.close().catch(() => {});
  }

  return {
    configure, enable, resume, toggle, setMusicEnabled, setEffectsEnabled,
    setMusicVolume, setEffectsVolume, playTrack, setChapter, playEffect, getState, destroy,
    next: () => stepTrack(1), previous: () => stepTrack(-1)
  };
};
