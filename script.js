// VoidPiano — Main application script (v16)

const NOTE_COLORS = [
  '#ff3355','#ff5533','#ff8822','#ffcc22',
  '#ffee33','#33ff88','#00ffcc','#33eeff',
  '#3388ff','#8833ff','#cc33ff','#ff33cc'
];

const OCT_START = 2, OCT_END = 6;
const WKW = 34, WKH = 118, BKW = 22, BKH = 74;

const KNOB_DEFAULTS = {
  sustainCanvas:  0.5,
  volumeCanvas:   0.8,
  metroVolCanvas: 0.7,
  reverbCanvas:   0.2,
  toneCanvas:     0.85,
  chorusCanvas:   0.0,
};

const PIANO_PRESETS = [
  {
    id: 'salamander',
    name: 'SALAMANDER',
    desc: 'Yamaha C5 · Warm',
    emoji: '🎹',
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    urls: {
      A0:'A0.mp3', C1:'C1.mp3', 'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3',
      A1:'A1.mp3', C2:'C2.mp3', 'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3',
      A2:'A2.mp3', C3:'C3.mp3', 'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3',
      A3:'A3.mp3', C4:'C4.mp3', 'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3',
      A4:'A4.mp3', C5:'C5.mp3', 'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3',
      A5:'A5.mp3', C6:'C6.mp3',
    },
  },
  {
    id: 'bright',
    name: 'BRIGHT GRAND',
    desc: 'FluidR3 · Bright',
    emoji: '✨',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/',
    urls: {
      'A1':'A1.mp3', 'C2':'C2.mp3', 'Eb2':'Eb2.mp3', 'Gb2':'Gb2.mp3',
      'A2':'A2.mp3', 'C3':'C3.mp3', 'Eb3':'Eb3.mp3', 'Gb3':'Gb3.mp3',
      'A3':'A3.mp3', 'C4':'C4.mp3', 'Eb4':'Eb4.mp3', 'Gb4':'Gb4.mp3',
      'A4':'A4.mp3', 'C5':'C5.mp3', 'Eb5':'Eb5.mp3', 'Gb5':'Gb5.mp3',
      'A5':'A5.mp3', 'C6':'C6.mp3',
    },
  },
  {
    id: 'electric',
    name: 'ELECTRIC GRAND',
    desc: 'FluidR3 · Electric',
    emoji: '⚡',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_grand_piano-mp3/',
    urls: {
      'A1':'A1.mp3', 'C2':'C2.mp3', 'Eb2':'Eb2.mp3', 'Gb2':'Gb2.mp3',
      'A2':'A2.mp3', 'C3':'C3.mp3', 'Eb3':'Eb3.mp3', 'Gb3':'Gb3.mp3',
      'A3':'A3.mp3', 'C4':'C4.mp3', 'Eb4':'Eb4.mp3', 'Gb4':'Gb4.mp3',
      'A4':'A4.mp3', 'C5':'C5.mp3', 'Eb5':'Eb5.mp3', 'Gb5':'Gb5.mp3',
      'A5':'A5.mp3', 'C6':'C6.mp3',
    },
  },
  {
    id: 'honky',
    name: 'HONKY TONK',
    desc: 'FluidR3 · Vintage',
    emoji: '🎪',
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/honkytonk_piano-mp3/',
    urls: {
      'A1':'A1.mp3', 'C2':'C2.mp3', 'Eb2':'Eb2.mp3', 'Gb2':'Gb2.mp3',
      'A2':'A2.mp3', 'C3':'C3.mp3', 'Eb3':'Eb3.mp3', 'Gb3':'Gb3.mp3',
      'A3':'A3.mp3', 'C4':'C4.mp3', 'Eb4':'Eb4.mp3', 'Gb4':'Gb4.mp3',
      'A4':'A4.mp3', 'C5':'C5.mp3', 'Eb5':'Eb5.mp3', 'Gb5':'Gb5.mp3',
      'A5':'A5.mp3', 'C6':'C6.mp3',
    },
  },
];

