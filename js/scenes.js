// 超时空英雄传说 · 移动重制版 —— 剧情演出（电影化对白）
// 对白 ['名字', '台词', '立绘 id', '表情（选用）']：
//   · 表情：第 4 个元素或立绘 id 前缀「表情@」（如 '怒@mengqi'）；可用 喜 / 怒 / 惊 / 哀 / 坚定 / 默认（或 joy / anger / surprise / sad / resolve）
//     未指定时依台词的关键字与标点自动判断（！ 怒气或激动、？！ 惊讶、…… 哀伤、哈哈 喜悦……）
//   · 关卡可写 scene: 'castle' 等指定背景，否则依地形与标题、开场旁白自动挑选
// 对外：SCN_dialog(lines) 接手 battle.js 的 dialogPlain；SCN_chapterCard(st) 接手 game.js 的章节标题卡
//       SCN_exprOf(line)、SCN_themeOf(st) 供调试 / 其他功能使用
// 自动对战（AUTO）时一律立即略过；像素画风沿用同一套演出，背景改为点阵化、立绘用像素原图
'use strict';
(function (G) {
  const D = document;
  const now = () => performance.now();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const isAuto = () => typeof AUTO !== 'undefined' && AUTO;
  const isHD = () => typeof artHD !== 'function' || artHD();
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // =====================================================================
  // 表情判断
  // =====================================================================
  const KW = {
    joy: [['哈哈', 4], ['呵呵', 3], ['嘻嘻', 3], ['嘿嘿', 3], ['太好了', 4], ['好耶', 4], ['万岁', 4], ['成功了', 3], ['太棒', 3], ['开心', 3], ['高兴', 3], ['谢谢', 2], ['多谢', 2], ['得救', 2], ['厉害', 2], ['欢迎', 2], ['恭喜', 3], ['好久不见', 2], ['做到了', 3], ['赢了', 3], ['真可爱', 3], ['笑', 1]],
    anger: [['混蛋', 4], ['可恶', 4], ['该死', 4], ['住口', 4], ['闭嘴', 4], ['畜生', 4], ['找死', 4], ['受死', 4], ['滚', 3], ['饶不了', 4], ['绝不饶', 4], ['岂有此理', 4], ['可恨', 3], ['你敢', 3], ['少废话', 4], ['废话', 2], ['休想', 3], ['放肆', 4], ['大胆', 3], ['卑鄙', 4], ['无耻', 4], ['浑蛋', 4], ['报仇', 3], ['宰了', 3], ['杀了', 3], ['敬酒不吃', 4], ['不知好歹', 4], ['狂妄', 3], ['蠢', 2]],
    surprise: [['怎么会', 3], ['不可能', 3], ['竟然', 3], ['居然', 3], ['难道', 2], ['咦', 3], ['糟了', 3], ['怎么回事', 3], ['天哪', 3], ['天啊', 3], ['怎么可能', 4], ['不会吧', 3], ['哇', 2], ['那、那', 2], ['这、这', 3], ['你、你', 3], ['原来', 1], ['怪物', 1]],
    sad: [['对不起', 3], ['抱歉', 2], ['可惜', 1], ['难过', 3], ['伤心', 3], ['牺牲', 3], ['永别', 4], ['保重', 2], ['呜', 3], ['泪', 3], ['哭', 3], ['舍不得', 3], ['怀念', 2], ['孤单', 3], ['寂寞', 3], ['遗憾', 3], ['节哀', 3], ['可怜', 2], ['死去', 3], ['再也', 2], ['唉', 3], ['无能为力', 3], ['原谅', 2], ['失去', 2], ['过意不去', 2], ['我怎么可能会输', 2]],
    resolve: [['一定', 2], ['绝不', 2], ['决不', 2], ['发誓', 3], ['必须', 2], ['交给我', 3], ['放心', 2], ['守护', 3], ['不会输', 3], ['出发', 2], ['前进', 2], ['打倒', 2], ['拼了', 3], ['到底', 2], ['坚持', 2], ['决心', 3], ['上吧', 3], ['走吧', 2], ['我会', 1], ['我要', 1], ['不必', 1], ['讨伐', 2], ['救出', 2], ['阻止', 2], ['誓', 2], ['尽忠', 3], ['问心无愧', 3], ['动手', 2], ['准备', 1], ['迎战', 3]],
  };
  const ORDER = ['surprise', 'anger', 'sad', 'joy', 'resolve'];
  const ALIAS = { 喜: 'joy', 笑: 'joy', 怒: 'anger', 惊: 'surprise', 哀: 'sad', 悲: 'sad', 坚定: 'resolve', 坚: 'resolve', 默认: 'default', default: 'default', neutral: 'default', joy: 'joy', anger: 'anger', surprise: 'surprise', sad: 'sad', resolve: 'resolve' };
  function exprFromText(text) {
    text = String(text || '');
    const sc = { joy: 0, anger: 0, surprise: 0, sad: 0, resolve: 0 };
    for (const k in KW) for (const [w, v] of KW[k]) if (text.includes(w)) sc[k] += v;
    const ex = (text.match(/[！!]/g) || []).length, el = (text.match(/……|\.\.\./g) || []).length;
    if (/[？?][！!]|[！!][？?]/.test(text)) sc.surprise += 4;
    if (/^(什么|什、什么)|(^|[，。！？…])什么[？！?!]/.test(text)) sc.surprise += 4; // 「什么？！」才是惊讶，「为什么」「什么样」不算
    if (ex) {
      if (sc.anger) sc.anger += ex; else if (sc.joy) sc.joy += ex; else if (sc.surprise) sc.surprise += ex; else if (sc.resolve) sc.resolve += ex;
      else if (ex >= 2) sc.resolve += 2; else if (/[！!]$/.test(text)) sc.resolve += 1;
    }
    if (el) { sc.sad += Math.min(3, el); if (/^……/.test(text)) sc.sad += 1; if (/^[…。，、\s]*$/.test(text)) sc.sad += 2; }
    if (/哈{2,}|呵{2,}|嘿{2,}/.test(text)) sc.joy += 2;
    let best = 'default', bv = 1.5;
    for (const k of ORDER) if (sc[k] > bv) { bv = sc[k]; best = k; }
    return best;
  }
  // 解析一行：{ who, text, pid, expr, narr, enemy, shock, push }
  function parseLine(l) {
    let [who, text, pid, tag] = l;
    who = who || ''; text = String(text == null ? '' : text);
    let expr = null;
    if (typeof pid === 'string' && pid.indexOf('@') > 0) { const i = pid.indexOf('@'); expr = ALIAS[pid.slice(0, i)] || null; pid = pid.slice(i + 1); }
    if (typeof tag === 'string' && ALIAS[tag]) expr = ALIAS[tag];
    const narr = who === '旁白';
    if (!pid && !narr && typeof heroIdByName === 'function') pid = heroIdByName(who) || null;
    const auto = !expr;
    if (!expr) expr = exprFromText(text);
    const enemy = typeof pid === 'string' && pid.startsWith('enemy:');
    const strong = /[！!]{2}|[？?][！!]|[！!][？?]/.test(text);
    const shock = expr === 'surprise' && (strong || /^(什么|怎么可能|不可能|竟然|糟了|这、这|你、你)/.test(text)) || (!auto && expr === 'surprise');
    const push = expr === 'sad' || expr === 'resolve' || (expr === 'anger' && strong);
    return { who, text, pid: pid || null, expr, narr, enemy, shock, push, rage: expr === 'anger' && (strong || /！$/.test(text)) };
  }

  // =====================================================================
  // 背景选择
  // =====================================================================
  const THEME_KW = {
    throne: ['王座', '王宫', '皇宫', '宫殿', '大殿', '谒见', '王城', '帝都', '御前', '加冕'],
    castle: ['城', '堡', '塔', '要塞', '大厅', '神殿', '监狱', '牢', '关口'],
    forest: ['森林', '树林', '密林', '林', '森', '丛林', '精灵'],
    village: ['村', '镇', '庄', '街', '市集', '酒馆', '故乡', '民宅'],
    battlefield: ['战', '役', '平原', '草原', '阵', '大军', '会战', '决战', '前线'],
    nightcamp: ['夜', '营', '篝火', '宿营', '月光', '野营', '夜袭'],
    snow: ['雪', '冰', '寒', '北境', '雪原', '极地', '冻'],
    desert: ['沙漠', '荒漠', '沙', '漠', '绿洲', '烈日', '金字塔'],
    cave: ['洞', '窟', '穴', '矿', '地底', '地下', '遗迹', '迷宫'],
    demon: ['魔界', '魔域', '魔殿', '冥', '地狱', '魔神', '邪神', '黑魔', '魔王', '异界', '深渊', '暗黑'],
    sea: ['海', '港', '船', '岛', '码头', '湖', '河', '岸', '舰'],
  };
  const TILE_THEME = { W: 'sea', T: 'sea', B: 'sea', N: 'snow', S: 'desert', O: 'cave', D: 'demon', L: 'demon', V: 'village', F: 'forest', G: 'battlefield', H: 'battlefield', M: 'battlefield', R: 'battlefield', P: 'forest', K: 'throne', C: 'castle', X: 'castle', Y: 'castle', A: 'castle' };
  const TILE_W = { G: 0.5, R: 0.4, H: 0.9, M: 0.9, F: 1.4, V: 2.5 }; // 草地、道路到处都有，权重压低
  function flatText(list, out, depth) {
    out = out || []; depth = depth || 0;
    if (!Array.isArray(list) || depth > 4) return out;
    for (const l of list) {
      if (!Array.isArray(l)) continue;
      if (l[0] === 'if') { flatText(l[2], out, depth + 1); flatText(l[3], out, depth + 1); }
      else if (l[0] === '?') { for (const o of l[2] || []) flatText(o.say, out, depth + 1); }
      else if (l[0] !== 'do' && typeof l[1] === 'string') out.push(l[1]);
    }
    return out;
  }
  function kwScore(text, w, sc) { for (const k in THEME_KW) for (const kw of THEME_KW[k]) if (text.includes(kw)) sc[k] = (sc[k] || 0) + w * (kw.length > 1 ? 1.5 : 1); }
  function themeOf(stg) {
    if (!stg) return 'castle';
    if (stg.scene && PAINT[stg.scene]) return stg.scene;
    if (stg.__scnTheme) return stg.__scnTheme;
    const sc = {};
    const map = stg.map || [];
    let n = 0; const cnt = {};
    for (const row of map) for (const ch of row) { n++; cnt[ch] = (cnt[ch] || 0) + 1; }
    for (const ch in cnt) { const t = TILE_THEME[ch]; if (t) sc[t] = (sc[t] || 0) + cnt[ch] / Math.max(1, n) * 10 * (TILE_W[ch] || 1); }
    if ((cnt.K || 0) / Math.max(1, n) < 0.05) sc.throne = (sc.throne || 0) * 0.3; // 只有一条红毯：多半是城堡
    sc.castle = (sc.castle || 0) + (sc.throne || 0) * 0.5;
    for (const t of ['N', 'S', 'O', 'D', 'L']) if (cnt[t]) sc[TILE_THEME[t]] += 2; // 特殊地形少量出现也很有代表性
    kwScore(stg.title || '', 4, sc);
    const intro = flatText(stg.intro).slice(0, 2).join('');
    kwScore(intro, 0.8, sc);
    let best = 'battlefield', bv = -1;
    for (const k in sc) if (sc[k] > bv && PAINT[k]) { bv = sc[k]; best = k; }
    try { stg.__scnTheme = best; } catch (e) { /* 冻结物件 */ }
    return best;
  }
  function nightOf(stg) {
    const t = (stg && stg.title || '') + flatText(stg && stg.intro).slice(0, 1).join('');
    return /夜|月光|深夜|黑夜|入夜/.test(t);
  }
  function themeFromText(lines) {
    const sc = {}; kwScore(flatText(lines).join(''), 1, sc);
    let best = null, bv = 1.4;
    for (const k in sc) if (sc[k] > bv && PAINT[k]) { bv = sc[k]; best = k; }
    return best;
  }

  // =====================================================================
  // 程序化手绘背景
  // =====================================================================
  function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; s = s || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
  function rad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; }
  function glow(g, x, y, r, col, a, op) { g.save(); g.globalCompositeOperation = op || 'lighter'; g.globalAlpha = a; g.fillStyle = rad(g, x, y, 0, r, [[0, col], [0.35, hexA(col, 0.45)], [1, hexA(col, 0)]]); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  function sky(g, w, h, stops) { g.fillStyle = lin(g, 0, 0, 0, h, stops); g.fillRect(0, 0, w, h); }
  // 山脊 / 丘陵剪影
  function ridge(g, w, h, y, amp, col, R, o) {
    o = o || {}; const ph = [R() * 6.3, R() * 6.3, R() * 6.3, R() * 6.3], f = o.freq || 1, jag = o.jag == null ? 0.4 : o.jag;
    g.beginPath(); g.moveTo(-2, h + 2);
    for (let x = -2; x <= w + 4; x += 3) {
      const t = x / w * f;
      let v = Math.sin(t * 2.3 + ph[0]) * 0.45 + Math.sin(t * 5.1 + ph[1]) * 0.3 + Math.sin(t * 11.7 + ph[2]) * 0.15 * (1 + jag) + Math.sin(t * 27 + ph[3]) * 0.08 * jag;
      if (o.peak) v = 1 - Math.abs(v) * 1.6;
      g.lineTo(x, y - (v * 0.5 + 0.5) * amp);
    }
    g.lineTo(w + 4, h + 2); g.closePath(); g.fillStyle = col; g.fill();
  }
  function clouds(g, w, y0, y1, n, col, a, R, sz) {
    g.save();
    for (let i = 0; i < n; i++) {
      const cx = R() * w * 1.2 - w * 0.1, cy = y0 + R() * (y1 - y0), s = (sz || 1) * (18 + R() * 40);
      for (let k = 0; k < 6; k++) {
        const x = cx + (R() - 0.5) * s * 2.4, y = cy + (R() - 0.5) * s * 0.5, r = s * (0.5 + R() * 0.6);
        g.globalAlpha = a * (0.5 + R() * 0.5); g.fillStyle = rad(g, x, y, 0, r, [[0, col], [1, hexA(col, 0)]]);
        g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }
  function stars(g, w, h, n, R) { g.save(); for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, r = R() < 0.1 ? 1.3 : 0.6 + R() * 0.5; g.globalAlpha = 0.35 + R() * 0.65; g.fillStyle = R() < 0.2 ? '#ffe8c0' : '#e8f0ff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } g.restore(); }
  function rays(g, x, y, ang, spread, len, n, col, a, R) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const t = ang + (R() - 0.5) * spread, wd = 0.02 + R() * 0.05;
      const x1 = x + Math.cos(t - wd) * len, y1 = y + Math.sin(t - wd) * len, x2 = x + Math.cos(t + wd) * len, y2 = y + Math.sin(t + wd) * len;
      g.globalAlpha = a * (0.4 + R() * 0.6);
      g.fillStyle = lin(g, x, y, (x1 + x2) / 2, (y1 + y2) / 2, [[0, hexA(col, 0.9)], [1, hexA(col, 0)]]);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill();
    }
    g.restore();
  }
  function fog(g, w, y, hh, col, a) { g.save(); g.globalAlpha = a; g.fillStyle = lin(g, 0, y - hh, 0, y + hh, [[0, hexA(col, 0)], [0.5, hexA(col, 1)], [1, hexA(col, 0)]]); g.fillRect(0, y - hh, w, hh * 2); g.restore(); }
  function pine(g, x, y, hh, col, snow) {
    g.fillStyle = col; g.beginPath();
    const tiers = 4, wd = hh * 0.42;
    for (let i = 0; i < tiers; i++) { const ty = y - hh * (i / tiers) * 0.85, tw = wd * (1 - i / tiers * 0.7); g.moveTo(x - tw, ty); g.lineTo(x, ty - hh * 0.38); g.lineTo(x + tw, ty); }
    g.fill(); g.fillRect(x - hh * 0.04, y - 2, hh * 0.08, hh * 0.1);
    if (snow) { g.fillStyle = snow; for (let i = 0; i < tiers; i++) { const ty = y - hh * (i / tiers) * 0.85, tw = wd * (1 - i / tiers * 0.7); g.beginPath(); g.moveTo(x - tw * 0.55, ty - hh * 0.17); g.lineTo(x, ty - hh * 0.38); g.lineTo(x + tw * 0.35, ty - hh * 0.22); g.closePath(); g.fill(); } }
  }
  function bush(g, x, y, r, col, R, n) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < (n || 6); i++) { const a = R() * Math.PI, rr = r * (0.45 + R() * 0.45); g.moveTo(x + Math.cos(a) * r * 0.8 + rr, y - Math.sin(a) * r * 0.5); g.arc(x + Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.5, rr, 0, Math.PI * 2); } g.fill(); }
  function house(g, x, y, s, wall, roof, win, R) {
    const w = 44 * s, hh = 30 * s;
    g.fillStyle = wall; g.fillRect(x - w / 2, y - hh, w, hh);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - w * 0.62, y - hh + 2); g.lineTo(x, y - hh - 24 * s); g.lineTo(x + w * 0.62, y - hh + 2); g.closePath(); g.fill();
    g.fillRect(x + w * 0.18, y - hh - 22 * s, 6 * s, 12 * s);
    if (win) { g.fillStyle = win; g.fillRect(x - w * 0.3, y - hh * 0.62, 8 * s, 8 * s); g.fillRect(x + w * 0.12, y - hh * 0.62, 8 * s, 8 * s); glow(g, x - w * 0.26, y - hh * 0.56, 16 * s, win, 0.35); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 4 * s, y - 13 * s, 8 * s, 13 * s);
  }
  function arch(g, x, y, w, hh) { g.beginPath(); g.moveTo(x - w / 2, y + hh); g.lineTo(x - w / 2, y + w / 2); g.arc(x, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + hh); g.closePath(); }
  function banner(g, x, y, w, hh, col, trim) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2, y + hh); g.lineTo(x, y + hh - w * 0.4); g.lineTo(x - w / 2, y + hh); g.closePath(); g.fill();
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(0,0,0,.35)'], [0.4, 'rgba(255,255,255,.08)'], [1, 'rgba(0,0,0,.4)']]); g.fill();
    g.strokeStyle = trim; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = trim; g.beginPath(); g.arc(x, y + hh * 0.4, w * 0.18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2a1a'; g.fillRect(x - w / 2 - 3, y - 2, w + 6, 3);
  }
  function pillar(g, x, y0, y1, w, col, hl) {
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, hexA(col, 1)], [0.3, hl], [0.55, col], [1, '#0a0608']]);
    g.fillRect(x - w / 2, y0, w, y1 - y0);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - w * 0.62, y0, w * 1.24, w * 0.35); g.fillRect(x - w * 0.62, y1 - w * 0.4, w * 1.24, w * 0.4);
  }
  // 笔触质感：取样底色，画上许多半透明短笔触 + 暗角
  function brush(g, w, h, R, n, a) {
    let d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return; }
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = R() * w, y = R() * h, j = ((y | 0) * w + (x | 0)) * 4;
      const k = 0.88 + R() * 0.26;
      g.strokeStyle = `rgb(${clamp(d[j] * k, 0, 255) | 0},${clamp(d[j + 1] * k, 0, 255) | 0},${clamp(d[j + 2] * k, 0, 255) | 0})`;
      g.globalAlpha = a * (0.4 + R() * 0.6); g.lineWidth = 1.5 + R() * 3.5;
      const an = (R() - 0.5) * 0.9 + (R() < 0.5 ? 0 : Math.PI), len = 3 + R() * 6;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an) * len * 0.5 + (R() - 0.5) * 3, y + Math.sin(an) * len * 0.5 + (R() - 0.5) * 3, x + Math.cos(an) * len, y + Math.sin(an) * len); g.stroke();
    }
    g.restore();
  }
  function vignette(g, w, h, a) { g.fillStyle = rad(g, w / 2, h * 0.42, Math.min(w, h) * 0.35, Math.max(w, h) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${a})`]]); g.fillRect(0, 0, w, h); }

  const PAINT = {
    castle(g, w, h, R) { // 城堡大厅
      const fl = h * 0.5;
      sky(g, w, h, [[0, '#150f18'], [0.3, '#3a2c2e'], [0.5, '#4a3832'], [0.52, '#2a1e1c'], [1, '#0e0a0a']]);
      g.save(); g.globalAlpha = 0.18; // 石砖
      for (let y = 0; y < fl; y += 16) for (let x = (y / 16 % 2) * -14; x < w; x += 28) { g.fillStyle = R() < 0.5 ? '#6a5448' : '#20161a'; g.fillRect(x + 1, y + 1, 26, 14); }
      g.restore();
      for (const i of [-1, 0, 1]) { // 拱窗
        const x = w / 2 + i * w * 0.31, ww = w * 0.13, wy = h * 0.1, wh = h * 0.25;
        g.fillStyle = '#120c0e'; arch(g, x, wy - 6, ww + 12, wh + 10); g.fill();
        g.fillStyle = lin(g, 0, wy, 0, wy + wh, [[0, '#fff2c8'], [0.6, '#f0c47a'], [1, '#c08a50']]); arch(g, x, wy, ww, wh); g.fill();
        g.strokeStyle = '#2a1c18'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, wy); g.lineTo(x, wy + wh); g.moveTo(x - ww / 2, wy + wh * 0.55); g.lineTo(x + ww / 2, wy + wh * 0.55); g.stroke();
        glow(g, x, wy + wh * 0.4, ww * 1.6, '#ffd890', 0.4);
        rays(g, x, wy + wh * 0.3, Math.PI / 2 + i * 0.22, 0.25, h * 0.75, 5, '#ffe0a0', 0.16, R);
      }
      for (const i of [-0.5, 0.5]) banner(g, w / 2 + i * w * 0.31, h * 0.07, w * 0.09, h * 0.2, '#8a1a20', '#e0b050');
      g.fillStyle = lin(g, 0, fl, 0, h, [[0, '#5a4438'], [0.4, '#2a1e1a'], [1, '#0a0606']]); g.fillRect(0, fl, w, h - fl); // 地板
      g.save(); g.globalAlpha = 0.25; g.strokeStyle = '#000'; g.lineWidth = 1;
      for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(w / 2 + i * 14, fl); g.lineTo(w / 2 + i * 90, h); g.stroke(); }
      for (let y = fl + 8, s = 8; y < h; s *= 1.25, y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.restore();
      for (const i of [-1, 0, 1]) glow(g, w / 2 + i * w * 0.31, fl + h * 0.1, w * 0.2, '#ffcf80', 0.22);
      for (const [x, ww] of [[w * 0.05, w * 0.14], [w * 0.95, w * 0.14], [w * 0.2, w * 0.07], [w * 0.8, w * 0.07]]) pillar(g, x, 0, fl + (ww > 40 ? h * 0.5 : h * 0.06), ww, '#3a2a26', '#6a5448');
      for (const x of [w * 0.12, w * 0.88]) { glow(g, x, h * 0.3, 40, '#ff9a40', 0.55); g.fillStyle = '#ffd070'; g.beginPath(); g.ellipse(x, h * 0.3, 3, 6, 0, 0, Math.PI * 2); g.fill(); }
    },
    throne(g, w, h, R) { // 王座厅
      const fl = h * 0.48;
      sky(g, w, h, [[0, '#1a0e1e'], [0.25, '#3e2234'], [0.48, '#5a3438'], [0.5, '#2a1418'], [1, '#0a0406']]);
      const cx = w / 2;
      glow(g, cx, h * 0.17, w * 0.5, '#ffcf8a', 0.5); // 玫瑰窗
      g.fillStyle = '#1e0e14'; g.beginPath(); g.arc(cx, h * 0.17, w * 0.17, 0, Math.PI * 2); g.fill();
      g.fillStyle = rad(g, cx, h * 0.17, 0, w * 0.15, [[0, '#fff6d8'], [0.5, '#f0b070'], [0.85, '#a04a50'], [1, '#5a2040']]); g.beginPath(); g.arc(cx, h * 0.17, w * 0.15, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a1018'; g.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(cx, h * 0.17); g.lineTo(cx + Math.cos(a) * w * 0.15, h * 0.17 + Math.sin(a) * w * 0.15); g.stroke(); }
      g.beginPath(); g.arc(cx, h * 0.17, w * 0.06, 0, Math.PI * 2); g.stroke();
      rays(g, cx, h * 0.17, Math.PI / 2, 0.6, h * 0.6, 9, '#ffe2a8', 0.14, R);
      for (const s of [-1, 1]) { for (const k of [0.36, 0.2]) banner(g, cx + s * w * k, h * 0.04, w * 0.08, h * 0.24, '#7a1020', '#e8c060'); }
      // 台阶与王座
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#4a2a2a' : '#5e3632'; g.fillRect(cx - w * (0.22 + i * 0.04), fl - 22 + i * 7, w * (0.44 + i * 0.08), 8); }
      g.fillStyle = '#2a1208'; g.beginPath(); g.moveTo(cx - 26, fl - 22); g.lineTo(cx - 24, fl - 96); g.quadraticCurveTo(cx, fl - 126, cx + 24, fl - 96); g.lineTo(cx + 26, fl - 22); g.closePath(); g.fill();
      g.fillStyle = lin(g, cx - 20, 0, cx + 20, 0, [[0, '#7a5010'], [0.4, '#f0c850'], [1, '#6a4008']]); g.beginPath(); g.moveTo(cx - 20, fl - 30); g.lineTo(cx - 19, fl - 90); g.quadraticCurveTo(cx, fl - 116, cx + 19, fl - 90); g.lineTo(cx + 20, fl - 30); g.closePath(); g.fill();
      g.fillStyle = '#8a1424'; g.fillRect(cx - 14, fl - 82, 28, 50);
      glow(g, cx, fl - 70, 70, '#ffd27a', 0.3);
      g.fillStyle = lin(g, 0, fl, 0, h, [[0, '#4a3030'], [1, '#0a0406']]); g.fillRect(0, fl, w, h - fl);
      g.fillStyle = lin(g, 0, fl, 0, h, [[0, '#a01c28'], [1, '#4a060e']]); // 红毯
      g.beginPath(); g.moveTo(cx - 22, fl); g.lineTo(cx + 22, fl); g.lineTo(cx + w * 0.42, h); g.lineTo(cx - w * 0.42, h); g.closePath(); g.fill();
      g.strokeStyle = '#d8a840'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 19, fl); g.lineTo(cx - w * 0.37, h); g.moveTo(cx + 19, fl); g.lineTo(cx + w * 0.37, h); g.stroke();
      for (const s of [-1, 1]) for (const [k, ww, top] of [[0.44, w * 0.12, 0], [0.27, w * 0.06, h * 0.02]]) pillar(g, cx + s * w * k, top, fl + (ww > 40 ? h * 0.52 : h * 0.03), ww, '#3a2028', '#7a4a50');
    },
    forest(g, w, h, R) { // 森林
      sky(g, w, h, [[0, '#cfe8c8'], [0.25, '#7ab08a'], [0.5, '#2e5a40'], [1, '#08140c']]);
      glow(g, w * 0.62, h * 0.06, w * 0.6, '#fff8d0', 0.55);
      for (const [n, col, y, hh] of [[14, '#5a8a6a', 0.5, 0.5], [11, '#3a6a4c', 0.56, 0.62], [8, '#1e4430', 0.62, 0.75]]) {
        for (let i = 0; i < n; i++) { const x = R() * w, tw = 6 + R() * 10 * (hh * 1.6); g.fillStyle = col; g.fillRect(x - tw / 2, h * (y - hh) - 10, tw, h * hh + 20); }
        g.fillStyle = col; for (let i = 0; i < n * 2; i++) bush(g, R() * w, h * (y - hh * (0.75 + R() * 0.3)), 26 + R() * 30, col, R, 5);
        fog(g, w, h * y, h * 0.06, '#b8e0c0', 0.25);
      }
      rays(g, w * 0.62, -20, Math.PI / 2 + 0.25, 0.7, h * 0.8, 10, '#fff4c0', 0.13, R);
      g.fillStyle = lin(g, 0, h * 0.6, 0, h, [[0, '#24442a'], [1, '#060e08']]); g.fillRect(0, h * 0.6, w, h * 0.4);
      for (let i = 0; i < 26; i++) bush(g, R() * w, h * (0.6 + R() * 0.08), 14 + R() * 22, R() < 0.5 ? '#2e5a34' : '#1a3a20', R, 5);
      for (const x of [w * 0.04, w * 0.97]) { g.fillStyle = '#0c1a10'; g.fillRect(x - 22, 0, 44, h); }
      g.fillStyle = '#0c1a10'; for (let i = 0; i < 10; i++) bush(g, R() * w, R() * h * 0.08, 40 + R() * 40, '#0e2014', R, 6);
    },
    village(g, w, h, R) { // 村庄
      sky(g, w, h, [[0, '#6a8ac8'], [0.22, '#e8b890'], [0.4, '#f8d8a0'], [0.46, '#a8b878'], [1, '#2a3a1a']]);
      glow(g, w * 0.3, h * 0.3, w * 0.5, '#fff0c0', 0.6);
      clouds(g, w, h * 0.06, h * 0.26, 6, '#fff0e0', 0.55, R);
      ridge(g, w, h, h * 0.4, h * 0.07, '#8a9ab0', R, { jag: 0.2 });
      ridge(g, w, h, h * 0.45, h * 0.05, '#7a9a5a', R, { jag: 0.1 });
      for (let i = 0; i < 6; i++) house(g, w * (0.12 + i * 0.16) + (R() - 0.5) * 20, h * (0.47 + R() * 0.02), 0.6, '#c8a878', '#8a3a28', '#ffd070', R);
      g.fillStyle = '#4a6a2a'; for (let i = 0; i < 10; i++) bush(g, R() * w, h * 0.48, 10 + R() * 16, '#4a6a2a', R, 5);
      ridge(g, w, h, h * 0.54, h * 0.03, '#5a7a30', R, { jag: 0.1 });
      house(g, w * 0.18, h * 0.6, 1.4, '#d8b888', '#9a3a26', '#ffd880', R);
      house(g, w * 0.84, h * 0.62, 1.6, '#c8a070', '#6a3a2a', '#ffd880', R);
      g.save(); g.globalAlpha = 0.35; for (const [x, y] of [[w * 0.215, h * 0.6 - 76], [w * 0.88, h * 0.62 - 86]]) clouds(g, w * 0.1, y - 50, y, 2, '#e8e0d8', 0.5, R, 0.4); g.restore();
      g.fillStyle = '#5a3a20'; for (let x = w * 0.3; x < w * 0.7; x += 18) g.fillRect(x, h * 0.6, 3, 18); g.fillRect(w * 0.3, h * 0.605, w * 0.4, 3);
      g.fillStyle = lin(g, 0, h * 0.62, 0, h, [[0, '#4a6a2a'], [1, '#141e0a']]); g.fillRect(0, h * 0.63, w, h * 0.37);
      g.fillStyle = 'rgba(200,170,120,.5)'; g.beginPath(); g.moveTo(w * 0.45, h * 0.63); g.lineTo(w * 0.55, h * 0.63); g.lineTo(w * 0.75, h); g.lineTo(w * 0.25, h); g.closePath(); g.fill();
    },
    battlefield(g, w, h, R) { // 战场
      sky(g, w, h, [[0, '#2a1a2a'], [0.2, '#7a3a34'], [0.38, '#e08a4a'], [0.46, '#f0b060'], [0.5, '#5a3a2a'], [1, '#140c08']]);
      glow(g, w * 0.55, h * 0.42, w * 0.6, '#ffc060', 0.6);
      clouds(g, w, h * 0.04, h * 0.3, 9, '#3a2028', 0.6, R, 1.2);
      clouds(g, w, h * 0.25, h * 0.38, 5, '#ffb070', 0.3, R);
      ridge(g, w, h, h * 0.44, h * 0.08, '#6a3a3a', R, { peak: 1, jag: 0.5 });
      ridge(g, w, h, h * 0.47, h * 0.04, '#3a2224', R, { jag: 0.3 });
      for (let i = 0; i < 3; i++) { // 远方烽烟：由地平线往上飘散的烟柱
        const x0 = w * (0.12 + R() * 0.76); let x = x0;
        g.save();
        for (let k = 0; k < 14; k++) { const t = k / 13, y = h * (0.45 - t * 0.32), r = 6 + t * 26; x += 2 + R() * 4; g.globalAlpha = 0.22 * (1 - t * 0.6); g.fillStyle = rad(g, x, y, 0, r, [[0, '#2a1a1c'], [1, 'rgba(42,26,28,0)']]); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
        g.restore(); glow(g, x0, h * 0.45, 22, '#ff8a30', 0.5);
      }
      g.fillStyle = lin(g, 0, h * 0.48, 0, h, [[0, '#4a2e22'], [1, '#0e0806']]); g.fillRect(0, h * 0.48, w, h * 0.52);
      ridge(g, w, h, h * 0.56, h * 0.06, '#24140e', R, { jag: 0.2 });
      g.strokeStyle = '#140a06'; g.lineWidth = 2; // 插在地上的枪与破旗
      for (let i = 0; i < 9; i++) { const x = R() * w, y = h * (0.5 + R() * 0.07), l = 30 + R() * 40, a = (R() - 0.5) * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke(); if (R() < 0.45) { g.fillStyle = R() < 0.5 ? '#6a1a1a' : '#2a2a4a'; g.beginPath(); const tx = x + Math.sin(a) * l, ty = y - Math.cos(a) * l; g.moveTo(tx, ty); g.lineTo(tx + 18, ty + 4); g.lineTo(tx + 12, ty + 10); g.lineTo(tx + 1, ty + 12); g.fill(); } }
      fog(g, w, h * 0.5, h * 0.04, '#e09060', 0.3);
    },
    nightcamp(g, w, h, R) { // 夜营
      sky(g, w, h, [[0, '#050818'], [0.3, '#101a3a'], [0.45, '#22305a'], [0.5, '#141a2a'], [1, '#04060a']]);
      stars(g, w, h * 0.42, 140, R);
      g.fillStyle = '#f4f0dc'; g.beginPath(); g.arc(w * 0.76, h * 0.12, 20, 0, Math.PI * 2); g.fill(); glow(g, w * 0.76, h * 0.12, 90, '#c8d8ff', 0.35);
      g.fillStyle = '#24305a'; g.beginPath(); g.arc(w * 0.76 + 8, h * 0.12 - 5, 17, 0, Math.PI * 2); g.fill();
      ridge(g, w, h, h * 0.43, h * 0.07, '#1a2442', R, { peak: 1, jag: 0.3 });
      for (let i = 0; i < 18; i++) pine(g, R() * w, h * (0.47 + R() * 0.02), 30 + R() * 30, '#0c1224');
      g.fillStyle = lin(g, 0, h * 0.48, 0, h, [[0, '#18202a'], [1, '#040608']]); g.fillRect(0, h * 0.48, w, h * 0.52);
      const fx = w * 0.5, fy = h * 0.6;
      glow(g, fx, fy, w * 0.55, '#ff8a30', 0.55);
      for (const [x, s, c] of [[w * 0.18, 1.3, '#5a4a3a'], [w * 0.82, 1.5, '#4a3e34'], [w * 0.36, 0.8, '#3a3028'], [w * 0.66, 0.9, '#3a3028']]) { // 帐篷
        const y = h * (0.56 + s * 0.02);
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 40 * s, y); g.lineTo(x, y - 44 * s); g.lineTo(x + 40 * s, y); g.closePath(); g.fill();
        g.fillStyle = lin(g, x - 40 * s, 0, x + 40 * s, 0, x < fx ? [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(255,140,60,.35)']] : [[0, 'rgba(255,140,60,.35)'], [1, 'rgba(0,0,0,.5)']]); g.fill();
        g.fillStyle = '#120c08'; g.beginPath(); g.moveTo(x - 8 * s, y); g.lineTo(x, y - 22 * s); g.lineTo(x + 8 * s, y); g.fill();
      }
      g.fillStyle = '#2a1608'; g.fillRect(fx - 16, fy - 3, 32, 5);
      for (const [c, s] of [['#ff6a20', 1], ['#ffb040', 0.65], ['#fff0a0', 0.32]]) { g.fillStyle = c; g.beginPath(); g.moveTo(fx - 14 * s, fy); g.quadraticCurveTo(fx - 10 * s, fy - 30 * s, fx, fy - 42 * s); g.quadraticCurveTo(fx + 12 * s, fy - 26 * s, fx + 14 * s, fy); g.closePath(); g.fill(); }
    },
    snow(g, w, h, R) { // 雪原
      sky(g, w, h, [[0, '#7a9ac8'], [0.3, '#c8d8ec'], [0.45, '#eef4fa'], [1, '#a8b8cc']]);
      glow(g, w * 0.3, h * 0.12, w * 0.4, '#ffffff', 0.5);
      clouds(g, w, h * 0.05, h * 0.25, 6, '#ffffff', 0.45, R);
      ridge(g, w, h, h * 0.36, h * 0.16, '#a8b8d4', R, { peak: 1, jag: 0.6 });
      ridge(g, w, h, h * 0.36, h * 0.12, 'rgba(255,255,255,.55)', R, { peak: 1, jag: 0.6 });
      ridge(g, w, h, h * 0.42, h * 0.1, '#8a9cbc', R, { peak: 1, jag: 0.5, freq: 1.4 });
      fog(g, w, h * 0.43, h * 0.05, '#f4f8ff', 0.6);
      for (let i = 0; i < 22; i++) pine(g, R() * w, h * (0.45 + R() * 0.04), 26 + R() * 28, '#2a4058', '#e8f0fa');
      g.fillStyle = lin(g, 0, h * 0.48, 0, h, [[0, '#e8f0f8'], [0.5, '#c0cee0'], [1, '#6a7a94']]); g.fillRect(0, h * 0.48, w, h * 0.52);
      ridge(g, w, h, h * 0.56, h * 0.04, '#d4e0ee', R, { jag: 0.1 });
      for (const x of [w * 0.08, w * 0.93]) pine(g, x, h * 0.66, 120, '#1a2a3e', '#f0f6ff');
    },
    desert(g, w, h, R) { // 沙漠
      sky(g, w, h, [[0, '#4a8ac8'], [0.25, '#a8c8d8'], [0.42, '#f8e0a8'], [0.46, '#e8b870'], [1, '#6a3a18']]);
      g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(w * 0.7, h * 0.14, 22, 0, Math.PI * 2); g.fill(); glow(g, w * 0.7, h * 0.14, 130, '#fff0b0', 0.6);
      g.fillStyle = 'rgba(180,130,80,.55)'; g.beginPath(); g.moveTo(w * 0.18, h * 0.43); g.lineTo(w * 0.27, h * 0.33); g.lineTo(w * 0.36, h * 0.43); g.fill(); g.beginPath(); g.moveTo(w * 0.32, h * 0.43); g.lineTo(w * 0.38, h * 0.37); g.lineTo(w * 0.44, h * 0.43); g.fill();
      fog(g, w, h * 0.43, h * 0.03, '#ffe8c0', 0.6);
      for (const [y, a, c1, c2] of [[0.46, 0.05, '#e8b468', '#b8804a'], [0.53, 0.06, '#d8a058', '#9a6430'], [0.62, 0.08, '#c08848', '#7a4a22'], [0.74, 0.1, '#a06a34', '#4a2a12']]) {
        const ph = R() * 6;
        g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) g.lineTo(x, h * y - (Math.sin(x / w * 4 + ph) * 0.5 + 0.5) * h * a);
        g.lineTo(w, h); g.closePath(); g.fillStyle = lin(g, 0, h * (y - a), 0, h * (y + 0.1), [[0, c1], [1, c2]]); g.fill();
        g.strokeStyle = 'rgba(255,240,200,.35)'; g.lineWidth = 1.5; g.beginPath();
        for (let x = 0; x <= w; x += 4) { const yy = h * y - (Math.sin(x / w * 4 + ph) * 0.5 + 0.5) * h * a; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
      }
    },
    cave(g, w, h, R) { // 洞窟
      sky(g, w, h, [[0, '#06080c'], [0.4, '#141a24'], [0.55, '#10141c'], [1, '#040506']]);
      glow(g, w * 0.5, h * 0.33, w * 0.35, '#8ab8d8', 0.35); // 远处洞口
      g.fillStyle = '#b8d4e0'; g.beginPath(); g.ellipse(w * 0.5, h * 0.35, w * 0.07, h * 0.06, 0, 0, Math.PI * 2); g.fill();
      rays(g, w * 0.5, h * 0.33, Math.PI / 2, 0.5, h * 0.4, 6, '#a8d0ff', 0.1, R);
      ridge(g, w, h, h * 0.42, h * 0.06, '#1a2030', R, { jag: 0.6 });
      for (let i = 0; i < 16; i++) { const x = R() * w, l = h * (0.06 + R() * 0.16), ww = 8 + R() * 18; g.fillStyle = R() < 0.5 ? '#1a1e28' : '#0c0e14'; g.beginPath(); g.moveTo(x - ww, -2); g.lineTo(x, l); g.lineTo(x + ww, -2); g.fill(); }
      g.fillStyle = '#0a0c12'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, h); g.lineTo(w * 0.16, h); g.quadraticCurveTo(w * 0.24, h * 0.4, w * 0.1, 0); g.fill(); g.beginPath(); g.moveTo(w, 0); g.lineTo(w, h); g.lineTo(w * 0.84, h); g.quadraticCurveTo(w * 0.78, h * 0.4, w * 0.9, 0); g.fill();
      g.fillStyle = lin(g, 0, h * 0.46, 0, h, [[0, '#1a2030'], [1, '#040506']]); g.fillRect(0, h * 0.46, w, h * 0.54);
      for (let i = 0; i < 9; i++) { const x = R() * w, y = h * (0.46 + R() * 0.12), l = 10 + R() * 30, col = R() < 0.6 ? '#5ad0ff' : '#b070ff'; glow(g, x, y - l * 0.4, l * 1.8, col, 0.4); g.fillStyle = col; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y - l); g.lineTo(x + 5, y); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x - 1, y - l); g.lineTo(x + 1, y); g.fill(); }
    },
    demon(g, w, h, R) { // 魔域
      sky(g, w, h, [[0, '#0a0410'], [0.2, '#2a0a2a'], [0.38, '#6a1030'], [0.46, '#b02a2a'], [0.5, '#3a0a14'], [1, '#080206']]);
      g.fillStyle = '#ff6a3a'; g.beginPath(); g.arc(w * 0.5, h * 0.17, w * 0.18, 0, Math.PI * 2); g.fill();
      g.fillStyle = rad(g, w * 0.5, h * 0.17, 0, w * 0.18, [[0, '#ffd080'], [0.6, '#ff6a3a'], [1, '#a01020']]); g.fill();
      glow(g, w * 0.5, h * 0.17, w * 0.6, '#ff3a3a', 0.45);
      clouds(g, w, h * 0.08, h * 0.32, 8, '#1a0410', 0.7, R, 1.1);
      for (let i = 0; i < 4; i++) { const x = R() * w, y = h * (0.12 + R() * 0.2), s = 14 + R() * 22; g.fillStyle = '#14060e'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.lineTo(x + s * 0.3, y + s * 1.4); g.lineTo(x - s * 0.2, y + s * 0.9); g.closePath(); g.fill(); }
      for (const [y, a, c] of [[0.44, 0.2, '#2a0814'], [0.48, 0.13, '#14040a']]) { const ph = R() * 6; g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) { const sp = Math.pow(Math.abs(Math.sin(x / w * 9 + ph)), 6); g.lineTo(x, h * y - sp * h * a - R() * 6); } g.lineTo(w, h); g.fill(); }
      g.fillStyle = lin(g, 0, h * 0.5, 0, h, [[0, '#1a0408'], [1, '#040002']]); g.fillRect(0, h * 0.5, w, h * 0.5);
      g.strokeStyle = '#ff5a1a'; g.lineCap = 'round'; // 熔岩裂缝
      for (let i = 0; i < 7; i++) { let x = R() * w, y = h * (0.52 + R() * 0.14); g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.3) * 30; y += (R() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); glow(g, x, y, 40, '#ff4010', 0.3); }
      fog(g, w, h * 0.5, h * 0.04, '#ff3a3a', 0.25);
    },
    sea(g, w, h, R) { // 海港
      sky(g, w, h, [[0, '#3a6ab0'], [0.25, '#8ab8e0'], [0.4, '#f8dcb0'], [0.42, '#e8c090'], [0.43, '#4a7aa8'], [1, '#0a2038']]);
      glow(g, w * 0.36, h * 0.38, w * 0.45, '#fff0c0', 0.6);
      clouds(g, w, h * 0.05, h * 0.3, 7, '#ffffff', 0.5, R);
      const hz = h * 0.42;
      g.save(); g.globalCompositeOperation = 'lighter'; // 海面反光
      for (let i = 0; i < 160; i++) { const y = hz + Math.pow(R(), 2) * h * 0.25, sp = (y - hz) / (h * 0.25), x = w * 0.36 + (R() - 0.5) * (30 + sp * 200); g.globalAlpha = 0.3 + R() * 0.4; g.fillStyle = '#fff2c8'; g.fillRect(x, y, 4 + R() * 10 * (1 + sp), 1.2 + sp); }
      g.restore();
      g.fillStyle = '#2a3a5a'; g.beginPath(); g.moveTo(w * 0.62, hz); g.lineTo(w * 0.74, hz - 18); g.lineTo(w * 0.86, hz - 10); g.lineTo(w, hz - 22); g.lineTo(w, hz); g.fill();
      g.fillStyle = '#e8e0d0'; g.fillRect(w * 0.9, hz - 64, 10, 44); g.fillStyle = '#a02a2a'; g.fillRect(w * 0.9, hz - 52, 10, 8); g.fillRect(w * 0.9 - 2, hz - 70, 14, 7); glow(g, w * 0.9 + 5, hz - 66, 30, '#fff0a0', 0.6); // 灯塔
      const sx = w * 0.2, sy = hz + 26; // 帆船
      g.fillStyle = '#3a2418'; g.beginPath(); g.moveTo(sx - 46, sy - 14); g.lineTo(sx + 50, sy - 14); g.lineTo(sx + 36, sy); g.lineTo(sx - 36, sy); g.closePath(); g.fill();
      g.fillStyle = '#2a1a10'; g.fillRect(sx - 2, sy - 90, 3, 76); g.fillRect(sx + 24, sy - 70, 2, 56);
      g.fillStyle = '#f0e8d8'; g.beginPath(); g.moveTo(sx + 1, sy - 86); g.quadraticCurveTo(sx + 26, sy - 60, sx + 1, sy - 22); g.closePath(); g.fill(); g.beginPath(); g.moveTo(sx - 2, sy - 84); g.quadraticCurveTo(sx - 30, sy - 56, sx - 2, sy - 24); g.closePath(); g.fill();
      g.fillStyle = '#e0d8c8'; g.beginPath(); g.moveTo(sx + 26, sy - 66); g.quadraticCurveTo(sx + 44, sy - 46, sx + 26, sy - 20); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx - 40, sy + 2, 80, 4);
      g.fillStyle = lin(g, 0, h * 0.55, 0, h, [[0, '#5a4030'], [1, '#1a0e08']]); // 码头
      g.beginPath(); g.moveTo(w * 0.45, h * 0.56); g.lineTo(w, h * 0.53); g.lineTo(w, h); g.lineTo(w * 0.2, h); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; for (let i = 1; i < 10; i++) { const t = i / 10; g.beginPath(); g.moveTo(w * (0.45 - t * 0.25), h * (0.56 + t * 0.44)); g.lineTo(w, h * (0.53 + t * 0.47)); g.stroke(); }
      g.fillStyle = '#2a1a10'; for (const [x, y, s] of [[w * 0.47, h * 0.56, 1], [w * 0.62, h * 0.55, 1.2], [w * 0.36, h * 0.72, 2]]) g.fillRect(x - 3 * s, y - 16 * s, 6 * s, 22 * s);
      g.fillStyle = '#6a4a2a'; g.fillRect(w * 0.7, h * 0.58, 26, 20); g.fillRect(w * 0.76, h * 0.565, 22, 18);
      g.strokeStyle = '#1a2030'; g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const x = w * (0.45 + R() * 0.4), y = h * (0.1 + R() * 0.15), s = 5 + R() * 4; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s * 0.6, x, y); g.quadraticCurveTo(x + s / 2, y - s * 0.6, x + s, y); g.stroke(); }
    },
    dawn(g, w, h, R) { // 结局：黎明
      sky(g, w, h, [[0, '#2a3a7a'], [0.2, '#8a6aa8'], [0.35, '#f0a080'], [0.44, '#ffe0a0'], [0.47, '#c8a070'], [1, '#2a2018']]);
      g.fillStyle = '#fff8e0'; g.beginPath(); g.arc(w * 0.5, h * 0.45, 30, Math.PI, 0); g.fill();
      glow(g, w * 0.5, h * 0.44, w * 0.8, '#ffd890', 0.7);
      rays(g, w * 0.5, h * 0.44, -Math.PI / 2, 2.6, h * 0.6, 16, '#fff0c0', 0.12, R);
      clouds(g, w, h * 0.12, h * 0.36, 8, '#ffc8a0', 0.45, R);
      ridge(g, w, h, h * 0.46, h * 0.05, '#7a5a6a', R, { jag: 0.2 });
      ridge(g, w, h, h * 0.5, h * 0.06, '#4a3a3a', R, { jag: 0.2 });
      g.fillStyle = lin(g, 0, h * 0.52, 0, h, [[0, '#3a3a24'], [1, '#0e0c08']]); g.fillRect(0, h * 0.53, w, h * 0.47);
      ridge(g, w, h, h * 0.58, h * 0.05, '#2a2a18', R, { jag: 0.2 });
      fog(g, w, h * 0.47, h * 0.03, '#ffe8c0', 0.5);
    },
  };
  // 环境粒子
  const AMBIENT = {
    castle: { k: 'mote', n: 22, c: '#ffd890' }, throne: { k: 'mote', n: 26, c: '#ffe2a0' }, forest: { k: 'firefly', n: 18, c: '#d8ff90' },
    village: { k: 'leaf', n: 12, c: '#e8a060' }, battlefield: { k: 'ember', n: 30, c: '#ffa050' }, nightcamp: { k: 'ember', n: 24, c: '#ffb050' },
    snow: { k: 'snow', n: 60, c: '#ffffff' }, desert: { k: 'dust', n: 30, c: '#ffe0b0' }, cave: { k: 'drip', n: 16, c: '#8ad8ff' },
    demon: { k: 'ember', n: 34, c: '#ff5a8a' }, sea: { k: 'sparkle', n: 20, c: '#fff6d0' }, dawn: { k: 'mote', n: 26, c: '#fff0c0' },
  };

  const BGC = new Map();
  function backdrop(theme, night, aspect, hd) {
    const bw = hd ? 420 : 140, bh = Math.round(bw * clamp(aspect, 1.2, 2.4));
    const key = theme + (night ? '|n' : '') + '|' + bw + 'x' + bh;
    if (BGC.has(key)) return BGC.get(key);
    const R = rng(key), W0 = 420, H0 = Math.round(W0 * bh / bw);
    const c = D.createElement('canvas'); c.width = W0; c.height = H0;
    const g = c.getContext('2d', { willReadFrequently: true });
    try {
      (PAINT[theme] || PAINT.battlefield)(g, W0, H0, R);
      if (night && theme !== 'nightcamp') {
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = lin(g, 0, 0, 0, H0, [[0, '#2a3870'], [1, '#3a4a80']]); g.fillRect(0, 0, W0, H0); g.restore();
        stars(g, W0, H0 * 0.25, 50, R);
      }
      brush(g, W0, H0, R, 3200, 0.4);
      vignette(g, W0, H0, 0.55);
    } catch (e) { if (G.console) console.warn('scene backdrop', theme, e); }
    let out = c;
    if (!hd) { // 像素画风：缩小成点阵，绘制时不平滑
      out = D.createElement('canvas'); out.width = bw; out.height = bh;
      const o = out.getContext('2d'); o.imageSmoothingEnabled = true; o.drawImage(c, 0, 0, bw, bh); out.pixel = true;
    }
    BGC.set(key, out); if (BGC.size > 10) BGC.delete(BGC.keys().next().value);
    return out;
  }

  // =====================================================================
  // DOM 与样式（全部由本模块建立，不动 index.html / style.css）
  // =====================================================================
  const CSS = `
#scn{position:absolute;inset:0;z-index:42;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;opacity:1;transition:opacity .35s ease;cursor:pointer}
#scn[hidden]{display:none}
#scn.fade{opacity:0}
#scn>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#scn .scn-box{position:absolute;left:8px;right:8px;bottom:calc(10px + var(--safe-b,0px));min-height:128px;padding:20px 16px 18px;border-radius:14px;background:linear-gradient(180deg,rgba(16,24,58,.88),rgba(6,10,28,.94));border:1.5px solid rgba(242,197,90,.8);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 10px 30px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.1);transition:opacity .25s,transform .3s;box-sizing:border-box}
#scn .scn-box.off{opacity:0;transform:translateY(18px);pointer-events:none}
#scn .scn-name{position:absolute;top:-16px;left:14px;padding:3px 16px;font-weight:bold;font-size:15px;letter-spacing:2px;color:#fff4d0;background:linear-gradient(180deg,#4064b8,#1a2e70);border:1.5px solid var(--gold,#f2c55a);border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.5);transition:left .2s,right .2s}
#scn .scn-name.enemy{background:linear-gradient(180deg,#b03c3c,#5a1222)}
#scn .scn-name.right{left:auto;right:14px}
#scn .scn-name:empty{display:none}
#scn .scn-text{font-size:16px;line-height:1.75;color:#f6f2ea;min-height:3.4em;text-shadow:0 1px 2px #000;word-break:break-all}
#scn .scn-next{position:absolute;right:14px;bottom:6px;color:var(--gold,#f2c55a);font-size:12px;opacity:0;transition:opacity .15s}
#scn .scn-next.on{opacity:1;animation:scnBob .7s ease-in-out infinite alternate}
@keyframes scnBob{from{transform:translateY(0)}to{transform:translateY(3px)}}
#scn .scn-narr{position:absolute;left:0;right:0;bottom:calc(14px + var(--safe-b,0px));padding:0 26px;text-align:center;opacity:0;transition:opacity .35s;pointer-events:none}
#scn .scn-narr.on{opacity:1}
#scn .scn-narr-text{display:inline-block;text-align:left;font-size:16px;line-height:1.95;letter-spacing:1.2px;color:#eee4c8;text-shadow:0 0 10px #000,0 1px 2px #000;max-width:30em}
#scn .scn-btns{position:absolute;top:calc(10px + var(--safe-t,0px));right:10px;display:flex;gap:8px;transition:opacity .25s;z-index:2}
#scn .scn-btns.off{opacity:0;pointer-events:none}
#scn .scn-btns button{font:inherit;font-size:13px;font-weight:bold;letter-spacing:1px;padding:6px 13px;border-radius:16px;background:rgba(8,12,30,.62);color:#efe6cc;border:1px solid rgba(242,197,90,.65);cursor:pointer}
#scn .scn-btns button.on{background:rgba(242,197,90,.9);color:#1c1306}
#scn .scn-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none;opacity:0;transition:opacity .5s}
#scn .scn-card.on{opacity:1}
#scn .scn-card .cc-part{font-size:13px;letter-spacing:4px;color:#c8b8ff;margin-bottom:14px;opacity:.9}
#scn .scn-card .cc-main{white-space:nowrap;font-size:26px;font-weight:bold;color:var(--gold,#f2c55a);letter-spacing:3px;padding:14px 6px;position:relative;text-shadow:0 0 18px rgba(242,197,90,.45),0 2px 4px #000;transition:letter-spacing 2.4s ease-out}
#scn .scn-card.on .cc-main{letter-spacing:4px}
#scn .scn-card .cc-main::before,#scn .scn-card .cc-main::after{content:'';position:absolute;left:50%;height:1px;width:0;background:linear-gradient(90deg,transparent,var(--gold,#f2c55a),transparent);transition:width 1.2s ease-out .15s,left 1.2s ease-out .15s}
#scn .scn-card .cc-main::before{top:0}#scn .scn-card .cc-main::after{bottom:0}
#scn .scn-card.on .cc-main::before,#scn .scn-card.on .cc-main::after{width:100%;left:0}
#scn .scn-card .cc-sub{margin-top:14px;font-size:14px;letter-spacing:3px;color:#e8dcc0;opacity:.85}
`;
  let root, cv, ctx, boxEl, nameEl, textEl, nextEl, narrEl, narrText, cardEl, btnsEl, autoBtn, skipBtn;
  function ensureDom() {
    if (root && root.isConnected) return;
    const app = D.getElementById('app') || D.body;
    if (!D.getElementById('scn-style')) { const s = D.createElement('style'); s.id = 'scn-style'; s.textContent = CSS; D.head.appendChild(s); }
    root = D.createElement('div'); root.id = 'scn'; root.hidden = true;
    root.innerHTML = '<canvas></canvas><div class="scn-card"></div><div class="scn-narr"><div class="scn-narr-text"></div></div>' +
      '<div class="scn-box off"><div class="scn-name"></div><div class="scn-text"></div><div class="scn-next">▼</div></div>' +
      '<div class="scn-btns off"><button class="scn-auto" type="button">自动</button><button class="scn-skip" type="button">跳过 ▶▶</button></div>';
    app.appendChild(root);
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
    boxEl = root.querySelector('.scn-box'); nameEl = root.querySelector('.scn-name'); textEl = root.querySelector('.scn-text'); nextEl = root.querySelector('.scn-next');
    narrEl = root.querySelector('.scn-narr'); narrText = root.querySelector('.scn-narr-text'); cardEl = root.querySelector('.scn-card');
    btnsEl = root.querySelector('.scn-btns'); autoBtn = root.querySelector('.scn-auto'); skipBtn = root.querySelector('.scn-skip');
    try { ST.auto = localStorage.getItem('cskyxcs_scn_auto') === '1'; } catch (e) { /* 隐私模式 */ }
    autoBtn.classList.toggle('on', ST.auto);
    root.addEventListener('click', onTap);
    autoBtn.addEventListener('click', e => { e.stopPropagation(); ST.auto = !ST.auto; autoBtn.classList.toggle('on', ST.auto); try { localStorage.setItem('cskyxcs_scn_auto', ST.auto ? '1' : '0'); } catch (er) { /* 忽略 */ } if (ST.auto && ST.line && !ST.typing) ST.autoAt = now() + 600; });
    skipBtn.addEventListener('click', e => { e.stopPropagation(); if (ST.card) { ST.card.skip(); return; } if (ST.lines) { sfxs('select'); ST.skipping = true; endSeg(); } });
    D.addEventListener('keydown', e => { if (!ST.open || root.hidden) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } else if (e.key === 'Escape' && ST.lines) endSeg(); });
    G.addEventListener('resize', () => { if (ST.open) measure(); });
  }
  const sfxs = n => { try { if (typeof sfx === 'function') sfx(n); } catch (e) { /* 忽略 */ } };

  // =====================================================================
  // 状态与绘制
  // =====================================================================
  const ST = {
    open: false, mode: null, theme: null, night: false, bg: null, key: null,
    black: 1, dim: 0, lb: 0, lbT: 0, flash: 0, shake: 0, zoom: 1, zoomT: 1, focus: 0.5, t0: 0,
    slots: { L: null, R: null }, exiting: [], last: null, lines: null, i: 0, res: null, line: null,
    typing: false, full: '', shown: 0, tStart: 0, autoAt: 0, auto: false, card: null,
    closing: false, closeAt: 0, token: 0, raf: 0, lastT: 0, tw: [], parts: [], amb: null,
    W: 390, H: 844, dpr: 1, boxTop: 700, hd: true,
  };
  function measure() {
    const r = root.getBoundingClientRect();
    ST.W = Math.max(1, r.width || 390); ST.H = Math.max(1, r.height || 844);
    ST.dpr = Math.min(2, G.devicePixelRatio || 1);
    const pw = Math.round(ST.W * ST.dpr), ph = Math.round(ST.H * ST.dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    ST.boxTop = boxEl.offsetTop || ST.H - 150;
  }
  function tween(o, k, to, ms, ease) {
    return new Promise(res => { ST.tw = ST.tw.filter(t => !(t.o === o && t.k === k)); ST.tw.push({ o, k, from: o[k], to, t0: now(), ms: Math.max(1, ms), ease: ease || easeIO, res }); kick(); });
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function kick() { if (!ST.raf) { ST.lastT = now(); ST.raf = requestAnimationFrame(frame); } }

  function spawnParts() {
    const a = AMBIENT[ST.theme]; ST.amb = ST.mode === 'scene' ? a : null; ST.parts = [];
    if (!ST.amb) return;
    for (let i = 0; i < a.n; i++) ST.parts.push(newPart(true));
  }
  function newPart(init) {
    const k = ST.amb.k, W = ST.W, H = ST.H, r = Math.random;
    const p = { x: r() * W, y: r() * H * 0.75, v: 0, u: 0, s: 1, a: 0.5 + r() * 0.5, ph: r() * 6.3 };
    if (k === 'snow') { p.u = (r() - 0.3) * 14; p.v = 18 + r() * 30; p.s = 1 + r() * 2.2; if (!init) p.y = -5; }
    else if (k === 'ember') { p.u = (r() - 0.5) * 16; p.v = -(14 + r() * 26); p.s = 0.8 + r() * 1.6; p.y = init ? r() * H : H * (0.55 + r() * 0.3); }
    else if (k === 'leaf') { p.u = 14 + r() * 18; p.v = 10 + r() * 14; p.s = 2 + r() * 2; if (!init) { p.x = -6; p.y = r() * H * 0.5; } }
    else if (k === 'dust') { p.u = 18 + r() * 30; p.v = (r() - 0.5) * 4; p.s = 0.8 + r() * 1.4; p.a *= 0.5; if (!init) p.x = -4; }
    else if (k === 'drip') { p.u = 0; p.v = 0; p.s = 1.2; p.wait = r() * 3; p.y0 = p.y = r() * H * 0.12; }
    else if (k === 'sparkle') { p.y = H * (0.38 + r() * 0.12); p.s = 1 + r() * 1.6; }
    else { p.u = (r() - 0.5) * 8; p.v = (r() - 0.5) * 6 - 3; p.s = 1 + r() * 1.8; } // mote / firefly
    return p;
  }
  function stepParts(dt) {
    const k = ST.amb && ST.amb.k, W = ST.W, H = ST.H;
    for (let i = 0; i < ST.parts.length; i++) {
      const p = ST.parts[i];
      p.ph += dt * (k === 'firefly' ? 2.2 : 1.3);
      if (k === 'drip') { if (p.wait > 0) { p.wait -= dt; continue; } p.v += 260 * dt; p.y += p.v * dt; if (p.y > H * 0.7) { ST.parts[i] = newPart(false); ST.parts[i].wait = 1 + Math.random() * 3; } continue; }
      p.x += (p.u + (k === 'snow' || k === 'leaf' ? Math.sin(p.ph) * 10 : k === 'firefly' ? Math.sin(p.ph) * 12 : 0)) * dt;
      p.y += (p.v + (k === 'firefly' ? Math.cos(p.ph * 0.8) * 8 : 0)) * dt;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 10) ST.parts[i] = newPart(false);
    }
  }
  function drawParts(g) {
    if (!ST.amb || !ST.parts.length) return;
    const k = ST.amb.k, c = ST.amb.c;
    g.save(); g.fillStyle = c;
    if (k === 'ember' || k === 'firefly' || k === 'mote' || k === 'sparkle') g.globalCompositeOperation = 'lighter';
    for (const p of ST.parts) {
      let a = p.a;
      if (k === 'firefly' || k === 'sparkle' || k === 'mote') a *= 0.45 + 0.55 * Math.abs(Math.sin(p.ph));
      if (k === 'ember') a *= clamp((p.y - ST.H * 0.05) / (ST.H * 0.4), 0, 1);
      g.globalAlpha = a;
      if (k === 'leaf') { g.save(); g.translate(p.x, p.y); g.rotate(p.ph); g.beginPath(); g.ellipse(0, 0, p.s * 1.6, p.s * 0.7, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      else if (k === 'drip') { if (p.wait <= 0) g.fillRect(p.x, p.y, 1.2, 4); }
      else if (k === 'sparkle') { const s = p.s * 2 * Math.abs(Math.sin(p.ph)); g.fillRect(p.x - s, p.y - 0.5, s * 2, 1); g.fillRect(p.x - 0.5, p.y - s * 0.6, 1, s * 1.2); }
      else { g.beginPath(); g.arc(p.x, p.y, p.s * (k === 'firefly' ? 1.3 : 1), 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  }

  // 立绘画框边缘（头发、武器被裁切处）羽化，免得在背景上出现硬边
  const FEATHER = new WeakMap();
  function featherOf(img) {
    let f = FEATHER.get(img); if (f) return f;
    const w = img.width, h = img.height;
    f = D.createElement('canvas'); f.width = w; f.height = h;
    const g = f.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const ft = Math.max(2, Math.round(h * 0.1)), fs = Math.max(2, Math.round(w * 0.07));
    g.fillStyle = lin(g, 0, 0, 0, ft, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, w, ft);
    g.fillStyle = lin(g, 0, 0, fs, 0, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, fs, h);
    g.fillStyle = lin(g, w, 0, w - fs, 0, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(w - fs, 0, fs, h);
    if (img.className) f.className = img.className;
    FEATHER.set(img, f); return f;
  }
  const DIM = new WeakMap();
  function dimOf(img) {
    let d = DIM.get(img); if (d) return d;
    d = D.createElement('canvas'); d.width = img.width; d.height = img.height;
    const g = d.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(8,12,34,.55)'; g.fillRect(0, 0, d.width, d.height);
    DIM.set(img, d); return d;
  }
  function drawActor(g, a, t) {
    const img = a.img; if (!img || a.alpha <= 0.01) return;
    const W = ST.W, pix = !!a.pix;
    let pw = Math.min(W * 0.66, 300), s = pw / img.width;
    if (pix) { s = Math.max(2, Math.floor(pw / img.width)); pw = img.width * s; }
    const ph = img.height * s * (1 + 0.006 * Math.sin(t / 900 + (a.side === 'R' ? 2 : 0))); // 呼吸
    const k = 0.94 + 0.06 * a.lit;
    const cx = (a.side === 'L' ? W * 0.27 : W * 0.73) + a.dx * W;
    const bottom = ST.boxTop + 44 - a.hop * 8;
    g.save();
    g.globalAlpha = a.alpha;
    g.translate(cx, bottom); g.scale(a.side === 'R' ? -k : k, k);
    g.imageSmoothingEnabled = !pix;
    const x = -pw / 2, y = -ph;
    if (a.lit < 0.99) g.drawImage(dimOf(img), x, y, pw, ph);
    if (a.lit > 0.01) { g.globalAlpha = a.alpha * a.lit; g.drawImage(img, x, y, pw, ph); }
    g.restore();
  }
  function frame() {
    ST.raf = 0;
    const t = now(), dt = Math.min(0.05, (t - ST.lastT) / 1000); ST.lastT = t;
    // 补间
    if (ST.tw.length) {
      const keep = [];
      for (const w of ST.tw) { const u = clamp((t - w.t0) / w.ms, 0, 1); w.o[w.k] = w.from + (w.to - w.from) * w.ease(u); if (u < 1) keep.push(w); else w.res(); }
      ST.tw = keep;
    }
    if (!ST.open) { if (ST.tw.length) kick(); return; }
    // 打字机
    if (ST.typing) {
      const cps = (typeof OPT !== 'undefined' && OPT.fast) ? 110 : 38;
      const n = Math.min(ST.full.length, Math.floor((t - ST.tStart) / 1000 * cps) + 1);
      if (n !== ST.shown) { ST.shown = n; (ST.line && ST.line.narr ? narrText : textEl).textContent = ST.full.slice(0, n); }
      if (n >= ST.full.length) finishTyping();
    } else if (ST.auto && ST.lines && ST.autoAt && t >= ST.autoAt) { ST.autoAt = 0; advance(); }
    // 收场：选项视窗开着就继续等
    if (ST.closing) { const m = D.getElementById('modal'); if (m && !m.hidden) { ST.closeAt = t + 120; ST.skipping = false; } else if (t >= ST.closeAt) { ST.closing = false; doClose(); } }
    // 镜头
    ST.zoom += (ST.zoomT - ST.zoom) * (1 - Math.exp(-dt / 1.3));
    ST.lb += (ST.lbT - ST.lb) * (1 - Math.exp(-dt / 0.12));
    ST.flash = Math.max(0, ST.flash - dt * 2.6); ST.shake = Math.max(0, ST.shake - dt * 2.2);
    for (const side of ['L', 'R']) { const a = ST.slots[side]; if (a) stepActor(a, dt); }
    ST.exiting = ST.exiting.filter(a => { stepActor(a, dt); return a.alpha > 0.01; });
    stepParts(dt);
    render(t);
    kick();
  }
  function stepActor(a, dt) {
    const r = 1 - Math.exp(-dt / 0.09);
    a.lit += (a.litT - a.lit) * r; a.alpha += (a.alphaT - a.alpha) * (1 - Math.exp(-dt / 0.12));
    a.dx += (a.dxT - a.dx) * (1 - Math.exp(-dt / 0.11)); a.hop = Math.max(0, a.hop - dt * 4);
  }
  function render(t) {
    const g = ctx, W = ST.W, H = ST.H;
    g.setTransform(ST.dpr, 0, 0, ST.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const sh = ST.shake * ST.shake * 12, ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    const fx = W * ST.focus, fy = H * 0.42;
    // 背景
    g.save(); g.translate(ox, oy);
    if (ST.mode === 'scene' && ST.bg) {
      const z = 1.03 * (1 + (ST.zoom - 1) * 0.7) * (ST.card ? 1 + (t - ST.t0) / 60000 : 1);
      const bw = ST.bg.width, bh = ST.bg.height, s0 = Math.max(W / bw, H / bh), dw = bw * s0, dh = bh * s0, x0 = (W - dw) / 2, y0 = (H - dh) / 2;
      g.imageSmoothingEnabled = !ST.bg.pixel;
      g.drawImage(ST.bg, fx + (x0 - fx) * z, fy + (y0 - fy) * z, dw * z, dh * z);
      g.imageSmoothingEnabled = true;
    } else if (ST.mode === 'overlay') {
      g.fillStyle = 'rgba(4,6,18,.28)'; g.fillRect(-20, -20, W + 40, H + 40);
      g.fillStyle = lin(g, 0, H * 0.35, 0, H, [[0, 'rgba(4,6,18,0)'], [1, 'rgba(4,6,18,.78)']]); g.fillRect(-20, H * 0.35, W + 40, H * 0.66);
    }
    if (ST.mode === 'scene') drawParts(g);
    // 立绘（随镜头推近）
    const zp = 1 + (ST.zoom - 1) * 1.25;
    g.translate(fx, fy); g.scale(zp, zp); g.translate(-fx, -fy);
    for (const a of ST.exiting) drawActor(g, a, t);
    const L = ST.slots.L, R = ST.slots.R;
    const order = [L, R].filter(Boolean).sort((a, b) => a.lit - b.lit);
    for (const a of order) drawActor(g, a, t);
    g.restore();
    // 遮幅
    if (ST.lb > 0.005) {
      const top = ST.lb * H * 0.1, bot = ST.lb * Math.max(H * 0.2, (narrEl.offsetHeight || 0) + 34);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, top); g.fillRect(0, H - bot, W, bot);
      g.fillStyle = lin(g, 0, H - bot - 40, 0, H - bot, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.6)']]); g.fillRect(0, H - bot - 40, W, 40);
    }
    if (ST.flash > 0) { g.fillStyle = `rgba(255,250,240,${Math.min(1, ST.flash)})`; g.fillRect(0, 0, W, H); }
    if (ST.dim > 0) { g.fillStyle = `rgba(0,0,0,${ST.dim})`; g.fillRect(0, 0, W, H); }
    if (ST.black > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(1, ST.black)})`; g.fillRect(0, 0, W, H); }
  }

  // =====================================================================
  // 开场 / 收场
  // =====================================================================
  function setScene(info) {
    ST.mode = info.mode; ST.theme = info.theme; ST.night = !!info.night; ST.key = info.key;
    ST.hd = isHD();
    ST.bg = info.mode === 'scene' ? backdrop(info.theme, info.night, ST.H / ST.W, ST.hd) : null;
    spawnParts();
  }
  function resetStage() {
    ST.slots = { L: null, R: null }; ST.exiting = []; ST.last = null; ST.zoom = ST.zoomT = 1; ST.focus = 0.5; ST.lb = ST.lbT = 0; ST.flash = ST.shake = 0; ST.dim = 0;
    boxEl.classList.add('off'); narrEl.classList.remove('on'); nextEl.classList.remove('on'); nameEl.textContent = ''; textEl.textContent = ''; narrText.textContent = '';
  }
  async function openScene(info) {
    ensureDom();
    const tok = ++ST.token;
    root.hidden = false; root.classList.add('fade');
    measure(); setScene(info); resetStage();
    ST.open = true; ST.t0 = now();
    ST.black = info.mode === 'scene' ? 1 : 0;
    kick();
    void root.offsetWidth; root.classList.remove('fade');
    if (info.mode === 'scene') { await wait(info.fromBlack ? 0 : 200); if (tok === ST.token) tween(ST, 'black', 0, 650); }
  }
  async function switchScene(info) {
    const tok = ++ST.token;
    if (ST.mode === info.mode && ST.theme === info.theme && ST.key === info.key) { if (ST.black > 0) tween(ST, 'black', 0, 600); return; }
    if (ST.black < 0.99) await tween(ST, 'black', 1, 260);
    if (tok !== ST.token) return;
    setScene(info); resetStage();
    tween(ST, 'black', info.mode === 'scene' ? 0 : 0, 500);
  }
  function scheduleClose(ms) { ST.closing = true; ST.closeAt = now() + (ms == null ? 120 : ms); kick(); }
  function doClose() {
    const tok = ++ST.token;
    boxEl.classList.add('off'); btnsEl.classList.add('off'); narrEl.classList.remove('on');
    root.classList.add('fade');
    setTimeout(() => {
      if (tok !== ST.token) return;
      ST.open = false; ST.skipping = false; root.hidden = true; root.classList.remove('fade'); cardEl.classList.remove('on'); cardEl.innerHTML = '';
      ST.slots = { L: null, R: null }; ST.exiting = []; ST.parts = []; ST.bg = null; ST.mode = null; ST.key = null;
    }, 380);
  }

  // =====================================================================
  // 对白
  // =====================================================================
  function deepHas(list, l, d) {
    if (!Array.isArray(list) || (d || 0) > 5) return false;
    for (const x of list) {
      if (x === l) return true;
      if (!Array.isArray(x)) continue;
      if (x[0] === 'if' && (deepHas(x[2], l, (d || 0) + 1) || deepHas(x[3], l, (d || 0) + 1))) return true;
      if (x[0] === '?') for (const o of x[2] || []) if (o && deepHas(o.say, l, (d || 0) + 1)) return true;
    }
    return false;
  }
  function contextOf(lines) {
    const l0 = lines[0];
    const end = D.getElementById('ending');
    if (end && !end.hidden) return { mode: 'scene', theme: 'dawn', key: 'ending' };
    const Bd = typeof B !== 'undefined' && B && B.def;
    if (Bd && (deepHas(Bd.intro, l0) || deepHas(Bd.outro, l0))) return { mode: 'scene', theme: themeOf(Bd), night: nightOf(Bd), key: 'stage:' + (Bd.id || Bd.no) };
    if (ST.open && ST.mode) return { mode: ST.mode, theme: ST.theme, night: ST.night, key: ST.key }; // 同一段剧情（选项后的对白等）沿用
    const bat = D.getElementById('battle');
    if (Bd && bat && !bat.hidden) return { mode: 'overlay', theme: null, key: 'battle' };
    return { mode: 'scene', theme: themeFromText(lines) || 'castle', key: 'misc' };
  }
  function portraitOf(pid, expr, cachedOnly) {
    if (!pid) return null;
    const enemy = pid.startsWith('enemy:'), hd = ST.hd;
    const tier = enemy || typeof heroTier !== 'function' ? undefined : heroTier(pid);
    const path = enemy || typeof heroPath !== 'function' ? undefined : heroPath(pid);
    const e = expr === 'default' ? null : expr;
    let img = null;
    try {
      if (typeof getPortraitScene === 'function') img = getPortraitScene(pid, { hd, bg: false, expr: e, tier, path, cachedOnly });
      else if (cachedOnly) return null;
      else if (hd && typeof getPortraitHD === 'function') img = getPortraitHD(pid, undefined, tier, path, { bg: false });
    } catch (er) { img = null; }
    if (cachedOnly) return img && img.width ? img : null;
    if (!img && typeof portraitCanvas === 'function') { try { img = portraitCanvas(pid, 76); } catch (er) { img = null; } }
    return img && img.width ? img : null;
  }
  // 预先建好接下来几句的立绘（空闲时，避免点下一句时卡顿）
  let warmQ = [];
  function warmLines(lines, from, max) {
    const start = !warmQ.length, seen = new Set(warmQ.map(a => a.join('|')));
    const flat = []; (function walk(list, d) { for (const l of list || []) { if (!Array.isArray(l) || d > 3) continue; if (l[0] === 'if') { walk(l[2], d + 1); walk(l[3], d + 1); } else if (l[0] === '?') { for (const o of l[2] || []) walk(o && o.say, d + 1); } else if (l[0] !== 'do') flat.push(l); } })(lines.slice(from), 0);
    for (const l of flat.slice(0, max || 10)) { const p = parseLine(l); const k = p.pid + '|' + p.expr; if (p.pid && !p.narr && !seen.has(k)) { seen.add(k); warmQ.push([p.pid, p.expr]); } }
    const idle = G.requestIdleCallback ? f => G.requestIdleCallback(f, { timeout: 700 }) : f => setTimeout(f, 80);
    const step = () => {
      let a; while ((a = warmQ.shift()) && portraitOf(a[0], a[1], true)) { /* 已快取 */ }
      if (!a) return;
      if (ST.open && !isAuto()) portraitOf(a[0], a[1]);
      if (warmQ.length) idle(step);
    };
    if (start && warmQ.length) idle(step);
  }
  function place(p) {
    let side = null;
    for (const s of ['L', 'R']) if (ST.slots[s] && ST.slots[s].pid === p.pid) side = s;
    if (!side) {
      const pref = p.enemy ? 'R' : 'L', other = pref === 'L' ? 'R' : 'L';
      const occ = ST.slots[pref], oth = ST.slots[other];
      if (!occ) side = pref;
      else if (occ.pid !== ST.last) side = pref;
      else if (!oth || oth.enemy === p.enemy || oth.pid !== ST.last) side = other;
      else side = pref;
      const old = ST.slots[side];
      if (old) { old.alphaT = 0; old.dxT = side === 'L' ? -0.45 : 0.45; old.litT = 0; ST.exiting.push(old); }
      ST.slots[side] = { pid: p.pid, enemy: p.enemy, side, img: null, expr: null, pix: !ST.hd, lit: 1, litT: 1, alpha: 0, alphaT: 1, dx: side === 'L' ? -0.4 : 0.4, dxT: 0, hop: 0 };
    }
    const a = ST.slots[side];
    if (a.expr !== p.expr || !a.img) {
      let img = portraitOf(p.pid, p.expr, true);
      if (!img && a.img) { // 新表情还没画好：先沿用目前的立绘，稍后换上（点击不卡顿）
        const want = p.expr;
        a.expr = want;
        setTimeout(() => { if (!ST.open || a.expr !== want) return; const im = portraitOf(p.pid, want); if (im && a.expr === want) { a.img = ST.hd ? featherOf(im) : im; if (want !== 'default') a.hop = 1; } }, 90);
        a.alphaT = 1; a.dxT = 0;
        return side;
      }
      if (!img) img = portraitOf(p.pid, p.expr);
      if (img) { if (a.img && a.expr !== p.expr && p.expr !== 'default') a.hop = 1; a.img = ST.hd ? featherOf(img) : img; a.pix = !ST.hd && !(img.className || '').includes('hd'); }
      a.expr = p.expr;
      if (!a.img) { ST.slots[side] = null; return null; }
    }
    a.alphaT = 1; a.dxT = 0;
    return side;
  }
  function showLine(i) {
    const l = ST.lines[i];
    const p = parseLine(Array.isArray(l) ? l : ['旁白', String(l)]);
    ST.line = p; ST.autoAt = 0;
    btnsEl.classList.remove('off');
    if (p.narr) {
      ST.lbT = 1; boxEl.classList.add('off'); narrEl.classList.add('on');
      for (const s of ['L', 'R']) if (ST.slots[s]) { ST.slots[s].alphaT = 0; }
      ST.zoomT = 1.02; ST.focus = 0.5;
      narrText.textContent = '';
    } else {
      ST.lbT = 0; narrEl.classList.remove('on'); boxEl.classList.remove('off');
      const side = p.pid ? place(p) : null;
      for (const s of ['L', 'R']) { const a = ST.slots[s]; if (a) { a.litT = s === side ? 1 : 0; if (s !== side) a.alphaT = 1; } }
      nameEl.textContent = p.who; nameEl.className = 'scn-name' + (p.enemy ? ' enemy' : '') + (side === 'R' ? ' right' : '');
      textEl.textContent = '';
      ST.last = p.pid || p.who;
      ST.focus = side === 'L' ? 0.36 : side === 'R' ? 0.64 : 0.5;
      ST.zoomT = p.push ? 1.07 : 1;
      if (p.shock) { ST.shake = 1; ST.flash = 0.75; sfxs('select'); }
      else if (p.rage) ST.shake = Math.max(ST.shake, 0.55);
    }
    ST.full = p.text; ST.shown = 0; ST.typing = true; ST.tStart = now();
    nextEl.classList.remove('on');
    kick();
  }
  function finishTyping() {
    ST.typing = false; ST.shown = ST.full.length;
    (ST.line && ST.line.narr ? narrText : textEl).textContent = ST.full;
    nextEl.classList.add('on');
    if (ST.auto) ST.autoAt = now() + 1000 + Math.min(2600, ST.full.length * 45);
  }
  function advance() {
    if (!ST.lines) return;
    ST.i++;
    if (ST.i >= ST.lines.length) { endSeg(); return; }
    sfxs('select'); showLine(ST.i);
  }
  function onTap() {
    if (ST.card) { ST.card.skip(); return; }
    if (!ST.lines) return;
    if (ST.black > 0.6) return; // 淡入中
    if (ST.typing) { finishTyping(); return; }
    advance();
  }
  function endSeg() {
    const res = ST.res; ST.lines = null; ST.res = null; ST.line = null; ST.typing = false; ST.autoAt = 0;
    boxEl.classList.add('off'); narrEl.classList.remove('on'); nextEl.classList.remove('on'); ST.lbT = 0; ST.zoomT = 1;
    scheduleClose(120);
    if (res) res();
  }
  async function runSeg(lines, res) {
    const info = contextOf(lines);
    ST.closing = false;
    if (!ST.open) await openScene(info);
    else { root.classList.remove('fade'); await switchScene(info); }
    ST.lines = lines; ST.i = 0; ST.res = res;
    warmLines(lines, 1);
    showLine(0);
  }
  // battle.js dialogPlain 的接手点：回传 Promise；无法处理时回传 null（沿用旧对话框）
  function SCN_dialog(lines) {
    if (isAuto() || !lines || !lines.length) return Promise.resolve();
    try { ensureDom(); } catch (e) { return null; }
    if (ST.skipping && ST.open) { scheduleClose(120); return Promise.resolve(); } // 已按「跳过」：本段剧情剩下的对白一并略过
    return new Promise(res => {
      runSeg(lines, res).catch(e => { if (G.console) console.warn('scenes', e); ST.lines = null; doClose(); res(); });
    });
  }

  // =====================================================================
  // 章节标题卡：「第 N 关 · 标题」+ 副标题，背后是本关背景的暗影
  // =====================================================================
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function SCN_chapterCard(stg) {
    if (isAuto() || !stg) return Promise.resolve();
    try { ensureDom(); } catch (e) { return null; }
    return new Promise(res => {
      (async () => {
        const info = { mode: 'scene', theme: themeOf(stg), night: nightOf(stg), key: 'stage:' + (stg.id || stg.no), fromBlack: true };
        if (ST.open) { ++ST.token; ST.closing = false; root.classList.remove('fade'); }
        root.hidden = false; measure();
        setScene(info); resetStage();
        ST.open = true; ST.t0 = now(); ST.black = 1; btnsEl.classList.add('off');
        const camp = typeof curCampaign === 'function' ? curCampaign() : null;
        const no = stg.secretStage ? '隐藏关' : `第 ${stg.no} 关`;
        const top = stg.part || (camp ? (camp.full || camp.title) : '');
        cardEl.innerHTML = `${top ? `<div class="cc-part">${esc(top)}</div>` : ''}<div class="cc-main" style="font-size:${Math.max(14, Math.min(26, Math.floor((ST.W - 40) / (no.length + String(stg.title).length + 4) - 4.5)))}px">「${esc(no)} · ${esc(stg.title)}」</div><div class="cc-sub">${esc(THEME_NAME[info.theme] || '')}</div>`;
        warmQ = []; warmLines(stg.intro || [], 0, 14);
        let skip;
        const skipped = new Promise(r => { skip = r; });
        ST.card = { skip: () => skip() };
        kick();
        await wait(60);
        tween(ST, 'black', 0.72, 900);
        cardEl.classList.add('on');
        await Promise.race([wait(2300), skipped]);
        cardEl.classList.remove('on');
        await Promise.race([tween(ST, 'black', 1, 420), wait(450)]);
        ST.card = null;
        cardEl.innerHTML = '';
        scheduleClose(80); // 若紧接着开场对白，会在同一帧内接手
        res();
      })().catch(e => { if (G.console) console.warn('scenes card', e); ST.card = null; doClose(); res(); });
    });
  }
  const THEME_NAME = { castle: '— 城 堡 —', throne: '— 王 座 之 间 —', forest: '— 森 林 —', village: '— 村 落 —', battlefield: '— 战 场 —', nightcamp: '— 夜 营 —', snow: '— 雪 原 —', desert: '— 沙 漠 —', cave: '— 洞 窟 —', demon: '— 魔 域 —', sea: '— 海 港 —', dawn: '— 黎 明 —' };

  G.SCN_dialog = SCN_dialog;
  G.SCN_chapterCard = SCN_chapterCard;
  G.SCN_exprOf = line => parseLine(line).expr;
  G.SCN_themeOf = themeOf;
  G.SCN_backdrop = (theme, night, hd) => backdrop(theme, night, 844 / 390, hd !== false);
  G.SCN_THEMES = Object.keys(PAINT);
  G.SCN_debug = () => ({ open: ST.open, mode: ST.mode, theme: ST.theme, i: ST.i, n: ST.lines ? ST.lines.length : 0, typing: ST.typing, card: !!ST.card, slots: ['L', 'R'].map(k => ST.slots[k] && ST.slots[k].pid + ':' + ST.slots[k].expr) });
})(typeof window !== 'undefined' ? window : this);
