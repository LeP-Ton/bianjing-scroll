(() => {
  const byId = id => document.getElementById(id);
  const catalog = window.RUHUA_AUDIO_CATALOG || { tracks: [], effects: {} };
  let renderedTracks = '';
  let previewing = false;
  const engine = window.createGameAudio({ onChange: render });
  window.ruhuaAudio = engine;

  function render(state) {
    byId('soundBtn').classList.toggle('sound-active', state.unlocked && (state.isPlaying || state.effectsEnabled));
    byId('musicSettings').hidden = state.trackCount === 0;
    byId('currentTrackTitle').textContent = state.title;
    byId('musicPlayBtn').textContent = state.musicEnabled ? '暂歇' : '奏乐';
    byId('musicPlayBtn').setAttribute('aria-label', state.musicEnabled ? '暂停配乐' : '播放配乐');
    byId('musicVolume').value = Math.round(state.musicVolume * 100);
    byId('effectsVolume').value = Math.round(state.effectsVolume * 100);
    byId('musicVolumeValue').textContent = `${Math.round(state.musicVolume * 100)}%`;
    byId('effectsVolumeValue').textContent = `${Math.round(state.effectsVolume * 100)}%`;
    byId('effectsEnabled').checked = state.effectsEnabled;
    byId('testEffect').disabled = !state.effectsEnabled || previewing;
    byId('audioStatus').textContent = state.error || (state.loading ? '乐声渐起…' : '');

    const signature = catalog.tracks.map(track => track.id).join('|');
    if (signature !== renderedTracks) {
      renderedTracks = signature;
      byId('trackList').replaceChildren();
      catalog.tracks.forEach((track, index) => {
        const button = document.createElement('button');
        button.className = 'track-choice';
        button.dataset.track = track.id;
        const number = document.createElement('small');
        number.textContent = String(index + 1).padStart(2, '0');
        const title = document.createElement('span');
        title.textContent = track.title;
        const duration = document.createElement('small');
        const seconds = Math.round(track.duration || 0);
        duration.textContent = seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '';
        button.append(number, title, duration);
        button.onclick = () => {
          // 播放意图在同一手势内提交，避免旧选曲等待结束后重新开启已暂停的音乐。
          void engine.playTrack(track.id);
          void engine.enable();
        };
        byId('trackList').append(button);
      });
    }
    byId('trackList').querySelectorAll('button').forEach(button => {
      button.classList.toggle('selected', button.dataset.track === state.trackId);
      button.setAttribute('aria-pressed', String(button.dataset.track === state.trackId));
    });
  }

  engine.configure(catalog);
  byId('soundBtn').onclick = () => {
    if (!byId('soundDialog').open) {
      byId('soundDialog').showModal();
      // 设置入口不等待媒体网络加载，任何时候都能立即静音或换曲。
      void engine.resume();
      void engine.playEffect('page-open');
    }
  };
  byId('musicPlayBtn').onclick = () => { void engine.toggle(); };
  byId('previousTrack').onclick = () => { void engine.previous(); };
  byId('nextTrack').onclick = () => { void engine.next(); };
  byId('musicVolume').oninput = event => engine.setMusicVolume(Number(event.target.value) / 100);
  byId('effectsVolume').oninput = event => engine.setEffectsVolume(Number(event.target.value) / 100);
  byId('effectsEnabled').onchange = event => {
    engine.setEffectsEnabled(event.target.checked);
    if (event.target.checked) void engine.resume();
  };
  byId('testEffect').onclick = async () => {
    if (previewing) return;
    previewing = true;
    byId('testEffect').disabled = true;
    byId('testEffect').textContent = '试听中';
    try {
      void engine.resume();
      const played = await engine.playEffect('found');
      byId('testEffect').textContent = played ? '再听' : '试音';
    } finally {
      previewing = false;
      byId('testEffect').disabled = !engine.getState().effectsEnabled;
    }
  };

  // 首次主动操作只解锁默认音效；音乐仍由玩家明确点选“奏乐”。
  function unlock() {
    if (!engine.getState().unlocked) void engine.resume();
  }
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') unlock();
  });
})();