// ===== STATE =====
let bpm = 120;
let isPlaying = false, isRecording = false;
let fxEnabled = true;
let sustainVal  = KNOB_DEFAULTS.sustainCanvas;
let volumeVal   = KNOB_DEFAULTS.volumeCanvas;
let metroVolVal = KNOB_DEFAULTS.metroVolCanvas;
let reverbVal   = KNOB_DEFAULTS.reverbCanvas;
let toneVal     = KNOB_DEFAULTS.toneCanvas;
let chorusVal   = KNOB_DEFAULTS.chorusCanvas;
let pressedKeys = new Set();
let seqTimer = null;
let currentBeat = 0;
let recStart = 0, recEnd = 0;
let recPianoEvents = [];
let particles = [];
let piano = null;
let pianoFilter = null, pianoReverb = null, pianoChorus = null;
let pianoVol = null, metroVol = null;
let metroSynthTick = null, metroSynthAccent = null;
let audioReady = false;
let audioContextStarted = false;
let currentPianoId = 'salamander';
let isLoadingPiano = false;
let metroPhase = 0;
let metroLastTime = 0;

// ===== LOADING =====
function setLoadProgress(pct, msg) {
  document.getElementById('loadBar').style.width = pct + '%';
  document.getElementById('loadSub').textContent = msg;
}

function hideLoading() {
  const l = document.getElementById('loading');
  l.style.opacity = '0';
  setTimeout(() => {
    l.style.display = 'none';
    document.getElementById('startOverlay').style.display = 'flex';
  }, 600);
}

// ===== AUDIO PARAMS =====
function getReleaseTime() { return 0.1 + sustainVal * 20; }

function applySustain() {
  if (!piano) return;
  try { piano.release = getReleaseTime(); } catch(e) {}
}

function applyPianoVolume() {
  if (!pianoVol) return;
  try { pianoVol.volume.value = Tone.gainToDb(Math.max(0.001, volumeVal)); } catch(e) {}
}

function applyMetroVolume() {
  if (!metroVol) return;
  try { metroVol.volume.value = Tone.gainToDb(Math.max(0.001, metroVolVal)); } catch(e) {}
}

function applyReverb() {
  if (!pianoReverb) return;
  try { pianoReverb.wet.value = reverbVal * 0.85; } catch(e) {}
}

function applyTone() {
  if (!pianoFilter) return;
  try {
    const freq = Math.pow(10, 2.48 + toneVal * 1.82);
    pianoFilter.frequency.value = Math.min(20000, Math.max(200, freq));
  } catch(e) {}
}

function applyChorus() {
  if (!pianoChorus) return;
  try { pianoChorus.wet.value = chorusVal * 0.7; } catch(e) {}
}

// ===== AUDIO INIT =====
async function initAudioAfterGesture() {
  try {
    await Tone.start();
    audioContextStarted = true;

    pianoVol = new Tone.Volume(Tone.gainToDb(volumeVal)).toDestination();
    metroVol = new Tone.Volume(Tone.gainToDb(metroVolVal)).toDestination();

    // Piano FX chain: piano -> filter -> chorus -> reverb -> pianoVol
    pianoFilter = new Tone.Filter({ frequency: 12000, type: 'lowpass' });
    pianoChorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.4, wet: 0 }).start();
    pianoReverb = new Tone.Reverb({ decay: 2.5, wet: reverbVal * 0.85 });

    pianoFilter.connect(pianoChorus);
    pianoChorus.connect(pianoReverb);
    pianoReverb.connect(pianoVol);

    applyTone();
    applyChorus();

    setLoadProgress(30, 'LOADING GRAND PIANO...');
    await loadPianoSampler(PIANO_PRESETS[0]);

    setLoadProgress(80, 'LOADING METRONOME...');

    metroSynthTick = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
      volume: -4,
    }).connect(metroVol);

    metroSynthAccent = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
      volume: 0,
    }).connect(metroVol);

    setLoadProgress(100, 'READY');
    audioReady = true;

  } catch(err) {
    console.warn('Audio init error:', err);
    try {
      if (!pianoVol) pianoVol = new Tone.Volume(0).toDestination();
      if (!metroVol) metroVol = new Tone.Volume(0).toDestination();
      if (!pianoFilter) {
        pianoFilter = new Tone.Filter({ frequency: 12000, type: 'lowpass' });
        pianoChorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.4, wet: 0 }).start();
        pianoReverb = new Tone.Reverb({ decay: 2, wet: 0.2 });
        pianoFilter.connect(pianoChorus);
        pianoChorus.connect(pianoReverb);
        pianoReverb.connect(pianoVol);
      }
      piano = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: getReleaseTime() },
        volume: 0,
      }).connect(pianoFilter);
      audioReady = true;
      audioContextStarted = true;
    } catch(e2) {}
    setLoadProgress(100, 'READY (FALLBACK)');
    audioReady = true;
  }
}

