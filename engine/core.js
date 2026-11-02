/* ===================== core: utils, audio, mode manager ===================== */
'use strict';
const U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  irand: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  smooth: t => t * t * (3 - 2 * t),
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInCubic: t => t * t * t,
  easeInOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
  mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; },
  rgba(h, a) { const [r, g, b] = U.hex2rgb(h); return `rgba(${r},${g},${b},${a})`; },
  mix(h1, h2, t) {
    const a = U.hex2rgb(h1), b = U.hex2rgb(h2);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },
  // size a canvas to its CSS box at a capped device pixel ratio; returns scale
  fit(canvas, cap = 2) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w: r.width, h: r.height, dpr };
  },
  store: {
    get(k, d) { try { const v = localStorage.getItem('toyhouse:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('toyhouse:' + k, JSON.stringify(v)); } catch (e) { } }
  },
  today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
};

/* ---------- Web Audio synth: everything generated live ---------- */
const SFX = (() => {
  let ctx = null, master = null, bus = null, noiseBuf = null;
  let muted = U.store.get('muted', false);
  // T0 shifts scheduling when replaying a recorded timeline into an OfflineAudioContext
  let T0 = 0, offline = false, rec = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC(); chain(muted);
  }
  function chain(m) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = m ? 0 : 0.85;
    bus = ctx.createGain(); bus.gain.value = 1;
    bus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => offline || (ctx && ctx.state === 'running');
  const now = () => ctx.currentTime + T0;
  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  }
  // tone: oscillator with optional pitch glide
  function tone(o = {}) {
    if (rec) { rec.push(['tone', rec.clock(), o]); return; }
    if (!ok()) return;
    const t = now() + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.glide || o.dur || .2));
    if (o.detune) osc.detune.value = o.detune;
    env(g, t, o.a || .005, o.vol == null ? .25 : o.vol, o.dur || .15, o.rel || .08);
    let last = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); last = f; }
    osc.connect(g); last.connect(o.dest || bus);
    osc.start(t); osc.stop(t + (o.dur || .15) + (o.rel || .08) + .05);
    return osc;
  }
  // filtered noise burst
  function noise(o = {}) {
    if (rec) { rec.push(['noise', rec.clock(), o]); return; }
    if (!ok()) return;
    const t = now() + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur || .2));
    f.Q.value = o.q == null ? 1 : o.q;
    const g = ctx.createGain();
    env(g, t, o.a || .003, o.vol == null ? .2 : o.vol, o.dur || .1, o.rel || .05);
    src.connect(f); f.connect(g); g.connect(o.dest || bus);
    src.start(t, Math.random() * 1.5); src.stop(t + (o.dur || .1) + (o.rel || .05) + .05);
  }
  // looping ambient bed: returns {set(vol), stop()}
  function bed(o = {}) {
    if (rec) { const id = rec.beds++; rec.push(['bed', rec.clock(), o, id]); return { set(v, time = .5) { rec.push(['bedset', rec.clock(), v, time, id]); }, freq() { }, stop() { } }; }
    if (!ctx) return null;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.f || 600; f.Q.value = o.q || .7;
    const g = ctx.createGain(); g.gain.value = 0;
    let lfo = null;
    if (o.lfo) {
      lfo = ctx.createOscillator(); lfo.frequency.value = o.lfo;
      const lg = ctx.createGain(); lg.gain.value = o.lfoDepth || 200;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    }
    src.connect(f); f.connect(g); g.connect(bus); src.start();
    return {
      set(v, time = .5) { if (!ctx) return; g.gain.cancelScheduledValues(now()); g.gain.setTargetAtTime(v, now(), time / 3); },
      freq(v) { f.frequency.setTargetAtTime(v, ctx.currentTime, .1); },
      stop() { try { g.gain.setTargetAtTime(0, ctx.currentTime, .1); src.stop(ctx.currentTime + .6); if (lfo) lfo.stop(ctx.currentTime + .6); } catch (e) { } }
    };
  }
  function chord(freqs, o = {}) { freqs.forEach((f, i) => tone(Object.assign({}, o, { f, delay: (o.delay || 0) + (o.spread || 0) * i }))); }
  function setMuted(m) {
    muted = m; U.store.set('muted', m);
    if (master) master.gain.setTargetAtTime(m ? 0 : .85, ctx.currentTime, .05);
  }
  // record every sound against a simulated clock, then render the whole timeline offline (video export)
  function startRecord(clock) { rec = []; rec.beds = 0; rec.clock = clock; }
  async function renderOffline(events, dur, sr = 44100) {
    rec = null; const save = { ctx, master, bus, noiseBuf };
    ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr); offline = true; chain(false);
    const beds = {};
    for (const e of events) {
      T0 = e[1];
      if (e[0] === 'tone') tone(e[2]); else if (e[0] === 'noise') noise(e[2]);
      else if (e[0] === 'bed') beds[e[3]] = bed(e[2]); else if (e[0] === 'bedset' && beds[e[4]]) beds[e[4]].set(e[2], e[3]);
    }
    T0 = 0;
    const buf = await ctx.startRendering();
    offline = false; ({ ctx, master, bus, noiseBuf } = save);
    return buf;
  }
  return { init, tone, noise, bed, chord, setMuted, startRecord, renderOffline, get recording() { return rec; }, get muted() { return muted; }, get ctx() { return ctx; }, get ready() { return !!rec || ok(); } };
})();

/* ---------- page-level helpers ---------- */
const Toy = {
  reduced: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches,
  toast(msg, ms = 1800) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), ms);
  }
};
