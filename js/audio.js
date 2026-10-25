// 超时空英雄传说 · 移动重制版 —— 音乐与音效（100% Web Audio 实时合成，无音频文件）
// Original music composed for this remake. Public API: window.AUDIO
//   AUDIO.unlock()            call from any user gesture (iOS Safari / Android Chrome)
//   AUDIO.playMusic(name)     crossfade to a track; same track = no-op; jingles play once then silence
//   AUDIO.stopMusic()
//   AUDIO.sfx(name)           unknown names do nothing
//   AUDIO.setMusicOn(bool) / AUDIO.setSfxOn(bool) / AUDIO.musicOn / AUDIO.sfxOn
// Never throws; without Web Audio everything is a silent no-op.
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : {};
  const ACtor = W.AudioContext || W.webkitAudioContext;

  const XF = 0.8;            // crossfade seconds
  const LOOKAHEAD = 0.3;     // seconds of audio scheduled ahead
  const TICK_MS = 40;        // scheduler wake-up interval (timing comes from AudioContext clock)
  const MUSIC_VOL = 0.26;
  const SFX_VOL = 0.8;
  const MAX_MUSIC_VOICES = 44;
  const MAX_SFX = 10;

  // ===================================================================
  // 乐理工具
  // ===================================================================
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function nn(s) { // 'c#5' 'bb4' 'eb5' -> midi
    const m = /^([a-g])(#|b)?(-?\d)$/.exec(s);
    if (!m) return null;
    return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
    sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], dim: [0, 3, 6], '5': [0, 7],
  };
  function chordOf(name) {
    const m = /^([A-G])(#|b)?(.*)$/.exec(name) || [0, 'C', '', ''];
    const pc = (PC[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    return { pc, iv: QUAL[m[3]] || QUAL[''], name };
  }
  // 旋律记谱：每个记号占 res 个十六分音符；'-' 延长，'.' 休止，'|' 仅作分隔
  function parseLine(str, res, startBar) {
    const toks = str.replace(/\|/g, ' ').trim().split(/\s+/), bars = [];
    let last = null;
    toks.forEach((tok, i) => {
      if (tok === '-') { if (last) last.l += res; return; }
      const m = nn(tok);
      if (m == null) { last = null; return; }
      const step = i * res, b = (startBar || 0) + Math.floor(step / 16);
      (bars[b] = bars[b] || []).push(last = { s: step % 16, l: res, m });
    });
    return bars;
  }

  // ===================================================================
  // 曲目（全部为本作原创）
  // ===================================================================
  // 通道默认混音：vol 音量，pan 声像，rev 混响送量，dly 延迟送量
  const MIX = {
    padL: { vol: 0.42, pan: -0.75, rev: 0.45 }, padR: { vol: 0.42, pan: 0.75, rev: 0.45 },
    choir: { vol: 0.55, rev: 0.6, pan: 0.15 },
    bass: { vol: 0.8, rev: 0.03 },
    kick: { vol: 0.85 }, snare: { vol: 0.5, rev: 0.2, pan: 0.05 }, clap: { vol: 0.35, rev: 0.25 },
    hat: { vol: 0.26, pan: 0.3 }, ohat: { vol: 0.18, pan: -0.3, rev: 0.1 }, shaker: { vol: 0.22, pan: -0.35, rev: 0.1 },
    rim: { vol: 0.3, pan: 0.25, rev: 0.15 }, tom: { vol: 0.55, rev: 0.25 }, taiko: { vol: 0.75, rev: 0.3 },
    crash: { vol: 0.24, pan: -0.25, rev: 0.25 }, gong: { vol: 0.45, rev: 0.6 }, fx: { vol: 0.3, rev: 0.5, dly: 0.3 },
    lead: { vol: 0.4, rev: 0.28, dly: 0.2 }, lead2: { vol: 0.32, pan: 0.2, rev: 0.32, dly: 0.2 },
    brass: { vol: 0.42, rev: 0.35, pan: -0.08 },
    pluck: { vol: 0.34, pan: 0.4, rev: 0.3, dly: 0.12 },
    arpL: { vol: 0.26, pan: -0.6, rev: 0.25, dly: 0.22 }, arpR: { vol: 0.26, pan: 0.6, rev: 0.25, dly: 0.22 },
    bell: { vol: 0.22, pan: -0.45, rev: 0.45, dly: 0.35 },
  };

  const TRACKS = {
    // ---------------- 标题：时空裂缝，神秘而恢弘 ----------------
    title: {
      desc: 'Majestic & mysterious time-rift: gong, FM bells through ping-pong delay, low erhu intro, dizi flute, then brass theme + choir over taiko.',
      key: 'D minor (Aeolian w/ harmonic-minor A)', bpm: 84, bars: 16,
      chords: 'Dm Bb Gm A Dm Bb F C Bb C Dm A Bb C Gm A',
      lines: {
        intro: ['d4 - - - - - e4 f4 | d4 - - - - - - - | g4 - - - f4 - d4 - | c#4 - - - e4 - - -', 2],
        mel: [`. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . |
          a4 - - - d5 - c5 a4 | g4 - - - - - f4 g4 | a4 - c5 - d5 - f5 - | e5 - - - - - - - |
          d5 - - a4 d5 - e5 f5 | g5 - - - e5 - d5 c5 | d5 - - - a4 - c5 d5 | e5 - - - c#5 - - - |
          g5 - - f5 g5 - a5 - | g5 - - - e5 - c5 - | bb4 - - - d5 - g5 - | a5 - - - - - - -`, 2],
      },
      mix: { brass: { vol: 0.4 } },
      bar(S, b) {
        const hi = b >= 8, r = S.root();
        if (b % 8 === 0) S.at(0, (t, I, ch) => I.gong(ch('gong'), t, 0.9, 73.42));
        if (b === 0 || b === 2) S.at(8, (t, I, ch) => I.rift(ch('fx'), t, 0.5, 2.6));
        S.pad(16, hi ? 0.5 : 0.42, { cut: hi ? 2400 : 1200, a: 1.2, r: 1.6 });
        if (hi) S.choir(16, 0.42, { a: 1.0, r: 1.4 });
        S.seq('0.2.1.3.2.4.3.5.', S.tones(62), 'bell', 'bell', b < 4 ? 0.34 : 0.24, { ratio: 3.5, index: 1.6, decay: 1.6 });
        if (b < 4) S.line('intro', 'erhu', 'lead2', 0.5);
        else S.line('mel', hi ? 'brass' : 'flute', hi ? 'brass' : 'lead', hi ? 0.55 : 0.6);
        if (!hi) {
          S.hit('X.........x.....', 'taiko', 'taiko', 0.8, 62);
          S.seq('0---------------', [r], 'bass', 'bass', 0.45, { type: 'sine', cut: 300 });
          if (b === 7) S.at(0, (t, I, ch) => I.riser(ch('fx'), t, 0.6, 16 * S.P.s16));
        } else {
          S.hit('X.....x...x.....', 'taiko', 'taiko', 0.75, 60);
          S.hit('x.....x...x...x.', 'kick', 'kick', 0.7);
          S.hit('........X.......', 'snare', 'snare', 0.8);
          S.hit('..o...o...o...o.', 'hat', 'hat', 0.6);
          S.seq('0.0.0.0.0.0.0.1.', [r, r + 12], 'bass', 'bass', 0.55, { cut: 700 });
          if (b === 8) S.hit('X...............', 'crash', 'crash', 0.9);
          if (b === 15) S.tomFill('........x.x.xxxx', [55, 52, 50, 47, 45, 43]);
        }
      },
    },

    // ---------------- 剧情：温柔的叙事 ----------------
    story: {
      desc: 'Gentle narrative: guzheng-style plucked arpeggios with pitch bends, soft string pad, dizi flute melody, light shaker.',
      key: 'F major (pentatonic melody)', bpm: 76, bars: 12,
      chords: 'F Dm Bb C F Am Bb C Dm Bb Gm Csus4',
      lines: {
        mel: [`c6 - - - a5 - g5 a5 | f5 - - - - - d5 f5 | g5 - - - f5 - d5 c5 | d5 - - - c5 - - - |
          a5 - - - c6 - d6 - | e6 - - - c6 - a5 - | d6 - c6 - a5 - g5 f5 | g5 - - - - - - - |
          a5 - - - f5 - a5 c6 | d6 - - - c6 - a5 g5 | f5 - - - g5 - a5 - | g5 - - - - - . .`, 2],
      },
      mix: { padL: { vol: 0.32 }, padR: { vol: 0.32 } },
      bar(S, b) {
        const r = S.root();
        S.pad(16, 0.4, { cut: 950, a: 1.4, r: 1.8 });
        S.seq('0.1.2.3.4.3.2.1.', S.tones(53), 'pluck', 'pluck', 0.42, { type: 'triangle', bend: 30, oct: 0.3, decay: 1.3 });
        S.seq('0-------2-------', [r, r + 12, r + 7], 'bass', 'bass', 0.42, { type: 'sine', cut: 400 });
        S.line('mel', 'flute', 'lead', b < 4 ? 0.45 : 0.55, null, b < 4 ? -12 : 0);
        if (b >= 4) S.hit('..o...o...o...og', 'shaker', 'shaker', 0.6);
        if (b >= 8) S.hit('o.......o.......', 'taiko', 'taiko', 0.3, 70);
        if (b % 4 === 3) S.play(12, 'bell', 'bell', 84, 4, 0.16, { ratio: 2, index: 0.8, decay: 1.5 });
      },
    },

    // ---------------- 我方回合：英勇、推进 ----------------
    player: {
      desc: 'Heroic & driving: pulse-wave lead theme, punchy 8th-note saw bass, full kit, guzheng counter-line then 16th pulse arps and brass doubling in the B section.',
      key: 'E minor -> G major (ends on B major dominant)', bpm: 132, bars: 16,
      chords: 'Em C G D Em C D D C D Em Em C D G B',
      lines: {
        mel: [`e5 - - b4 e5 - g5 - | a5 - g5 - e5 - - - | d5 - - - g5 - b5 - | a5 - - - - - f#5 a5 |
          b5 - - a5 g5 - e5 - | g5 - - e5 g5 - a5 - | f#5 - - - d5 - e5 f#5 | a5 - - - - - . . |
          g5 - e6 - d6 - b5 - | a5 - - - d6 - a5 - | b5 - - - g5 a5 b5 d6 | e6 - - - - - - - |
          e6 - d6 - c6 - g5 - | f#5 - a5 - d6 - f#6 - | g6 - - - d6 - b5 - | b5 - d#6 - f#6 - d#6 -`, 2],
      },
      bar(S, b) {
        const B = b >= 8, r = S.root();
        S.pad(16, 0.36, { cut: B ? 2600 : 1800, a: 0.08, r: 0.3 });
        S.seq('0.0.0.0.0.0.1.2.', [r, r + 12, r + 7], 'bass', 'bass', 0.7, { cut: 1100 });
        S.hit('X...x...X...x.x.', 'kick', 'kick', 0.9);
        S.hit('....X.......X...', 'snare', 'snare', 0.85);
        S.hit('x.o.x.o.x.o.x.oo', 'hat', 'hat', 0.8);
        if (B) S.hit('..x...x...x...x.', 'ohat', 'ohat', 0.7);
        if (b === 0 || b === 8) S.hit('X...............', 'crash', 'crash', 0.9);
        if (b === 7 || b === 15) S.hit('............xoxX', 'snare', 'snare', 0.7);
        S.line('mel', 'lead', 'lead', 0.5, { type: 'pulse25', vib: 12 });
        if (!B) S.seq('0.2.1.3.0.2.1.3.', S.tones(64), 'pluck', 'pluck', 0.34, { type: 'triangle', bend: 25, decay: 0.45 });
        else {
          S.seq('0123012301230123', S.tones(64), 'pluck', b % 2 ? 'arpR' : 'arpL', 0.3, { type: 'pulse12', decay: 0.16, bright: 6 });
          S.line('mel', 'brass', 'brass', 0.32, null, -12);
        }
      },
    },

    // ---------------- 敌方回合：紧张、阴暗 ----------------
    enemy: {
      desc: 'Tense & dark: menacing 16th ostinato with flat-2 (Phrygian) bass, half-time drums, tremolo strings, low saw lead with minor-second sighs.',
      key: 'C minor / Phrygian colour', bpm: 112, bars: 12,
      chords: 'Cm Cm Db Db Ab Fm G G Cm Db Fm G',
      lines: {
        mel: [`. . c5 - - - eb5 d5 | c5 - - - g4 - - - | . . db5 - - - f5 eb5 | db5 - - - ab4 - - - |
          eb5 - - - c5 - eb5 f5 | ab5 - - - g5 - f5 - | g5 - - - - - f5 - | b4 - - - d5 - f5 - |
          c6 - - - g5 - eb5 - | f5 - - - db5 - - - | c5 - - - eb5 - f5 ab5 | g5 - - - - - . .`, 2],
      },
      mix: { padL: { vol: 0.36 }, padR: { vol: 0.36 }, lead: { vol: 0.42, dly: 0.28 } },
      bar(S, b) {
        const r = S.root();
        S.pad(16, 0.36, { cut: 850, a: 0.6, r: 0.8 });
        S.seq('0.00.00.0.00.3.2', [r, r + 12, r + 1, r + 7], 'bass', 'bass', 0.62, { cut: 650, q: 7 });
        S.seq('0000000000000000', [r + 31], 'pluck', 'arpR', 0.1, { type: 'sawtooth', decay: 0.11, bright: 3 });
        S.hit('X.....x...x.....', 'kick', 'kick', 0.9);
        S.hit('........X.......', 'snare', 'snare', 0.9);
        S.hit('gogogogogogogogo', 'hat', 'hat', 0.55);
        S.hit('x..x..x...x..x..', 'rim', 'rim', 0.5);
        if (b % 4 === 0) S.hit('X...............', 'taiko', 'taiko', 0.8, 55);
        S.line('mel', 'lead', 'lead', 0.5, { type: 'sawtooth', bright: 3.2, vib: 10, rel: 0.2 });
        if (b === 11) S.at(0, (t, I, ch) => I.riser(ch('fx'), t, 0.45, 16 * S.P.s16));
      },
    },

    // ---------------- 首领战：激烈、快速 ----------------
    boss: {
      desc: 'Intense boss battle: 160 bpm, pumping 16th octave bass, unison saw lead, pulse arps, pentatonic 16th runs, taiko accents.',
      key: 'B minor', bpm: 160, bars: 16,
      chords: 'Bm G A F# Bm G Em F# G A Bm Bm G A F# F#',
      lines: {
        mel: [`f#5 - - f#5 - - e5 f#5 | g5 - - f#5 - - d5 - | e5 - - c#5 - - e5 a5 | f#5 - - - a#4 - c#5 - |
          d5 - - d5 - - c#5 d5 | b4 - - - d5 - g5 - | e5 - f#5 - g5 - b5 - | a#5 - - - c#6 - - - |
          b5 - - - a5 - f#5 - | e5 - - - a5 - c#6 - | d6 - - c#6 b5 - f#5 - | b5 - - - . . . . |
          d6 - - b5 - - g5 - | e6 - - c#6 - - a5 - | f#6 - - - e6 - c#6 - | a#5 - - - c#6 - . .`, 2],
        run11: ['. . . . . . . . b5 d6 e6 f#6 a6 f#6 e6 d6', 1, 11],
        run15: ['. . . . . . . . . . . . f#6 e6 c#6 a#5', 1, 15],
      },
      mix: { lead: { vol: 0.36, dly: 0.16 }, padL: { vol: 0.3 }, padR: { vol: 0.3 } },
      bar(S, b) {
        const r = S.root(), B = b >= 8;
        S.pad(16, 0.36, { cut: 2200, a: 0.05, r: 0.2 });
        S.seq('0010001000100110', [r, r + 12], 'bass', 'bass', 0.62, { cut: 1500, q: 5 });
        S.hit('X...X..xX...X...', 'kick', 'kick', 0.95);
        S.hit('....X.......X...', 'snare', 'snare', 0.9);
        S.hit('xoxoxoxoxoxoxoxo', 'hat', 'hat', 0.75);
        if (B) S.hit('..x...x...x...x.', 'ohat', 'ohat', 0.7);
        if (b % 4 === 0) S.hit('X...............', 'crash', 'crash', 0.85);
        if (B) S.hit('X.......X.......', 'taiko', 'taiko', 0.6, 58);
        if (b % 8 === 7) S.tomFill('............xxxx', [52, 50, 47, 43]);
        S.seq('0123432101234321', S.tones(66), 'pluck', b % 2 ? 'arpR' : 'arpL', 0.26, { type: 'pulse12', decay: 0.12, bright: 5 });
        S.line('mel', 'lead', 'lead', 0.5, { type: 'sawtooth', uni: 12, bright: 5, vib: 15 });
        S.line('run11', 'lead', 'lead2', 0.4, { type: 'pulse25', vib: 0, rel: 0.04 });
        S.line('run15', 'lead', 'lead2', 0.4, { type: 'pulse25', vib: 0, rel: 0.04 });
      },
    },

    // ---------------- 营地：平静、温暖、城镇 ----------------
    camp: {
      desc: 'Calm, warm town/camp: marimba-like FM arps, warm pad, soft walking bass, rim & shaker; dizi melody then guzheng variation.',
      key: 'G major (pentatonic melody)', bpm: 96, bars: 16,
      chords: 'G Em C D G Bm C D Em C G D C D G G',
      lines: {
        mel: [`d5 - g5 - b5 - a5 g5 | e5 - - - - - d5 e5 | g5 - e5 - d5 - e5 - | a4 - - - - - . . |
          b4 - d5 - g5 - a5 b5 | d6 - b5 - a5 - f#5 - | g5 - e5 - g5 - a5 - | a5 - - - - - . . |
          b5 - - a5 g5 - e5 - | g5 - - e5 d5 - - - | d5 - g5 - a5 - b5 - | a5 - - - f#5 - - - |
          e5 - g5 - c6 - b5 - | a5 - - - d5 - e5 f#5 | g5 - - - - - - - | . . . . . . . .`, 2],
      },
      mix: { padL: { vol: 0.3 }, padR: { vol: 0.3 } },
      bar(S, b) {
        const r = S.root();
        S.pad(16, 0.36, { cut: 1300, a: 0.8, r: 1.2 });
        S.seq('0.2.1.2.0.2.1.2.', S.tones(55), 'mallet', b % 2 ? 'arpR' : 'arpL', 0.42);
        S.seq('0-----2-0---2-1-', [r, r + 12, r + 7], 'bass', 'bass', 0.48, { type: 'triangle', cut: 600 });
        S.hit('x.......x.......', 'kick', 'kick', 0.5);
        S.hit('....o.......o...', 'rim', 'rim', 0.8);
        S.hit('..o...o...o...o.', 'shaker', 'shaker', 0.7);
        if (b < 8) S.line('mel', 'flute', 'lead', 0.55);
        else S.line('mel', 'pluck', 'lead', 0.5, { type: 'triangle', bend: 35, oct: 0.35, decay: 1.1 });
        if (b === 15) S.play(8, 'bell', 'bell', 91, 8, 0.14, { ratio: 2, index: 0.8, decay: 1.8 });
      },
    },

    // ---------------- 终章：对决黑魔神 ----------------
    final: {
      desc: 'Final battle vs the Dark Demon God: gong & taiko, choir, 16th string ostinato, brass theme rising through three sections to a double-time climax.',
      key: 'C minor (harmonic minor, Db Neapolitan)', bpm: 144, bars: 24,
      chords: 'Cm Ab Fm G Cm Ab Bb G Ab Bb Cm Eb Ab Bb G G Fm Bb Eb Ab Fm Db G G',
      lines: {
        mel: [`c5 - - - g4 - c5 eb5 | f5 - - - eb5 - c5 - | ab5 - - - g5 - f5 - | g5 - - - - - b4 d5 |
          eb5 - - - c5 - eb5 g5 | ab5 - - - g5 - eb5 - | f5 - - - d5 - f5 bb5 | b5 - - - - - . . |
          c6 - - - bb5 - ab5 - | bb5 - - - f5 - d5 f5 | g5 - - - - - eb5 g5 | bb5 - - - - - c6 d6 |
          eb6 - - - c6 - ab5 - | d6 - - - bb5 - f5 - | g5 - - - b5 - d6 - | f6 - - - - - - - |
          ab5 - - - c6 - f6 - | bb5 - - - d6 - f6 - | g6 - - - - - f6 eb6 | c6 - - - - - eb6 - |
          f6 - - - eb6 - c6 - | db6 - - - ab5 - f5 - | g5 - - - b5 - d6 - | b5 - - - - - . .`, 2],
      },
      mix: { brass: { vol: 0.4 }, choir: { vol: 0.5 } },
      bar(S, b) {
        const r = S.root(), sec = b < 8 ? 0 : b < 16 ? 1 : 2;
        if (b === 0 || b === 16) S.at(0, (t, I, ch) => I.gong(ch('gong'), t, 0.9, 65.41));
        S.pad(16, 0.36, { cut: sec === 2 ? 2800 : 1800, a: 0.2, r: 0.4 });
        if (sec >= 1) S.choir(16, 0.42, { a: 0.5 });
        S.seq('0101210101210121', [r + 12, r + 24, r + 19], 'pluck', 'arpL', 0.3, { type: 'sawtooth', decay: 0.15, bright: 4 });
        S.seq('0.0.0.0.0.0.0.1.', [r, r + 12], 'bass', 'bass', 0.62, { cut: 900 });
        S.hit('X.....x.X.......', 'taiko', 'taiko', 0.8, 58);
        S.hit(sec === 2 ? 'x.x.x.x.x.x.x.x.' : 'x.....x.x.....x.', 'kick', 'kick', 0.85);
        if (sec >= 1) S.hit('....X.......X...', 'snare', 'snare', 0.85);
        S.hit(sec >= 1 ? 'xoxoxoxoxoxoxoxo' : '..x...x...x...x.', 'hat', 'hat', 0.7);
        if (b === 0 || b === 8 || (sec === 2 && b % 2 === 0)) S.hit('X...............', 'crash', 'crash', 0.85);
        if (b === 7 || b === 15 || b === 23) S.tomFill('........xxxxxxxx', [55, 53, 50, 48, 46, 43, 41, 38]);
        S.line('mel', 'brass', 'brass', 0.55);
        if (sec === 2) S.line('mel', 'lead', 'lead', 0.22, { type: 'pulse25', vib: 10 });
        if (b === 23) S.at(0, (t, I, ch) => I.riser(ch('fx'), t, 0.5, 16 * S.P.s16));
      },
    },

    // ---------------- 结局：苦乐参半 ----------------
    ending: {
      desc: 'Bittersweet ending: erhu-like bowed lead with slides & vibrato, electric-piano arpeggios, celesta doubling, warm pad, heartbeat taiko.',
      key: 'Eb major / C minor', bpm: 68, bars: 12,
      chords: 'Eb Bb Cm Ab Eb Bb Ab Bb Cm Gm Ab Bbsus4',
      lines: {
        mel: [`g5 - - - bb5 - c6 - | bb5 - - - - - f5 g5 | c6 - - - bb5 - g5 - | f5 - - - - - eb5 f5 |
          g5 - bb5 - eb6 - - - | d6 - - - c6 - bb5 - | c6 - - - ab5 - f5 - | g5 - - - f5 - - - |
          eb5 - - - g5 - c6 - | bb5 - - - - - g5 bb5 | ab5 - - - c6 - eb6 - | f6 - - - - - eb6 - `, 2],
      },
      mix: { padL: { vol: 0.34 }, padR: { vol: 0.34 }, lead: { vol: 0.42, rev: 0.4 } },
      bar(S, b) {
        const r = S.root();
        S.pad(16, 0.4, { cut: 1100, a: 1.5, r: 2 });
        S.seq('0.1.2.1.3.1.2.1.', S.tones(51), 'keys', b % 2 ? 'arpR' : 'arpL', 0.34);
        S.seq('0---------------', [r], 'bass', 'bass', 0.42, { type: 'sine', cut: 300 });
        S.line('mel', 'erhu', 'lead', 0.55, null, -12);
        if (b >= 4) S.line('mel', 'bell', 'lead2', 0.12, { ratio: 2, index: 0.7, decay: 1.6 });
        if (b >= 8) S.hit('o.......o.......', 'taiko', 'taiko', 0.3, 62);
      },
    },

    // ---------------- 一次性乐句 ----------------
    victory: {
      once: true, tail: 1.6,
      desc: 'Victory fanfare (~4 s): rising pentatonic brass call over C-F-G-C stabs, snare roll, crash & bell sparkle.',
      key: 'C major', bpm: 150, bars: 2, chords: 'C',
      lines: { mel: ['g4 - c5 d5 e5 - g5 - a5 - - c6 - - b5 d6 | c6 - - - - - - - - - - - - - - -', 1] },
      bar(S, b) {
        S.line('mel', 'brass', 'brass', 0.62);
        S.line('mel', 'lead', 'lead', 0.24, { type: 'pulse25', vib: 8 });
        if (b === 0) {
          S.stab(0, 'brass', 'brass', [60, 64, 67], 6, 0.3);
          S.stab(8, 'brass', 'brass', [60, 65, 69], 3, 0.3);
          S.stab(12, 'brass', 'brass', [62, 67, 71], 4, 0.3);
          S.seq('0.......1...2...', [36, 41, 43], 'bass', 'bass', 0.6, { cut: 900 });
          S.hit('X.......x...x...', 'taiko', 'taiko', 0.8, 60);
          S.hit('............xxxX', 'snare', 'snare', 0.7);
        } else {
          S.stab(0, 'brass', 'brass', [60, 64, 67, 72], 14, 0.3);
          S.pad(16, 0.4, { a: 0.05, r: 1.2, cut: 3000 });
          S.seq('0---------------', [36], 'bass', 'bass', 0.6, { cut: 900 });
          S.hit('X...............', 'taiko', 'taiko', 0.9, 55);
          S.hit('X...............', 'crash', 'crash', 1);
          [84, 88, 91, 96].forEach((m, i) => S.play(i, 'bell', 'bell', m, 8, 0.2, { ratio: 2, index: 0.8, decay: 1.8 }));
        }
      },
    },
    defeat: {
      once: true, tail: 1.6,
      desc: 'Defeat (~4 s): falling erhu line over Am-F-E-Am, low drone, distant taiko and a soft gong.',
      key: 'A minor', bpm: 120, bars: 2, chords: 'Am',
      lines: { mel: ['e5 - - d5 - - c5 - | b4 - - a4 - - - -', 2] },
      bar(S, b) {
        S.line('mel', 'erhu', 'lead', 0.55, null, -12);
        if (b === 0) {
          S.stab(0, 'pad', 'padL', [57, 60, 64], 8, 0.45, { a: 0.1, r: 0.6, cut: 1000 });
          S.stab(8, 'pad', 'padR', [53, 57, 60], 8, 0.45, { a: 0.2, r: 0.6, cut: 1000 });
          S.seq('0-------1-------', [33, 29], 'bass', 'bass', 0.5, { type: 'sine', cut: 300 });
          S.hit('X...............', 'taiko', 'taiko', 0.8, 50);
        } else {
          S.stab(0, 'pad', 'padL', [52, 56, 59], 6, 0.45, { a: 0.1, r: 0.6, cut: 1000 });
          S.stab(6, 'pad', 'padR', [45, 52, 57, 60], 10, 0.45, { a: 0.3, r: 1.2, cut: 800 });
          S.seq('0-----1---------', [28, 33], 'bass', 'bass', 0.5, { type: 'sine', cut: 300 });
          S.at(6, (t, I, ch) => I.gong(ch('gong'), t, 0.45, 55));
        }
      },
    },
    levelup: {
      once: true, tail: 0.9,
      desc: 'Level-up (~1.5 s): fast pulse arpeggio into a bright bell/brass C major chord with sparkle.',
      key: 'C major', bpm: 150, bars: 1, chords: 'C',
      lines: { mel: ['c5 e5 g5 c6 e6 g6 . . . . . . . . . .', 1] },
      bar(S) {
        S.line('mel', 'lead', 'lead', 1, { type: 'pulse25', vib: 0, rel: 0.05 });
        S.stab(6, 'brass', 'brass', [60, 64, 67, 72], 8, 0.75);
        [84, 88, 91, 96].forEach(m => S.play(6, 'bell', 'bell', m, 8, 0.42, { ratio: 2, index: 0.8, decay: 1.2 }));
        S.hit('......X.........', 'crash', 'crash', 0.6);
        S.hit('......X.........', 'taiko', 'taiko', 0.6, 65);
      },
    },
  };
  for (const k in TRACKS) {
    const d = TRACKS[k];
    d.C = d.chords.trim().split(/\s+/).map(chordOf);
    d.L = {};
    for (const n in d.lines || {}) d.L[n] = parseLine(d.lines[n][0], d.lines[n][1], d.lines[n][2]);
    d.seconds = d.bars * 240 / d.bpm;
  }

  // ===================================================================
  // 引擎（可挂在实时 AudioContext 或 OfflineAudioContext 上）
  // ===================================================================
  function makeEngine(ctx, dbg) {
    const SR = ctx.sampleRate;
    const G = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q, t, gain) => {
      const b = ctx.createBiquadFilter(); b.type = type;
      // k-rate：滤波系数每 128 帧更新一次而非逐样本，CPU 开销约降至 1/3
      try { b.frequency.automationRate = 'k-rate'; b.Q.automationRate = 'k-rate'; b.gain.automationRate = 'k-rate'; } catch (e) { }
      b.frequency.setValueAtTime(f, t);
      if (q != null) b.Q.setValueAtTime(q, t);
      if (gain != null) b.gain.setValueAtTime(gain, t);
      return b;
    };
    const waves = {};
    function pulseWave(duty) {
      if (waves[duty]) return waves[duty];
      const N = 48, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      return (waves[duty] = ctx.createPeriodicWave(re, im));
    }
    function osc(type, f, t) {
      const o = ctx.createOscillator();
      if (type === 'pulse25') o.setPeriodicWave(pulseWave(0.25));
      else if (type === 'pulse12') o.setPeriodicWave(pulseWave(0.125));
      else o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      return o;
    }
    // 共享白噪声（1 秒，循环播放，随机起点）
    const noiseBuf = ctx.createBuffer(1, SR, SR);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    function noise(t, end) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      s.start(t, Math.random() * 0.9); s.stop(end); return s;
    }
    function perc(g, t, a, peak, dec) {
      const p = g.gain; p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(Math.max(peak, 1e-4), t + a);
      p.exponentialRampToValueAtTime(1e-4, t + a + dec);
      return t + a + dec;
    }
    function adsr(g, t, a, d, s, hold, r, peak) {
      const p = g.gain, ta = t + a, rs = t + Math.max(hold, a);
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(Math.max(peak, 1e-4), ta);
      if (s < 1 && rs > ta + 0.01) p.setTargetAtTime(peak * s, ta, d / 3);
      p.setTargetAtTime(0, rs, r / 5);
      return rs + r;
    }
    function vibrato(oscs, t, end, depth, rate, delay) {
      const l = osc('sine', rate, t), g = G(0);
      g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(depth, t + delay + 0.3);
      l.connect(g); oscs.forEach(x => g.connect(x.detune)); l.start(t); l.stop(end);
    }
    function mkLim(max) {
      let ends = [];
      return (t, end) => {
        if (ends.length >= max) ends = ends.filter(e => e > t);
        if (ends.length >= max) return false;
        ends.push(end); return true;
      };
    }
    const musicLim = mkLim(MAX_MUSIC_VOICES), sfxLim = mkLim(MAX_SFX), noLim = () => true;
    let lim = musicLim;

    // ---------- 总线：master → 压缩 → 软限幅 → 输出 ----------
    const master = G(0.62);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    const clip = ctx.createWaveShaper();
    { // 0.7 以下线性，其上软膝至 ~0.92：输出峰值不可能 ≥ 1
      const n = 2049, c = new Float32Array(n), T = 0.7, R = 0.28;
      for (let i = 0; i < n; i++) {
        const x = i / (n - 1) * 2 - 1, ax = Math.abs(x);
        c[i] = Math.sign(x) * (ax <= T ? ax : T + R * Math.tanh((ax - T) / R));
      }
      clip.curve = c;
    }
    master.connect(comp); comp.connect(clip); clip.connect(ctx.destination);

    // 混响：合成噪声衰减脉冲（2.0 s，立体声，尾音逐渐变暗）
    const rvIn = G(1), rvHP = F('highpass', 220, 0.7, 0), conv = ctx.createConvolver(), rvOut = G(0.55);
    {
      const len = Math.floor(SR * 2.0), ir = ctx.createBuffer(2, len, SR);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch); let lp = 0;
        for (let i = 0; i < len; i++) {
          const x = i / len, env = Math.pow(1 - x, 2.6) * Math.min(1, i / (SR * 0.006));
          const a = 0.85 - 0.7 * x; lp += a * ((Math.random() * 2 - 1) - lp);
          d[i] = lp * env;
        }
        for (let k = 0; k < 6; k++) { // 早期反射
          const p = Math.floor(SR * (0.008 + Math.random() * 0.05));
          d[p] += (Math.random() < 0.5 ? -1 : 1) * (0.6 - k * 0.07);
        }
      }
      conv.buffer = ir;
    }
    rvIn.connect(rvHP); rvHP.connect(conv); conv.connect(rvOut); rvOut.connect(master);

    // 乒乓反馈延迟
    const dlIn = G(1), dL = ctx.createDelay(2), dR = ctx.createDelay(2), fb1 = G(0.36), fb2 = G(0.36);
    const dLP = F('lowpass', 2800, 0.5, 0), merge = ctx.createChannelMerger(2), dlOut = G(0.42), dl2rv = G(0.2);
    dL.delayTime.value = dR.delayTime.value = 0.36;
    dlIn.connect(dL); dL.connect(merge, 0, 0); dL.connect(fb1); fb1.connect(dLP); dLP.connect(dR);
    dR.connect(merge, 0, 1); dR.connect(fb2); fb2.connect(dL);
    merge.connect(dlOut); dlOut.connect(master); dlOut.connect(dl2rv); dl2rv.connect(rvIn);

    function bus(v) {
      const b = { dry: G(v), rev: G(v), dly: G(v) };
      b.dry.connect(master); b.rev.connect(rvIn); b.dly.connect(dlIn);
      return b;
    }
    const MB = bus(MUSIC_VOL), SB = bus(SFX_VOL);
    const canPan = typeof ctx.createStereoPanner === 'function';
    function chan(bs, o) {
      const g = G(o.vol == null ? 1 : o.vol); let p = g;
      if (o.pan && canPan) { p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); g.pn = p; }
      p.connect(bs.dry);
      if (o.rev) { const r = G(o.rev); p.connect(r); r.connect(bs.rev); }
      if (o.dly) { const d = G(o.dly); p.connect(d); d.connect(bs.dly); }
      return g;
    }

    // ---------- 乐器 ----------
    const I = {};
    // 拨弦（古筝 / 合成拨弦 / 方波琶音）
    I.pluck = (out, t, m, dur, vel, o) => {
      const f = mtof(m), dec = o.decay || Math.min(2.2, Math.max(0.3, dur * 1.5)), end = t + dec + 0.03;
      if (!lim(t, end)) return;
      const a = osc(o.type || 'triangle', f, t), fl = F('lowpass', Math.min(15000, f * (o.bright || 10)), o.q || 0.8, t), g = G(0);
      fl.frequency.exponentialRampToValueAtTime(Math.max(150, f * 1.5), t + dec * 0.7);
      if (o.bend) { a.detune.setValueAtTime(o.bend, t); a.detune.linearRampToValueAtTime(0, t + 0.06); }
      a.connect(fl);
      if (o.oct) { const b = osc('sine', f * 2, t), bg = G(o.oct); b.connect(bg); bg.connect(fl); b.start(t); b.stop(end); }
      fl.connect(g); g.connect(out); perc(g, t, 0.003, vel, dec);
      a.start(t); a.stop(end);
    };
    // 主旋律合成（脉冲波 / 锯齿波，延迟颤音）
    I.lead = (out, t, m, dur, vel, o) => {
      const f = mtof(m), r = o.rel || 0.1, end = t + dur + r + 0.03;
      if (!lim(t, end)) return;
      const g = G(0), fl = F('lowpass', Math.min(9000, f * (o.bright || 6)), 0.7, t), os = [osc(o.type || 'pulse25', f, t)];
      if (o.uni) { const x = osc(o.type || 'sawtooth', f, t); x.detune.setValueAtTime(o.uni, t); os.push(x); os[0].detune.setValueAtTime(-o.uni, t); }
      if (dur > 0.25 && o.vib !== 0) vibrato(os, t, end, o.vib || 14, 5.6, 0.12);
      os.forEach(x => { x.connect(fl); x.start(t); x.stop(end); });
      fl.connect(g); g.connect(out);
      adsr(g, t, 0.008, 0.15, 0.72, dur, r, vel / Math.sqrt(os.length));
    };
    // 笛子：正弦 + 三角 + 气声，上滑音 + 颤音
    I.flute = (out, t, m, dur, vel) => {
      const f = mtof(m), r = 0.14, end = t + dur + r + 0.03;
      if (!lim(t, end)) return;
      const g = G(0), a = osc('sine', f, t), b = osc('triangle', f, t), bg = G(0.35);
      a.connect(g); b.connect(bg); bg.connect(g); g.connect(out);
      [a, b].forEach(x => { x.detune.setValueAtTime(-35, t); x.detune.linearRampToValueAtTime(0, t + 0.07); x.start(t); x.stop(end); });
      if (dur > 0.3) vibrato([a, b], t, end, 16, 5.2, 0.18);
      adsr(g, t, 0.045, 0.25, 0.85, dur, r, vel);
      const n = noise(t, end), nf = F('bandpass', f * 1.6, 1.5, t), ng = G(0);
      n.connect(nf); nf.connect(ng); ng.connect(out);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vel * 0.3, t + 0.03);
      ng.gain.setTargetAtTime(vel * 0.06, t + 0.05, 0.06); ng.gain.setTargetAtTime(0, t + dur, r / 5);
    };
    // 二胡式拉弦：锯齿 + 共鸣峰 + 滑音 + 深颤音
    I.erhu = (out, t, m, dur, vel) => {
      const f = mtof(m), r = 0.2, end = t + dur + r + 0.03;
      if (!lim(t, end)) return;
      const a = osc('sawtooth', f, t), lp = F('lowpass', Math.min(3600, f * 9), 0.5, t), pk = F('peaking', 1150, 1.3, t, 7), g = G(0);
      a.detune.setValueAtTime(-90, t); a.detune.linearRampToValueAtTime(0, t + 0.12);
      if (dur > 0.25) vibrato([a], t, end, 24, 6, 0.12);
      a.connect(lp); lp.connect(pk); pk.connect(g); g.connect(out);
      adsr(g, t, 0.08, 0.3, 0.82, dur, r, vel * 0.6);
      a.start(t); a.stop(end);
    };
    // 贝斯：锯齿 + 正弦次低音，滤波包络
    I.bass = (out, t, m, dur, vel, o) => {
      const f = mtof(m), r = 0.05, end = t + dur + r + 0.03;
      if (!lim(t, end)) return;
      const cut = o.cut || 900, a = osc(o.type || 'sawtooth', f, t), s = osc('sine', f, t), sg = G(0.7);
      const fl = F('lowpass', cut, o.q || 4, t), g = G(0);
      fl.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 120), t + 0.2);
      a.connect(fl); fl.connect(g); s.connect(sg); sg.connect(g); g.connect(out);
      adsr(g, t, 0.004, 0.12, 0.65, dur, r, vel);
      a.start(t); a.stop(end); s.start(t); s.stop(end);
    };
    // 铺底和弦（失谐锯齿 + 低通，左右声道分别调用以获得宽度）
    I.pad = (out, t, ms, dur, vel, o) => {
      const a = o.a || 0.4, r = o.r || 0.6, end = t + Math.max(dur, a) + r + 0.05, cut = o.cut || 1500;
      if (!lim(t, end)) return;
      const fl = F('lowpass', cut * 0.5, 0.6, t), g = G(0);
      fl.frequency.exponentialRampToValueAtTime(cut, t + a + 0.3);
      ms.forEach(m => { const x = osc(o.type || 'sawtooth', mtof(m), t); x.detune.setValueAtTime(o.det || 0, t); x.connect(fl); x.start(t); x.stop(end); });
      fl.connect(g); g.connect(out);
      adsr(g, t, a, 0.5, 1, dur, r, vel / Math.sqrt(ms.length));
    };
    // FM 钟 / 电钢琴 / 木琴
    I.bell = (out, t, m, dur, vel, o) => {
      const f = mtof(m), dec = o.decay || 1.4, end = t + dec + 0.03;
      if (!lim(t, end)) return;
      const c = osc('sine', f, t), mo = osc('sine', f * (o.ratio || 3.5), t), mg = G(0), g = G(0);
      mg.gain.setValueAtTime(f * (o.index || 2), t); mg.gain.exponentialRampToValueAtTime(f * 0.05 + 1, t + dec * 0.5);
      mo.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(out);
      perc(g, t, 0.002, vel, dec);
      c.start(t); c.stop(end); mo.start(t); mo.stop(end);
    };
    I.keys = (out, t, m, dur, vel) => I.bell(out, t, m, dur, vel, { ratio: 1, index: 1.4, decay: Math.max(1.0, dur * 1.6) });
    I.mallet = (out, t, m, dur, vel) => I.bell(out, t, m, dur, vel, { ratio: 4, index: 0.9, decay: 0.55 });
    // 铜管：双锯齿 + 开合滤波
    I.brass = (out, t, m, dur, vel, o) => {
      o = o || {};
      const f = mtof(m), r = o.rel || 0.15, end = t + dur + r + 0.03;
      if (!lim(t, end)) return;
      const a = osc('sawtooth', f, t), b = osc('sawtooth', f, t), fl = F('lowpass', f * 1.2, 1, t), g = G(0);
      a.detune.setValueAtTime(-8, t); b.detune.setValueAtTime(8, t);
      fl.frequency.linearRampToValueAtTime(Math.min(7000, f * (o.bright || 5)), t + 0.06);
      fl.frequency.setTargetAtTime(Math.min(5000, f * 3), t + 0.06, 0.25);
      if (dur > 0.3) vibrato([a, b], t, end, 8, 5, 0.25);
      a.connect(fl); b.connect(fl); fl.connect(g); g.connect(out);
      adsr(g, t, 0.025, 0.25, 0.75, dur, r, vel * 0.6);
      a.start(t); a.stop(end); b.start(t); b.stop(end);
    };
    // 合唱：锯齿 → 三个共振峰（"啊"）
    I.choir = (out, t, ms, dur, vel, o) => {
      const a = o.a || 0.6, r = o.r || 0.8, end = t + Math.max(dur, a) + r + 0.05;
      if (!lim(t, end)) return;
      const sum = G(1), g = G(0), os = [];
      ms.forEach(m => [-10, 10].forEach(d => { const x = osc('sawtooth', mtof(m), t); x.detune.setValueAtTime(d, t); x.connect(sum); os.push(x); }));
      [[700, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]].forEach(([ff, q, gg]) => { const bp = F('bandpass', ff, q, t), fg = G(gg); sum.connect(bp); bp.connect(fg); fg.connect(g); });
      vibrato(os, t, end, 9, 4.8, 0.2);
      os.forEach(x => { x.start(t); x.stop(end); });
      g.connect(out);
      adsr(g, t, a, 0.5, 1, dur, r, vel * 2.4 / Math.sqrt(os.length));
    };
    // ---------- 鼓 ----------
    I.kick = (out, t, vel) => {
      const end = t + 0.45; if (!lim(t, end)) return;
      const o = osc('sine', 155, t), g = G(0);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      o.connect(g); g.connect(out); perc(g, t, 0.002, vel, 0.4); o.start(t); o.stop(end);
      const n = noise(t, t + 0.03), hp = F('highpass', 1500, 0.7, t), ng = G(0);
      n.connect(hp); hp.connect(ng); ng.connect(out); perc(ng, t, 0.001, vel * 0.25, 0.018);
    };
    I.snare = (out, t, vel) => {
      const end = t + 0.3; if (!lim(t, end)) return;
      const n = noise(t, end), hp = F('highpass', 1100, 0.7, t), pk = F('peaking', 3500, 1, t, 4), g = G(0);
      n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(out); perc(g, t, 0.001, vel * 0.8, 0.2);
      const b = osc('triangle', 210, t), bg = G(0);
      b.frequency.exponentialRampToValueAtTime(150, t + 0.06);
      b.connect(bg); bg.connect(out); perc(bg, t, 0.001, vel * 0.55, 0.1); b.start(t); b.stop(t + 0.15);
    };
    I.hat = (out, t, vel) => {
      const end = t + 0.07; if (!lim(t, end)) return;
      const n = noise(t, end), hp = F('highpass', 7500, 0.7, t), g = G(0);
      n.connect(hp); hp.connect(g); g.connect(out); perc(g, t, 0.001, vel * 0.6, 0.045);
    };
    I.ohat = (out, t, vel) => {
      const end = t + 0.35; if (!lim(t, end)) return;
      const n = noise(t, end), hp = F('highpass', 6500, 0.7, t), g = G(0);
      n.connect(hp); hp.connect(g); g.connect(out); perc(g, t, 0.002, vel * 0.5, 0.3);
    };
    I.shaker = (out, t, vel) => {
      const end = t + 0.1; if (!lim(t, end)) return;
      const n = noise(t, end), bp = F('bandpass', 6500, 1.2, t), g = G(0);
      n.connect(bp); bp.connect(g); g.connect(out); perc(g, t, 0.012, vel * 0.6, 0.07);
    };
    I.rim = (out, t, vel) => {
      const end = t + 0.06; if (!lim(t, end)) return;
      const o = osc('triangle', 1750, t), g = G(0); o.connect(g); g.connect(out); perc(g, t, 0.001, vel * 0.5, 0.035);
      o.start(t); o.stop(end);
    };
    I.tom = (out, t, vel, m) => {
      const f = mtof(m || 45), end = t + 0.4; if (!lim(t, end)) return;
      const o = osc('sine', f * 1.6, t), g = G(0);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      o.connect(g); g.connect(out); perc(g, t, 0.002, vel, 0.35); o.start(t); o.stop(end);
      const n = noise(t, t + 0.05), lp = F('lowpass', 2500, 0.7, t), ng = G(0);
      n.connect(lp); lp.connect(ng); ng.connect(out); perc(ng, t, 0.001, vel * 0.25, 0.04);
    };
    I.taiko = (out, t, vel, f) => {
      f = f || 60; const end = t + 0.8; if (!lim(t, end)) return;
      const o = osc('sine', f * 1.7, t), g = G(0), s = osc('sine', f * 2.3, t), sg = G(0);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
      o.connect(g); g.connect(out); perc(g, t, 0.003, vel, 0.7); o.start(t); o.stop(end);
      s.connect(sg); sg.connect(out); perc(sg, t, 0.002, vel * 0.25, 0.12); s.start(t); s.stop(t + 0.2);
      const n = noise(t, t + 0.12), lp = F('lowpass', 700, 0.7, t), ng = G(0);
      n.connect(lp); lp.connect(ng); ng.connect(out); perc(ng, t, 0.002, vel * 0.5, 0.09);
    };
    I.crash = (out, t, vel) => {
      const end = t + 1.7; if (!lim(t, end)) return;
      const n = noise(t, end), hp = F('highpass', 4200, 0.7, t), pk = F('peaking', 7000, 1, t, 5), g = G(0);
      n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(out); perc(g, t, 0.003, vel * 0.55, 1.6);
    };
    I.gong = (out, t, vel, f) => {
      f = f || 73.4; const end = t + 4.2; if (!lim(t, end)) return;
      const g = G(0); g.connect(out); perc(g, t, 0.02, vel * 0.32, 4.1);
      [[1, 1], [1.52, 0.7], [2.03, 0.6], [2.71, 0.45], [3.36, 0.35], [4.2, 0.25], [5.4, 0.15]].forEach(([r, a], i) => {
        const o = osc('sine', f * r * 1.006, t), og = G(0);
        o.frequency.exponentialRampToValueAtTime(f * r, t + 2);
        og.gain.setValueAtTime(a * (i > 2 ? 0.3 : 1), t); og.gain.linearRampToValueAtTime(a, t + 0.25 + i * 0.08);
        o.connect(og); og.connect(g); o.start(t); o.stop(end);
      });
      const n = noise(t, t + 0.25), lp = F('lowpass', 1600, 0.7, t), ng = G(0);
      n.connect(lp); lp.connect(ng); ng.connect(out); perc(ng, t, 0.002, vel * 0.25, 0.2);
    };
    // 反向噪声上扬（转段落）
    I.riser = (out, t, vel, dur) => {
      const end = t + dur + 0.05; if (!lim(t, end)) return;
      const n = noise(t, end), bp = F('bandpass', 300, 2, t), g = G(0);
      bp.frequency.exponentialRampToValueAtTime(5000, t + dur);
      n.connect(bp); bp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.97); g.gain.linearRampToValueAtTime(0, t + dur);
    };
    // 时空裂缝：两条失谐下滑正弦
    I.rift = (out, t, vel, dur) => {
      const end = t + dur + 0.05; if (!lim(t, end)) return;
      const g = G(0); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.12, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      [2093, 2101].forEach(f => { const o = osc('sine', f, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + dur); o.connect(g); o.start(t); o.stop(end); });
    };

    if (dbg && dbg.mute) dbg.mute.forEach(k => { I[k] = () => { }; }); // 调试：静音指定乐器以测量开销

    // ---------- 音序器 ----------
    const players = [];
    let cur = null, dropped = 0;
    const V = { X: 1, x: 0.8, o: 0.55, g: 0.32 };

    function makeS(P) {
      const S = { P, b: 0, t0: 0, c: null };
      S.ch = k => P.chans[k] || (P.chans[k] = chan(P.bus, Object.assign({}, MIX[k] || {}, (P.def.mix || {})[k] || {})));
      S.at = (step, fn) => { P.q.push({ t: S.t0 + step * P.s16, fn: t => fn(t, I, S.ch) }); P.dirty = true; };
      S.play = (step, inst, ck, m, len, vel, o) => { const d = len * P.s16; S.at(step, t => I[inst](S.ch(ck), t, m, d, vel, o || {})); };
      S.stab = (step, inst, ck, ms, len, vel, o) => {
        const d = len * P.s16;
        if (inst === 'pad' || inst === 'choir') S.at(step, t => I[inst](S.ch(ck), t, ms, d, vel, o || {}));
        else ms.forEach(m => S.at(step, t => I[inst](S.ch(ck), t, m, d, vel, o || {})));
      };
      S.hit = (pat, drum, ck, vel, arg) => {
        const k = 16 / pat.length;
        for (let i = 0; i < pat.length; i++) {
          const v = V[pat[i]]; if (!v) continue;
          const vv = v * (vel == null ? 1 : vel) * (0.94 + Math.random() * 0.12);
          S.at(i * k, t => I[drum](S.ch(ck), t, vv, arg));
        }
      };
      S.tomFill = (pat, notes) => {
        let j = 0;
        for (let i = 0; i < 16; i++) {
          const v = V[pat[i]]; if (!v) continue;
          const m = notes[Math.min(j++, notes.length - 1)];
          S.at(i, t => I.tom(S.ch('tom'), t, v * 0.9, m));
        }
      };
      S.seq = (pat, notes, inst, ck, vel, o) => {
        const k = 16 / pat.length;
        for (let i = 0; i < pat.length; i++) {
          const c = pat.charCodeAt(i) - 48; if (c < 0 || c > 9) continue;
          const m = notes[c]; if (m == null) continue;
          let len = 1; while (pat[i + len] === '-') len++;
          const acc = (i * k) % 4 === 0 ? 1 : 0.82, d = len * k * P.s16 * 0.9, v = vel * acc;
          S.at(i * k, t => I[inst](S.ch(ck), t, m, d, v, o || {}));
        }
      };
      S.line = (name, inst, ck, vel, o, tr) => {
        const L = P.def.L[name], evs = L && L[S.b]; if (!evs) return;
        o = o || {};
        for (const e of evs) { const m = e.m + (tr || 0), d = e.l * P.s16 * 0.96; S.at(e.s, t => I[inst](S.ch(ck), t, m, d, vel, o)); }
      };
      S.root = () => { let r = 36 + S.c.pc; if (r > 45) r -= 12; return r; };
      S.voicing = () => { let r = 48 + S.c.pc; if (r > 54) r -= 12; return S.c.iv.map(i => r + 12 + i); };
      S.tones = base => {
        const out = [], c = S.c, o0 = Math.floor(base / 12) * 12 - 12;
        for (let o = o0; out.length < 12 && o < o0 + 60; o += 12) for (const iv of c.iv) { const m = o + c.pc + iv; if (m >= base) out.push(m); }
        return out.sort((a, b) => a - b).slice(0, 8);
      };
      S.pad = (steps, vel, o) => {
        const ms = S.voicing(), d = steps * P.s16; o = o || {};
        const oL = Object.assign({}, o, { det: -7 }), oR = Object.assign({}, o, { det: 7 });
        S.at(0, t => { I.pad(S.ch('padL'), t, ms, d, vel, oL); I.pad(S.ch('padR'), t, ms, d, vel, oR); });
      };
      S.choir = (steps, vel, o) => { const ms = S.voicing(), d = steps * P.s16; S.at(0, t => I.choir(S.ch('choir'), t, ms, d, vel, o || {})); };
      return S;
    }

    function setFaders(P, now, from, to, dur) {
      for (const g of P.fad) {
        const p = g.gain;
        if (from == null) {
          if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
          else { const v = p.value; p.cancelScheduledValues(now); p.setValueAtTime(v, now); }
        } else p.setValueAtTime(from, now);
        p.linearRampToValueAtTime(to, now + Math.max(0.01, dur));
      }
    }
    function newPlayer(name, t0, fadeIn) {
      const def = TRACKS[name], now = ctx.currentTime;
      const P = { name, def, bar: 0, nextBar: t0, q: [], chans: {}, stopAt: Infinity, killAt: Infinity, done: false };
      P.s16 = 15 / def.bpm; P.barDur = P.s16 * 16;
      P.fad = [G(0), G(0), G(0)];
      P.fad[0].connect(MB.dry); P.fad[1].connect(MB.rev); P.fad[2].connect(MB.dly);
      P.bus = { dry: P.fad[0], rev: P.fad[1], dly: P.fad[2] };
      if (fadeIn > 0) setFaders(P, now, 0, 1, fadeIn); else P.fad.forEach(g => g.gain.setValueAtTime(1, now));
      if (def.once) P.endAt = t0 + def.bars * P.barDur + (def.tail || 1.5);
      P.S = makeS(P);
      const dt = Math.min(1, 0.75 * 60 / def.bpm); // 附点八分音符延迟
      dL.delayTime.setTargetAtTime(dt, now, 0.1); dR.delayTime.setTargetAtTime(dt, now, 0.1);
      return P;
    }
    function stopPlayer(P, fade) {
      if (P.stopAt !== Infinity) return;
      const now = ctx.currentTime;
      P.stopAt = now + fade; P.killAt = now + fade + 0.2;
      setFaders(P, now, null, 0, fade);
      if (cur === P) cur = null;
    }
    function genBar(P) {
      const S = P.S;
      S.b = P.bar; S.t0 = P.nextBar; S.c = P.def.C[P.bar % P.def.C.length];
      P.def.bar(S, P.bar);
      P.nextBar += P.barDur; P.bar++;
      if (P.bar >= P.def.bars) { if (P.def.once) P.done = true; else P.bar = 0; }
    }
    function pump(until) {
      const now = ctx.currentTime;
      for (let i = players.length - 1; i >= 0; i--) {
        const P = players[i];
        if (now > P.killAt || (P.done && now > P.endAt)) {
          P.fad.forEach(g => { try { g.disconnect(); } catch (e) { } });
          players.splice(i, 1);
          if (cur === P) cur = null;
          continue;
        }
        while (!P.done && P.nextBar < until + 0.1 && P.nextBar < P.stopAt) genBar(P);
        if (P.dirty) { P.q.sort((a, b) => a.t - b.t); P.dirty = false; }
        let n = 0;
        while (n < P.q.length && P.q[n].t < until) {
          const e = P.q[n++];
          if (e.t >= P.stopAt) continue; // 已淡出
          if (e.t < now - 0.1) { dropped++; continue; } // 严重延迟（主线程卡顿）则丢弃
          try { e.fn(Math.max(e.t, now)); } catch (err) { }
        }
        if (n) P.q.splice(0, n);
      }
    }
    function start(name, opts) {
      opts = opts || {};
      const now = ctx.currentTime, def = TRACKS[name];
      const had = !!cur;
      if (cur) stopPlayer(cur, def.once ? 0.5 : XF);
      const fadeIn = opts.fadeIn != null ? opts.fadeIn : def.once ? 0.02 : had ? XF : 0.05;
      const P = newPlayer(name, opts.at != null ? opts.at : now + 0.06, fadeIn);
      players.push(P); cur = P;
      pump(now + LOOKAHEAD);
      return P;
    }
    function stop(fade) { if (cur) stopPlayer(cur, fade == null ? XF : fade); }

    // ---------- 音效 ----------
    let sg = 1; // 当前音效的整体增益（见 SFX_GAIN）
    function so(o) { o = o || {}; return chan(SB, Object.assign({}, o, { vol: (o.vol == null ? 1 : o.vol) * sg })); }
    function tone(out, t, o) {
      const a = o.a || 0.003, end = t + a + o.dur + 0.03;
      const x = osc(o.type || 'sine', o.f, t), g = G(0);
      if (o.f2) x.frequency.exponentialRampToValueAtTime(o.f2, t + (o.sw || o.dur));
      if (o.det) x.detune.setValueAtTime(o.det, t);
      if (o.vib) vibrato([x], t, end, o.vib, o.vr || 6, 0.02);
      let n = x;
      if (o.lp) { const fl = F('lowpass', o.lp, o.q || 0.7, t); x.connect(fl); n = fl; }
      n.connect(g); g.connect(out); perc(g, t, a, o.vol, o.dur);
      x.start(t); x.stop(end);
    }
    function nz(out, t, o) {
      const a = o.a || 0.002, end = t + a + o.dur + 0.03;
      const s = noise(t, end), fl = F(o.type || 'bandpass', o.f, o.q || 1, t), g = G(0);
      if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + (o.sw || (o.f3 ? o.dur * 0.4 : o.dur)));
      if (o.f3) fl.frequency.exponentialRampToValueAtTime(o.f3, t + a + o.dur);
      s.connect(fl); fl.connect(g); g.connect(out); perc(g, t, a, o.vol, o.dur);
    }
    function panSweep(o, t, from, to, d) { if (o.pn) { o.pn.pan.setValueAtTime(from, t); o.pn.pan.linearRampToValueAtTime(to, t + d); } }
    const rnd = (a, b) => a + Math.random() * (b - a);

    const SFX = {
      select(t) {
        const o = so({ rev: 0.1 });
        tone(o, t, { f: 1175, f2: 1760, sw: 0.03, dur: 0.07, vol: 0.2 });
        tone(o, t + 0.025, { type: 'triangle', f: 2349, dur: 0.06, vol: 0.06 });
      },
      move(t) {
        const o = so({ rev: 0.06 });
        [0, 0.1].forEach((d, i) => {
          nz(o, t + d, { f: 900 - i * 220, q: 1.4, dur: 0.06, vol: 0.32 });
          tone(o, t + d, { type: 'triangle', f: 270 - i * 50, f2: 140, dur: 0.07, vol: 0.22 });
        });
      },
      hit(t) {
        const o = so({ rev: 0.08 });
        tone(o, t, { f: 170, f2: 48, sw: 0.11, dur: 0.22, vol: 0.85 });
        nz(o, t, { f: 2400, f2: 500, q: 0.9, dur: 0.13, vol: 0.8 });
        tone(o, t, { type: 'square', f: 130, f2: 55, dur: 0.08, vol: 0.1, lp: 1000 });
        nz(o, t, { type: 'highpass', f: 3500, dur: 0.025, vol: 0.35 });
      },
      crit(t) {
        const o = so({ rev: 0.22 });
        nz(o, t, { f: 600, f2: 5000, q: 2.5, dur: 0.03, a: 0.07, vol: 0.3 });
        const h = t + 0.08;
        tone(o, h, { f: 210, f2: 36, sw: 0.22, dur: 0.42, vol: 1 });
        nz(o, h, { f: 3200, f2: 350, q: 0.8, dur: 0.28, vol: 0.9 });
        nz(o, h, { type: 'highpass', f: 3000, dur: 0.03, vol: 0.5 });
        tone(o, h, { type: 'sawtooth', f: 95, f2: 38, dur: 0.2, vol: 0.14, lp: 700 });
        [1244, 1867, 2690, 3511].forEach((f, i) => tone(o, h, { f, dur: 0.55 - i * 0.1, vol: 0.06 }));
      },
      miss(t) {
        const o = so({ pan: -0.6, rev: 0.1 });
        panSweep(o, t, -0.6, 0.6, 0.25);
        nz(o, t, { f: 350, f2: 2800, q: 1.6, dur: 0.16, a: 0.06, vol: 0.4 });
        tone(o, t + 0.02, { f: 900, f2: 520, dur: 0.12, vol: 0.05 });
      },
      slash(t) {
        const o = so({ rev: 0.15 });
        nz(o, t, { f: 1200, f2: 7000, q: 1.1, dur: 0.12, a: 0.03, vol: 0.55 });
        nz(o, t + 0.04, { type: 'highpass', f: 5000, dur: 0.08, vol: 0.25 });
        tone(o, t + 0.04, { f: 180, f2: 70, dur: 0.1, vol: 0.35 });
        tone(o, t + 0.05, { f: 2637, dur: 0.3, vol: 0.05 });
        tone(o, t + 0.05, { f: 3951, dur: 0.22, vol: 0.035 });
      },
      arrow(t) {
        const o = so({ rev: 0.12 });
        tone(o, t, { type: 'triangle', f: 540, f2: 400, sw: 0.08, dur: 0.15, vol: 0.25 });
        tone(o, t, { f: 1080, f2: 800, dur: 0.08, vol: 0.08 });
        nz(o, t + 0.03, { f: 3800, f2: 1600, q: 7, dur: 0.2, a: 0.04, vol: 0.4 });
        tone(o, t + 0.27, { f: 220, f2: 80, dur: 0.08, vol: 0.5 });
        nz(o, t + 0.27, { type: 'lowpass', f: 1400, dur: 0.05, vol: 0.45 });
      },
      magic(t) {
        const o = so({ rev: 0.5, dly: 0.25 });
        [84, 86, 88, 91, 93, 96].forEach((m, i) => I.bell(o, t + i * 0.045, m, 0.3, 0.12, { ratio: 2, index: 1, decay: 0.6 }));
        nz(o, t, { f: 1500, f2: 7000, q: 1.5, dur: 0.25, a: 0.25, vol: 0.12 });
        tone(o, t, { type: 'sawtooth', f: 220, f2: 880, sw: 0.4, dur: 0.3, a: 0.15, vol: 0.05, lp: 1800 });
      },
      fire(t) {
        const o = so({ rev: 0.25 });
        nz(o, t, { type: 'lowpass', f: 300, f2: 3500, f3: 500, sw: 0.18, dur: 0.67, a: 0.08, vol: 0.8, q: 1.5 });
        for (let i = 0; i < 9; i++) nz(o, t + 0.05 + Math.random() * 0.55, { type: 'highpass', f: rnd(2500, 5500), dur: 0.012, vol: rnd(0.2, 0.45) });
        tone(o, t, { type: 'sawtooth', f: 75, f2: 45, dur: 0.55, a: 0.05, vol: 0.2, lp: 300 });
      },
      ice(t) {
        const o = so({ rev: 0.45, dly: 0.15 });
        tone(o, t, { type: 'triangle', f: 2400, f2: 900, dur: 0.45, vol: 0.06 });
        nz(o, t, { type: 'highpass', f: 6000, dur: 0.42, a: 0.08, vol: 0.14 });
        const fs = [2637, 3136, 3520, 4186, 4699, 5274];
        for (let i = 0; i < 7; i++) tone(o, t + i * 0.045 + Math.random() * 0.02, { f: fs[Math.floor(Math.random() * fs.length)], dur: 0.3, vol: 0.07 });
        nz(o, t + 0.36, { f: 2800, q: 3, dur: 0.06, vol: 0.45 });
        tone(o, t + 0.36, { f: 1400, f2: 700, dur: 0.08, vol: 0.12 });
      },
      bolt(t) {
        const o = so({ rev: 0.3 });
        const z = osc('sawtooth', 600, t), bp = F('bandpass', 1800, 0.8, t), zg = G(0);
        for (let k = 1; k < 22; k++) z.frequency.setValueAtTime(rnd(80, 1500), t + k * 0.012);
        z.connect(bp); bp.connect(zg); zg.connect(o); perc(zg, t, 0.002, 0.45, 0.3); z.start(t); z.stop(t + 0.35);
        nz(o, t, { type: 'highpass', f: 1800, dur: 0.09, vol: 0.32 });
        nz(o, t + 0.04, { type: 'lowpass', f: 220, f2: 70, dur: 1.0, a: 0.06, vol: 0.75 });
      },
      wind(t) {
        const o1 = so({ pan: -0.7, rev: 0.3 }), o2 = so({ pan: 0.6, rev: 0.3 });
        panSweep(o1, t, -0.7, 0.7, 0.9); panSweep(o2, t, 0.6, -0.5, 0.9);
        nz(o1, t, { f: 400, f2: 1900, f3: 500, sw: 0.45, dur: 0.65, a: 0.3, vol: 0.45, q: 3 });
        nz(o2, t + 0.05, { f: 900, f2: 2800, f3: 800, sw: 0.4, dur: 0.6, a: 0.25, vol: 0.25, q: 6 });
        tone(o1, t + 0.1, { f: 1100, f2: 1500, dur: 0.35, a: 0.25, vol: 0.025, vib: 40 });
      },
      rock(t) {
        const o = so({ rev: 0.2 });
        nz(o, t, { type: 'lowpass', f: 300, f2: 120, dur: 0.68, a: 0.02, vol: 0.85 });
        tone(o, t, { f: 95, f2: 30, sw: 0.3, dur: 0.4, vol: 0.9 });
        tone(o, t + 0.16, { f: 75, f2: 32, dur: 0.3, vol: 0.6 });
        for (let i = 0; i < 7; i++) nz(o, t + 0.04 + Math.random() * 0.35, { f: rnd(700, 2500), q: 2, dur: 0.03, vol: 0.35 });
      },
      dark(t) {
        const o = so({ rev: 0.55 });
        [55, 55.4, 77.8, 116.5].forEach(f => tone(o, t, { type: 'sawtooth', f, f2: f * 0.84, sw: 0.9, dur: 0.4, a: 0.35, vol: 0.11, lp: 700 }));
        tone(o, t, { f: 440, f2: 110, dur: 0.7, a: 0.1, vol: 0.08, vib: 50, vr: 7 });
        nz(o, t, { f: 1100, q: 5, dur: 0.4, a: 0.4, vol: 0.18 });
        tone(o, t + 0.75, { f: 70, f2: 35, dur: 0.3, vol: 0.5 });
      },
      holy(t) {
        const o = so({ rev: 0.7, dly: 0.15 });
        I.pad(o, t, [69, 73, 76, 81, 85], 0.6, 0.35, { type: 'triangle', a: 0.12, r: 0.6, cut: 5000 });
        [88, 93, 97, 100].forEach((m, i) => I.bell(o, t + 0.12 + i * 0.07, m, 0.3, 0.08, { ratio: 2, index: 0.6, decay: 0.9 }));
        nz(o, t, { type: 'highpass', f: 5000, dur: 0.5, a: 0.4, vol: 0.08 });
      },
      heal(t) {
        const o = so({ rev: 0.5, dly: 0.2 });
        [67, 72, 74, 76, 79, 84].forEach((m, i) => tone(o, t + i * 0.06, { type: 'triangle', f: mtof(m), dur: 0.45, a: 0.01, vol: 0.14 }));
        tone(o, t + 0.15, { f: mtof(96), dur: 0.4, a: 0.2, vol: 0.03, vib: 30, vr: 9 });
        nz(o, t, { f: 3000, f2: 8000, q: 2, dur: 0.35, a: 0.25, vol: 0.06 });
      },
      buff(t) {
        const o = so({ rev: 0.3, dly: 0.15 });
        tone(o, t, { type: 'sawtooth', f: 200, f2: 1200, sw: 0.3, dur: 0.27, a: 0.05, vol: 0.08, lp: 2500 });
        tone(o, t + 0.16, { type: 'pulse25', f: mtof(79), dur: 0.12, vol: 0.1 });
        tone(o, t + 0.26, { type: 'pulse25', f: mtof(86), dur: 0.3, vol: 0.1 });
        tone(o, t + 0.26, { f: mtof(98), dur: 0.3, vol: 0.03 });
      },
      status(t) {
        const o = so({ rev: 0.25 });
        tone(o, t, { f: 620, f2: 220, sw: 0.5, dur: 0.53, a: 0.02, vol: 0.18, vib: 70, vr: 11 });
        tone(o, t, { type: 'square', f: 310, f2: 110, sw: 0.5, dur: 0.5, vol: 0.04, lp: 800 });
        nz(o, t, { f: 500, q: 2, dur: 0.3, a: 0.1, vol: 0.1 });
      },
      summon(t) {
        const o = so({ rev: 0.6 });
        I.gong(o, t, 0.55, 65.4);
        nz(o, t, { f: 300, f2: 4000, sw: 0.55, q: 1.5, dur: 0.06, a: 0.55, vol: 0.25 });
        const h = t + 0.6;
        tone(o, h, { f: 110, f2: 32, sw: 0.4, dur: 0.9, vol: 0.85 });
        nz(o, h, { type: 'lowpass', f: 900, f2: 150, dur: 0.6, vol: 0.5 });
        [72, 79, 84, 88, 91].forEach((m, i) => I.bell(o, h + i * 0.05, m, 0.4, 0.07, { ratio: 3.5, index: 1.5, decay: 1.4 }));
      },
      chest(t) {
        const o = so({ rev: 0.3, dly: 0.12 });
        [76, 79, 84, 88].forEach((m, i) => tone(o, t + i * 0.055, { type: 'pulse25', f: mtof(m), dur: 0.14, vol: 0.1 }));
        tone(o, t + 0.22, { f: mtof(100), dur: 0.5, vol: 0.05 });
        tone(o, t + 0.25, { f: mtof(103), dur: 0.4, vol: 0.03 });
      },
      die(t) {
        const o = so({ rev: 0.3 });
        tone(o, t, { type: 'square', f: 440, f2: 70, sw: 0.55, dur: 0.6, vol: 0.1, lp: 1500 });
        nz(o, t, { type: 'lowpass', f: 1500, f2: 150, dur: 0.45, vol: 0.35 });
        tone(o, t, { f: 130, f2: 40, dur: 0.35, vol: 0.6 });
      },
      turn(t) {
        const o = so({ rev: 0.4 });
        I.brass(o, t, 67, 0.1, 0.4); I.brass(o, t + 0.12, 72, 0.35, 0.45); I.brass(o, t + 0.12, 79, 0.35, 0.28);
        I.taiko(o, t + 0.12, 0.55, 90);
        nz(o, t + 0.12, { type: 'highpass', f: 6000, dur: 0.5, vol: 0.06 });
      },
      levelup(t) {
        const o = so({ rev: 0.35, dly: 0.2 });
        [72, 76, 79, 84, 88, 91].forEach((m, i) => tone(o, t + i * 0.055, { type: 'pulse25', f: mtof(m), dur: 0.12, vol: 0.1 }));
        const h = t + 0.33;
        [84, 88, 91, 96].forEach(m => I.bell(o, h, m, 0.5, 0.07, { ratio: 2, index: 0.8, decay: 0.9 }));
        nz(o, h, { type: 'highpass', f: 6000, dur: 0.6, a: 0.05, vol: 0.07 });
      },
      win(t) {
        const o = so({ rev: 0.4 });
        [[0, 67, 0.1], [0.12, 72, 0.1], [0.24, 76, 0.1], [0.36, 79, 0.55]].forEach(([d, m, l]) => I.brass(o, t + d, m, l, 0.45));
        I.brass(o, t + 0.36, 72, 0.55, 0.28); I.brass(o, t + 0.36, 76, 0.55, 0.28);
        I.taiko(o, t, 0.5, 70); I.taiko(o, t + 0.36, 0.7, 60); I.crash(o, t + 0.36, 0.5);
      },
      lose(t) {
        const o = so({ rev: 0.45 });
        [[0, 64, 0.28], [0.3, 62, 0.28], [0.6, 60, 0.28], [0.9, 59, 0.6]].forEach(([d, m, l]) => I.erhu(o, t + d, m - 12, l, 0.4));
        I.pad(o, t, [45, 52, 57, 60], 1.3, 0.3, { a: 0.2, r: 0.6, cut: 900 });
        I.taiko(o, t, 0.5, 50);
      },
    };
    // 各音效响度校准（以短时响度为准，使其均落在音乐之上）
    const SFX_GAIN = {
      select: 5.8, move: 3.2, hit: 2.1, crit: 1.5, miss: 9, slash: 3.6, arrow: 2.4, magic: 2.9, fire: 2.6, ice: 4, bolt: 4.6,
      wind: 6.3, rock: 1.2, dark: 1.25, holy: 1.2, heal: 3.3, buff: 5.3, status: 3.2, summon: 0.95, chest: 6.7, die: 1.95, turn: 0.85, levelup: 3.1, win: 0.95, lose: 1.2,
    };
    let lastSfx = {};
    function sfx(name, when) {
      const fn = SFX[name]; if (!fn) return;
      const t = when != null ? when : ctx.currentTime + 0.005;
      if (lastSfx[name] != null && Math.abs(t - lastSfx[name]) < 0.035) return; // 同一音效叠加去重
      if (!sfxLim(t, t + 0.6)) return;
      lastSfx[name] = t;
      lim = noLim; sg = SFX_GAIN[name] || 1;
      try { fn(t); } finally { lim = musicLim; sg = 1; }
    }
    function setVol(which, v, fade) {
      const b = which === 'music' ? MB : SB, now = ctx.currentTime;
      [b.dry, b.rev, b.dly].forEach(g => { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(v, now, (fade || 0.1) / 3); });
    }
    return {
      ctx, start, stop, pump, sfx, setVol,
      curName: () => (cur ? cur.name : null),
      state: () => ({ players: players.map(P => ({ name: P.name, bar: P.bar, queued: P.q.length, stopping: P.stopAt !== Infinity })), current: cur ? cur.name : null, dropped }),
    };
  }

  // ===================================================================
  // 公共 API
  // ===================================================================
  let ctx = null, eng = null, desired = null, musicOn = true, sfxOn = true, autoSusp = false;
  const userActive = () => { try { const u = W.navigator && W.navigator.userActivation; return u ? u.isActive : true; } catch (e) { return true; } };
  const hidden = () => { try { return !!(W.document && W.document.hidden); } catch (e) { return false; } };
  function ensure() {
    if (eng) return true;
    if (!ACtor) return false;
    try {
      try { ctx = new ACtor({ latencyHint: 'interactive' }); } catch (e) { ctx = new ACtor(); }
      eng = makeEngine(ctx);
      setInterval(tick, TICK_MS);
      return true;
    } catch (e) { ctx = eng = null; return false; }
  }
  function tick() {
    try { if (eng && ctx.state === 'running') eng.pump(ctx.currentTime + (hidden() ? 1.5 : LOOKAHEAD)); } catch (e) { }
  }
  function resume() {
    try { if (ctx && ctx.state !== 'running' && !(hidden() && autoSusp)) { const p = ctx.resume(); if (p && p.catch) p.catch(() => { }); } } catch (e) { }
  }
  function unlock() {
    try {
      if (!ensure()) return;
      if (ctx.state !== 'running') {
        resume();
        // iOS：在手势中播放一个静音缓冲以真正解锁
        const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      }
      if (desired && musicOn && !eng.curName()) eng.start(desired);
    } catch (e) { }
  }
  function playMusic(name) {
    try {
      const def = TRACKS[name]; if (!def) return;
      desired = def.once ? null : name;
      if (!musicOn) return;
      if (!eng && !(userActive() && ensure())) return; // 尚未解锁：首次手势时自动开始
      if (ctx.state !== 'running') { if (def.once && !userActive()) return; resume(); }
      if (eng.curName() === name) return;
      eng.start(name);
    } catch (e) { }
  }
  function stopMusic() { try { desired = null; if (eng) eng.stop(XF); } catch (e) { } }
  function sfx(name) {
    try {
      if (!sfxOn || typeof name !== 'string') return;
      if (!eng && !(userActive() && ensure())) return;
      if (ctx.state !== 'running') { if (!userActive()) return; resume(); }
      eng.sfx(name);
    } catch (e) { }
  }
  function setMusicOn(v) {
    try {
      musicOn = !!v; if (!eng) return;
      if (!musicOn) eng.stop(0.4);
      else if (desired && !eng.curName()) eng.start(desired);
    } catch (e) { }
  }
  function setSfxOn(v) { sfxOn = !!v; }

  // 任意手势自动解锁（含 iOS 的 touchend）；页面隐藏时暂停以省电
  try {
    const onGesture = () => { if (!ctx || ctx.state !== 'running') unlock(); };
    ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'].forEach(ev => W.addEventListener(ev, onGesture, { capture: true, passive: true }));
    if (W.document) W.document.addEventListener('visibilitychange', () => {
      try {
        if (!ctx) return;
        if (hidden()) { if (ctx.state === 'running') { autoSusp = true; const p = ctx.suspend(); if (p && p.catch) p.catch(() => { }); } }
        else if (autoSusp) { autoSusp = false; resume(); }
      } catch (e) { }
    });
  } catch (e) { }

  const AUDIO = {
    unlock, playMusic, stopMusic, sfx, setMusicOn, setSfxOn,
    get musicOn() { return musicOn; }, set musicOn(v) { setMusicOn(v); },
    get sfxOn() { return sfxOn; }, set sfxOn(v) { setSfxOn(v); },
    get current() { try { return eng ? eng.curName() : null; } catch (e) { return null; } },
    tracks: Object.keys(TRACKS).filter(k => !TRACKS[k].once),
    jingles: Object.keys(TRACKS).filter(k => TRACKS[k].once),
    sfxNames: ['select', 'move', 'hit', 'crit', 'miss', 'slash', 'arrow', 'magic', 'fire', 'ice', 'bolt', 'wind', 'rock', 'dark', 'holy', 'heal', 'buff', 'status', 'summon', 'chest', 'die', 'turn', 'levelup', 'win', 'lose'],
    // 调试：曲目信息与离线渲染（测试用，不影响正常播放）
    _info(name) { const d = TRACKS[name]; return d ? { bpm: d.bpm, bars: d.bars, key: d.key, seconds: d.seconds, once: !!d.once, desc: d.desc } : null; },
    _state() { try { return eng ? Object.assign({ ctx: ctx.state, time: ctx.currentTime }, eng.state()) : { ctx: 'none' }; } catch (e) { return { error: String(e) }; } },
    _render(name, seconds, sampleRate, dbg) {
      const OAC = W.OfflineAudioContext || W.webkitOfflineAudioContext;
      if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
      const sr = sampleRate || 44100, oc = new OAC(2, Math.ceil(seconds * sr), sr), e = makeEngine(oc, dbg);
      const isSfx = /^sfx:/.test(name); if (isSfx) name = name.slice(4);
      if (TRACKS[name] && !isSfx) {
        e.start(name, { at: 0.02, fadeIn: 0 });
        // 与实时调度相同：每 0.25 s 暂停一次，只排程前方 LOOKAHEAD 秒
        if (oc.suspend) for (let t = 0.25; t < seconds; t += 0.25) {
          oc.suspend(t).then(() => { try { e.pump(oc.currentTime + LOOKAHEAD); } catch (err) { } oc.resume(); });
        } else e.pump(seconds);
      } else e.sfx(name, 0.02);
      return oc.startRendering();
    },
  };
  W.AUDIO = AUDIO;
})();