async function loadPianoSampler(preset) {
  return new Promise((resolve) => {
    const newPiano = new Tone.Sampler({
      urls: preset.urls,
      baseUrl: preset.baseUrl,
      release: getReleaseTime(),
      onload: () => {
        piano = newPiano;
        resolve();
      },
    }).connect(pianoFilter);

    setTimeout(() => {
      if (!piano || piano !== newPiano) piano = newPiano;
      resolve();
    }, 10000);
  });
}

async function switchPiano(presetId) {
  if (isLoadingPiano || currentPianoId === presetId) return;
  const preset = PIANO_PRESETS.find(p => p.id === presetId);
  if (!preset || !audioReady || !audioContextStarted) return;

  isLoadingPiano = true;

  pressedKeys.forEach(midi => {
    try {
      const note = Tone.Frequency(midi, 'midi').toNote();
      if (piano) piano.triggerRelease(note, Tone.now());
    } catch(e) {}
  });
  pressedKeys.clear();
  renderPiano();

  setPianoSelectorState(presetId, true);
  try { if (piano) piano.disconnect(); } catch(e) {}

  try {
    await Promise.race([
      loadPianoSampler(preset),
      new Promise(resolve => setTimeout(resolve, 12000))
    ]);
  } catch(e) {
    console.warn('Piano switch error:', e);
  }

  currentPianoId = presetId;
  isLoadingPiano = false;
  setPianoSelectorState(presetId, false);
}

function setPianoSelectorState(activeId, loading) {
  const preset = PIANO_PRESETS.find(p => p.id === activeId);
  const badge = document.getElementById('pianoBadge');
  const sub = document.getElementById('pianoSub');

  document.querySelectorAll('.piano-opt').forEach(btn => {
    btn.classList.remove('active', 'loading-opt');
    btn.disabled = loading;
    if (btn.dataset.piano === activeId) {
      btn.classList.add(loading ? 'loading-opt' : 'active');
    }
  });

  if (preset) {
    badge.textContent = loading ? '⏳ LOADING...' : preset.emoji + ' ' + preset.name;
    badge.className = loading ? 'piano-badge loading' : 'piano-badge';
    sub.textContent = loading ? 'PLEASE WAIT' : preset.desc;
  }
}

async function preloadAudio() {
  setLoadProgress(60, 'PREPARING ENGINE...');
  await new Promise(r => setTimeout(r, 400));
  setLoadProgress(100, 'READY — CLICK TO START');
}

// ===== PLAY NOTE =====
function playNote(midi, vel) {
  vel = vel !== undefined ? vel : 0.75;
  if (!audioReady || !piano || !audioContextStarted || isLoadingPiano) return;
  const note = Tone.Frequency(midi, 'midi').toNote();
  try { piano.triggerAttack(note, Tone.now(), vel); } catch(e) {}
  if (fxEnabled) spawnParticles(midi);
  pressedKeys.add(midi);
  renderPiano();
  if (isRecording) {
    recPianoEvents.push({ type: 'on', note: midi, vel: Math.round(vel * 127), t: Date.now() - recStart });
  }
}

function stopNote(midi) {
  if (!audioReady || !piano || !audioContextStarted) return;
  const note = Tone.Frequency(midi, 'midi').toNote();
  try { piano.triggerRelease(note, Tone.now() + 0.05); } catch(e) {}
  pressedKeys.delete(midi);
  renderPiano();
  if (isRecording) {
    recPianoEvents.push({ type: 'off', note: midi, vel: 0, t: Date.now() - recStart });
  }
}

// ===== MIDI =====
async function initMIDI() {
  if (!navigator.requestMIDIAccess) {
    document.getElementById('midiBadge').textContent = 'MIDI ✕';
    return;
  }
  try {
    const acc = await navigator.requestMIDIAccess();
    function connect() {
      let found = false;
      acc.inputs.forEach(inp => { inp.onmidimessage = onMIDI; found = true; });
      const el = document.getElementById('midiBadge');
      if (found) { el.textContent = 'MIDI ●'; el.className = 'midi-badge on'; }
      else { el.textContent = 'MIDI ○'; el.className = 'midi-badge'; }
    }
    connect();
    acc.onstatechange = connect;
  } catch(e) {
    document.getElementById('midiBadge').textContent = 'MIDI ✕';
  }
}

function onMIDI(ev) {
  const s = ev.data[0], note = ev.data[1], vel = ev.data[2];
  const cmd = s & 0xf0;
  if (cmd === 0x90 && vel > 0) playNote(note, vel / 127);
  else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) stopNote(note);
}

// ===== PIANO KEYBOARD =====
function buildKeys() {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const blacks = [false,true,false,true,false,false,true,false,true,false,true,false];
  const keys = [];
  for (let o = OCT_START; o <= OCT_END; o++) {
    for (let n = 0; n < 12; n++) {
      keys.push({ midi: (o + 1) * 12 + n, name: names[n] + o, isBlack: blacks[n], ni: n });
    }
  }
  return keys;
}
const pianoKeys = buildKeys();

function renderPiano() {
  const cv = document.getElementById('pianoCanvas');
  const ctx = cv.getContext('2d');
  const whites = pianoKeys.filter(k => !k.isBlack);
  cv.width = whites.length * WKW;
  cv.height = WKH + 8;
  ctx.clearRect(0, 0, cv.width, cv.height);

  whites.forEach(function(k, i) {
    const x = i * WKW;
    const pressed = pressedKeys.has(k.midi);
    const col = NOTE_COLORS[k.ni];
    if (pressed) { ctx.shadowColor = col; ctx.shadowBlur = 28; ctx.fillStyle = col; }
    else { ctx.shadowBlur = 0; ctx.fillStyle = '#dcdcf0'; }
    ctx.fillRect(x + 1, 0, WKW - 2, WKH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a1a30'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, 0, WKW - 2, WKH);
    if (k.name.startsWith('C') && !k.name.includes('#')) {
      ctx.fillStyle = pressed ? '#fff' : '#5050a0';
      ctx.font = '9px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(k.name, x + WKW / 2, WKH - 7);
    }
  });

  let wi = 0, wx = 0;
  pianoKeys.forEach(function(k) {
    if (!k.isBlack) { wx = wi * WKW; wi++; }
    else {
      const bx = wx + WKW - BKW / 2;
      const pressed = pressedKeys.has(k.midi);
      const col = NOTE_COLORS[k.ni];
      if (pressed) { ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col; }
      else { ctx.shadowBlur = 0; ctx.fillStyle = '#080818'; }
      ctx.fillRect(bx, 0, BKW, BKH);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, 0, BKW, BKH);
    }
  });
}

function pianoNoteAt(x, y) {
  let wi = 0, wx = 0;
  for (let i = 0; i < pianoKeys.length; i++) {
    const k = pianoKeys[i];
    if (!k.isBlack) { wx = wi * WKW; wi++; }
    else {
      const bx = wx + WKW - BKW / 2;
      if (x >= bx && x <= bx + BKW && y <= BKH) return k.midi;
    }
  }
  const whites = pianoKeys.filter(k => !k.isBlack);
  for (let i = 0; i < whites.length; i++) {
    if (x >= i * WKW && x <= (i + 1) * WKW) return whites[i].midi;
  }
  return null;
}

// ===== METRONOME =====
function renderMetronome(timestamp) {
  const cv = document.getElementById('metroCanvas');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(8,8,20,0.9)';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 12);
  ctx.fill();
  ctx.strokeStyle = '#181830'; ctx.lineWidth = 1;
  ctx.stroke();

  const pivotX = W / 2, pivotY = 30;
  const rodLen = H * 0.50;
  const maxAngle = Math.PI / 5.5;

  if (isPlaying && timestamp) {
    const dt = timestamp - (metroLastTime || timestamp);
    metroLastTime = timestamp;
    const beatMs = (60 / bpm) * 1000;
    metroPhase += (dt / beatMs) * Math.PI;
  } else if (!isPlaying) {
    metroPhase = 0;
    metroLastTime = 0;
  }

  const angle = Math.sin(metroPhase) * maxAngle;
  const bobX = pivotX + Math.sin(angle) * rodLen;
  const bobY = pivotY + Math.cos(angle) * rodLen;

  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.strokeStyle = '#2a2a50'; ctx.lineWidth = 2.5; ctx.stroke();

  const bobCol = currentBeat === 0 ? '#00ffcc' : '#aa00ff';
  if (isPlaying) {
    ctx.beginPath();
    ctx.arc(bobX, bobY, 22, 0, Math.PI * 2);
    ctx.fillStyle = bobCol + '18';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(bobX, bobY, 13, 0, Math.PI * 2);
  ctx.fillStyle = isPlaying ? bobCol : '#2a2a50';
  if (isPlaying) { ctx.shadowColor = bobCol; ctx.shadowBlur = 24; }
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#505070'; ctx.fill();

  ctx.fillStyle = isPlaying ? '#00ffcc' : '#2a2a50';
  ctx.font = 'bold 42px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (isPlaying) { ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 18; }
  ctx.fillText(isPlaying ? (currentBeat + 1) : '—', W / 2, H * 0.70);
  ctx.shadowBlur = 0;

  const dotsY = H - 26, dotSpacing = 36;
  const startX = W / 2 - (3 * dotSpacing) / 2;
  for (let i = 0; i < 4; i++) {
    const dx = startX + i * dotSpacing;
    const isActive = i === currentBeat && isPlaying;
    const isAccent = i === 0;
    const r = isAccent ? 8 : 6;
    const col = isAccent ? '#00ffcc' : '#aa00ff';
    ctx.beginPath();
    ctx.arc(dx, dotsY, r, 0, Math.PI * 2);
    if (isActive) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 18; }
    else { ctx.fillStyle = col + '30'; ctx.shadowBlur = 0; }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = '#505070';
  ctx.font = '8px Courier New';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(isPlaying ? 'PLAYING' : 'STOPPED', W / 2, H - 8);
}

// ===== TRANSPORT =====
function startPlay() {
  if (isPlaying) return;
  isPlaying = true;
  currentBeat = 0;
  metroPhase = 0;
  metroLastTime = 0;
  const stepMs = (60 / bpm) * 1000;
  playMetroBeat(0);
  seqTimer = setInterval(function() {
    currentBeat = (currentBeat + 1) % 4;
    playMetroBeat(currentBeat);
  }, stepMs);
  const btn = document.getElementById('playBtn');
  btn.textContent = '■ STOP';
  btn.classList.add('playing');
}

function playMetroBeat(beat) {
  if (!audioReady || !audioContextStarted) return;
  try {
    if (beat === 0) metroSynthAccent.triggerAttackRelease('C6', '32n');
    else metroSynthTick.triggerAttackRelease('G5', '32n');
  } catch(e) {}
}

function stopPlay() {
  isPlaying = false;
  clearInterval(seqTimer); seqTimer = null;
  currentBeat = 0;
  metroPhase = 0;
  const btn = document.getElementById('playBtn');
  btn.textContent = '▶ PLAY';
  btn.classList.remove('playing');
}

function startRec() {
  isRecording = true;
  recStart = Date.now();
  recEnd = 0;
  recPianoEvents = [];
  const btn = document.getElementById('recBtn');
  btn.classList.add('recording');
  btn.textContent = '■ STOP';
}

function stopRec() {
  recEnd = Date.now();
  isRecording = false;
  const btn = document.getElementById('recBtn');
  btn.classList.remove('recording');
  btn.textContent = '● REC';
  stopPlay();
  exportMIDI();
}

function updateBPM(val) {
  bpm = Math.max(40, Math.min(300, val));
  document.getElementById('bpmInput').value = bpm;
  if (isPlaying) { stopPlay(); startPlay(); }
}

// ===== MIDI EXPORT =====
function varLen(n) {
  const b = [];
  b.push(n & 0x7f); n >>= 7;
  while (n > 0) { b.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return b;
}

function exportMIDI() {
  const tpb = 480;
  const tempo = Math.round(60000000 / bpm);
  function ms2tick(ms) { return Math.round((ms / 1000) * (bpm / 60) * tpb); }

  const ttrack = [
    0x00, 0xFF, 0x51, 0x03,
    (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF,
    0x00, 0xFF, 0x2F, 0x00
  ];

  const pEvts = [];
  recPianoEvents.forEach(function(ev) {
    pEvts.push({
      tick: ms2tick(ev.t),
      data: ev.type === 'on' ? [0x90, ev.note, ev.vel] : [0x80, ev.note, 0]
    });
  });
  pEvts.sort(function(a, b) { return a.tick - b.tick; });

  const pData = [];
  let lt = 0;
  pEvts.forEach(function(ev) {
    const d = ev.tick - lt;
    lt = ev.tick;
    varLen(d).forEach(function(b) { pData.push(b); });
    ev.data.forEach(function(b) { pData.push(b); });
  });
  pData.push(0x00, 0xFF, 0x2F, 0x00);

  function chunk(type, data) {
    const r = [];
    for (let i = 0; i < 4; i++) r.push(type.charCodeAt(i));
    const l = data.length;
    r.push((l >> 24) & 0xFF, (l >> 16) & 0xFF, (l >> 8) & 0xFF, l & 0xFF);
    data.forEach(function(b) { r.push(b); });
    return r;
  }

  const hdr = [0x00, 0x01, 0x00, 0x02, (tpb >> 8) & 0xFF, tpb & 0xFF];
  const midiData = chunk('MThd', hdr).concat(chunk('MTrk', ttrack)).concat(chunk('MTrk', pData));
  const blob = new Blob([new Uint8Array(midiData)], { type: 'audio/midi' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'voidpiano_session.mid';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

// ===== KNOBS =====
function renderKnob(canvasId, lblId, val, color) {
  const cv = document.getElementById(canvasId);
  const ctx = cv.getContext('2d');
  const cx = 45, cy = 45, r = 32;
  ctx.clearRect(0, 0, 90, 90);

  ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
  ctx.strokeStyle = '#181830'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();

  const endA = 0.75 * Math.PI + val * 1.5 * Math.PI;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0.75 * Math.PI, endA);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(endA) * (r - 12), cy + Math.sin(endA) * (r - 12));
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();

  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.fill(); ctx.shadowBlur = 0;

  document.getElementById(lblId).textContent = Math.round(val * 100) + '%';
}

function renderAllKnobs() {
  renderKnob('sustainCanvas',  'sustainLbl',  sustainVal,  '#00ffcc');
  renderKnob('volumeCanvas',   'volumeLbl',   volumeVal,   '#aa00ff');
  renderKnob('metroVolCanvas', 'metroVolLbl', metroVolVal, '#ffcc22');
  renderKnob('reverbCanvas',   'reverbLbl',   reverbVal,   '#0088ff');
  renderKnob('toneCanvas',     'toneLbl',     toneVal,     '#ff33cc');
  renderKnob('chorusCanvas',   'chorusLbl',   chorusVal,   '#33ff88');
}

let knobDrag = null;

function setupKnob(canvasId, getVal, setVal, onUpdate) {
  const cv = document.getElementById(canvasId);

  cv.addEventListener('mousedown', function(e) {
    e.preventDefault();
    knobDrag = { startY: e.clientY, startVal: getVal(), setter: setVal, updater: onUpdate };
  });

  cv.addEventListener('wheel', function(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    setVal(Math.max(0, Math.min(1, getVal() + delta)));
    onUpdate();
  }, { passive: false });

  cv.addEventListener('dblclick', function(e) {
    e.preventDefault();
    const defaultVal = KNOB_DEFAULTS[canvasId];
    if (defaultVal !== undefined) { setVal(defaultVal); onUpdate(); }
  });
}

// ===== ANIMATIONS =====
const animCv = document.getElementById('animCanvas');
const animCtx = animCv.getContext('2d');

function resizeAnim() {
  animCv.width = window.innerWidth;
  animCv.height = window.innerHeight;
}

function spawnParticles(midi) {
  const ni = midi % 12;
  const col = NOTE_COLORS[ni];
  const pianoEl = document.getElementById('pianoCanvas');
  const rect = pianoEl.getBoundingClientRect();

  let wi = 0;
  for (let i = 0; i < pianoKeys.length; i++) {
    if (pianoKeys[i].midi === midi) break;
    if (!pianoKeys[i].isBlack) wi++;
  }
  const xBase = rect.left + wi * WKW + WKW / 2;
  const yBase = rect.top;

  const count = 12 + Math.floor(Math.random() * 8);
  const shapes = ['circle', 'triangle', 'square', 'diamond', 'hexagon'];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: xBase + (Math.random() - 0.5) * 60,
      y: yBase - Math.random() * 10,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * 7,
      size: 6 + Math.random() * 20,
      col: col,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rot: Math.random() * Math.PI * 2,
      rotS: (Math.random() - 0.5) * 0.12,
      life: 1,
      decay: 0.007 + Math.random() * 0.016,
    });
  }

  particles.push({
    x: xBase, y: yBase, vx: 0, vy: 0,
    size: 0, maxSize: 120, col: col,
    shape: 'ripple', rot: 0, rotS: 0,
    life: 1, decay: 0.022,
  });
}

function drawShape(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.col;
  ctx.shadowColor = p.col;
  ctx.shadowBlur = 20;
  const s = p.size / 2;

  switch (p.shape) {
    case 'circle':
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); break;
    case 'square':
      ctx.fillRect(-s, -s, p.size, p.size); break;
    case 'triangle':
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s);
      ctx.closePath(); ctx.fill(); break;
    case 'diamond':
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, 0);
      ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill(); break;
    case 'hexagon':
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
        else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath(); ctx.fill(); break;
    case 'ripple':
      const rs = p.maxSize * (1 - p.life);
      ctx.beginPath(); ctx.arc(0, 0, rs, 0, Math.PI * 2);
      ctx.strokeStyle = p.col; ctx.lineWidth = 2.5 * p.life;
      ctx.shadowBlur = 18; ctx.stroke(); break;
  }
  ctx.restore();
}

function animLoop(timestamp) {
  animCtx.clearRect(0, 0, animCv.width, animCv.height);
  particles = particles.filter(function(p) { return p.life > 0; });
  particles.forEach(function(p) {
    if (p.shape !== 'ripple') {
      p.x += p.vx; p.y += p.vy; p.vy += 0.06;
      p.rot += p.rotS;
    }
    p.life -= p.decay;
    animCtx.globalAlpha = Math.max(0, p.life);
    drawShape(animCtx, p);
  });
  animCtx.globalAlpha = 1; animCtx.shadowBlur = 0;
  renderMetronome(timestamp);
  requestAnimationFrame(animLoop);
}

// ===== START OVERLAY =====
document.getElementById('startOverlay').addEventListener('click', async function() {
  const overlay = document.getElementById('startOverlay');
  overlay.style.pointerEvents = 'none';
  await initAudioAfterGesture();
  await initMIDI();
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.4s';
  setTimeout(function() { overlay.style.display = 'none'; }, 400);
});

// ===== EVENT LISTENERS =====
document.getElementById('bpmUp').addEventListener('click', function() { updateBPM(bpm + 1); });
document.getElementById('bpmDn').addEventListener('click', function() { updateBPM(bpm - 1); });

document.getElementById('bpmInput').addEventListener('change', function(e) {
  const val = parseInt(e.target.value);
  if (!isNaN(val)) updateBPM(val);
});
document.getElementById('bpmInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.target.blur(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); updateBPM(bpm + 1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); updateBPM(bpm - 1); }
});
document.getElementById('bpmInput').addEventListener('wheel', function(e) {
  e.preventDefault();
  updateBPM(bpm - (e.deltaY > 0 ? 1 : -1));
}, { passive: false });

document.getElementById('playBtn').addEventListener('click', function() {
  if (isPlaying) stopPlay(); else startPlay();
});
document.getElementById('recBtn').addEventListener('click', function() {
  if (isRecording) stopRec(); else startRec();
});

document.getElementById('fxToggle').addEventListener('change', function(e) {
  fxEnabled = e.target.checked;
  if (!fxEnabled) particles = [];
});

document.querySelectorAll('.piano-opt').forEach(function(btn) {
  btn.addEventListener('click', function() { switchPiano(btn.dataset.piano); });
});

setupKnob('sustainCanvas',
  function() { return sustainVal; },
  function(v) { sustainVal = v; applySustain(); },
  function() { renderKnob('sustainCanvas', 'sustainLbl', sustainVal, '#00ffcc'); }
);
setupKnob('volumeCanvas',
  function() { return volumeVal; },
  function(v) { volumeVal = v; applyPianoVolume(); },
  function() { renderKnob('volumeCanvas', 'volumeLbl', volumeVal, '#aa00ff'); }
);
setupKnob('metroVolCanvas',
  function() { return metroVolVal; },
  function(v) { metroVolVal = v; applyMetroVolume(); },
  function() { renderKnob('metroVolCanvas', 'metroVolLbl', metroVolVal, '#ffcc22'); }
);
setupKnob('reverbCanvas',
  function() { return reverbVal; },
  function(v) { reverbVal = v; applyReverb(); },
  function() { renderKnob('reverbCanvas', 'reverbLbl', reverbVal, '#0088ff'); }
);
setupKnob('toneCanvas',
  function() { return toneVal; },
  function(v) { toneVal = v; applyTone(); },
  function() { renderKnob('toneCanvas', 'toneLbl', toneVal, '#ff33cc'); }
);
setupKnob('chorusCanvas',
  function() { return chorusVal; },
  function(v) { chorusVal = v; applyChorus(); },
  function() { renderKnob('chorusCanvas', 'chorusLbl', chorusVal, '#33ff88'); }
);

document.addEventListener('mousemove', function(e) {
  if (!knobDrag) return;
  const dy = knobDrag.startY - e.clientY;
  knobDrag.setter(Math.max(0, Math.min(1, knobDrag.startVal + dy / 100)));
  knobDrag.updater();
});
document.addEventListener('mouseup', function() { knobDrag = null; });

// Piano mouse events
const pianoCv = document.getElementById('pianoCanvas');
let mouseNote = null;

pianoCv.addEventListener('mousedown', function(e) {
  e.preventDefault();
  const r = pianoCv.getBoundingClientRect();
  const n = pianoNoteAt(e.clientX - r.left, e.clientY - r.top);
  if (n !== null) { mouseNote = n; playNote(n, 0.8); }
});
pianoCv.addEventListener('mousemove', function(e) {
  if (mouseNote === null) return;
  const r = pianoCv.getBoundingClientRect();
  const n = pianoNoteAt(e.clientX - r.left, e.clientY - r.top);
  if (n !== null && n !== mouseNote) { stopNote(mouseNote); mouseNote = n; playNote(n, 0.8); }
});
document.addEventListener('mouseup', function() {
  if (mouseNote !== null) { stopNote(mouseNote); mouseNote = null; }
});

pianoCv.addEventListener('touchstart', function(e) {
  e.preventDefault();
  const r = pianoCv.getBoundingClientRect();
  Array.from(e.changedTouches).forEach(function(t) {
    const n = pianoNoteAt(t.clientX - r.left, t.clientY - r.top);
    if (n !== null) playNote(n, 0.8);
  });
}, { passive: false });

pianoCv.addEventListener('touchend', function(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(function(t) {
    const r = pianoCv.getBoundingClientRect();
    const n = pianoNoteAt(t.clientX - r.left, t.clientY - r.top);
    if (n !== null) stopNote(n);
  });
}, { passive: false });

// Keyboard shortcuts
const KB_MAP = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64,
  'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69,
  'u': 70, 'j': 71, 'k': 72
};

document.addEventListener('keydown', function(e) {
  if (e.repeat || e.target.tagName === 'INPUT') return;
  if (KB_MAP[e.key] !== undefined) playNote(KB_MAP[e.key], 0.8);
  if (e.code === 'Space') { e.preventDefault(); if (isPlaying) stopPlay(); else startPlay(); }
});
document.addEventListener('keyup', function(e) {
  if (KB_MAP[e.key] !== undefined) stopNote(KB_MAP[e.key]);
});

window.addEventListener('resize', resizeAnim);

// ===== INIT =====
async function init() {
  resizeAnim();
  renderPiano();
  renderAllKnobs();
  animLoop(0);
  setLoadProgress(10, 'PREPARING ENGINE...');
  await preloadAudio();
  hideLoading();
}

init();
