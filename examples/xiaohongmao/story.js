  /* ===================== 小红帽 · story ===================== */
  const BOOK = {
    title: '小红帽', sub: '一本会站起来的纸艺立体书', coverHex: 0x8E2A26, spineHex: 0x6E1F1C, deskPiece: 'basketF',
    endHint: '全书完 · 小红帽平安到家啦 · 找找每页藏起来的星星吧', filmEnd: 27.3
  };
  const C = { ink: '#2E2A26', cream: '#F6EBD3', gold: '#D9A845', coral: '#D9534A', mint: '#9CCFB8', red: '#C8372D', green: '#2F5A3C' };
  const STORY = [
    null,
    { title: '出发', tab: '出发', hint: '拉动纸舌头让小红帽出门 · 点点妈妈、母鸡和小门',
      text: ['小红帽要去森林那头看望生病的外婆。', '妈妈说：“一直走小路，', '千万不要乱跑哦。”'] },
    { title: '森林', tab: '探头', hint: '拉动纸舌头看看大树后面是谁 · 点点松鼠和小鸟',
      text: ['森林里，一只大灰狼从树后探出头来：', '“小姑娘，你要去哪儿呀？”', '“我去看外婆！”'] },
    { title: '花田', tab: '', dial: '转动雏菊 ↻', hint: '转动右下角的雏菊转盘让花开放 · 点开好的花帮小红帽摘花',
      text: ['狼说：“你看那边的花多漂亮！”', '小红帽摘呀摘，', '忘了外婆还在家里等她。'] },
    { title: '外婆家', tab: '露馅', hint: '点床上的“外婆”问问题 · 点衣柜看看 · 拉纸舌头',
      text: ['“外婆，你的耳朵怎么这么大？”', '“为了更清楚地听你说话呀！”', '“外婆，你的眼睛怎么这么大……”'] },
    { title: '团聚', tab: '赶跑', hint: '拉动纸舌头把大灰狼赶出门 · 点点每个人和猫咪',
      text: ['樵夫赶来，大灰狼吓得夹着尾巴逃回了森林。', '小红帽说：“以后我再也不', '离开小路了。”'] }
  ];
  const PAGE = [null,
    { a: '#EEF2DC', b: '#D5E4BE', line: 'rgba(70,100,60,.35)', star: 'rgba(200,60,50,.55)', deco: 'flowers', ink: '#7FA36A' },
    { a: '#3E6B47', b: '#2C4E36', line: 'rgba(240,230,190,.3)', star: 'rgba(240,210,140,.6)', deco: 'leaves', ink: '#9CC48A' },
    { a: '#F6EDC8', b: '#E2EBB4', line: 'rgba(120,110,50,.3)', star: 'rgba(200,60,50,.5)', deco: 'flowers', ink: '#D9534A' },
    { a: '#F4E2D2', b: '#E9C9B4', line: 'rgba(140,70,50,.3)', star: 'rgba(170,60,50,.5)', deco: 'paper', ink: '#C8574A' },
    { a: '#F0D9B5', b: '#DDB07E', line: 'rgba(120,70,30,.3)', star: 'rgba(170,60,40,.5)', deco: 'paper', ink: '#B5523F' }
  ];
  const VOICES = {
    girl: { f: 760, type: 'square', lp: 2400, gap: .07 }, mom: { f: 540, type: 'triangle', gap: .09 },
    wolf: { f: 150, type: 'sawtooth', lp: 900, spread: .7, gap: .1, vol: .06 }, gran: { f: 440, type: 'triangle', spread: .25, gap: .11 },
    cutter: { f: 230, type: 'square', lp: 1200, gap: .09 }
  };

  /* ---------------- printed pages + cover ---------------- */
  function flowerDot(g, x, y, r, col, eye = '#F2C14E') { g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .8, 0, 7); g.fill(); } g.fillStyle = eye; g.beginPath(); g.arc(x, y, r * .6, 0, 7); g.fill(); }
  function pageDeco(g, s, side, rnd) {
    const d = PAGE[s].deco, ink = PAGE[s].ink;
    g.save();
    if (d === 'leaves') for (let i = 0; i < 52; i++) {
      const x = rnd() * PG_W, y = rnd() * PG_H, a = rnd() * 7, l = 14 + rnd() * 22;
      g.globalAlpha = .14 + rnd() * .14; g.translate(x, y); g.rotate(a); g.fillStyle = ink; g.beginPath(); g.ellipse(0, 0, l, l * .42, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,40,20,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-l, 0); g.lineTo(l, 0); g.stroke(); g.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (d === 'flowers') for (let i = 0; i < 40; i++) { g.globalAlpha = .18 + rnd() * .14; flowerDot(g, rnd() * PG_W, rnd() * PG_H, 5 + rnd() * 6, [ink, '#FFFFFF', '#E9B44C', '#8FB0D8'][i % 4]); }
    if (d === 'paper') for (let y = 40; y < PG_H; y += 90) for (let x = (y / 90 % 2) * 60 + 30; x < PG_W; x += 120) {
      g.globalAlpha = .22; g.fillStyle = '#7FA36A'; g.beginPath(); g.ellipse(x - 12, y + 6, 9, 4, -.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 12, y + 6, 9, 4, .5, 0, 7); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - 2, y - 2, 3, 0, 7); g.fill();
    }
    g.restore();
  }
  function linen(g, w, h, base) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.globalAlpha = .07; g.fillStyle = '#fff'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h); g.globalAlpha = 1;
  }
  function cover() {
    const c = mk(PG_W, PG_H), g = c.getContext('2d');
    linen(g, PG_W, PG_H, '#9E2B25');
    // gold vines in the corners
    g.strokeStyle = 'rgba(232,196,110,.55)'; g.lineWidth = 3;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.save(); g.translate(sx > 0 ? 70 : PG_W - 70, sy > 0 ? 70 : PG_H - 70); g.scale(sx, sy);
      g.beginPath(); g.moveTo(0, 140); g.quadraticCurveTo(10, 10, 140, 0); g.stroke();
      for (let k = 0; k < 5; k++) { const t = k / 5, x = 10 + t * 120, y = 120 - t * 115; g.fillStyle = 'rgba(232,196,110,.6)'; g.beginPath(); g.ellipse(x, y, 10, 4, -.7, 0, 7); g.fill(); }
      g.restore();
    }
    const cx = PG_W / 2, cy = 760, R = 380;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
    const gr = g.createRadialGradient(cx, cy - 80, 40, cx, cy, R); gr.addColorStop(0, '#F6EBD3'); gr.addColorStop(1, '#DCC9A0'); g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    const s = R * 2 * .96 / Math.max(IM.cover.width, IM.cover.height); g.drawImage(IM.cover, cx - IM.cover.width * s / 2, cy - IM.cover.height * s / 2, IM.cover.width * s, IM.cover.height * s);
    g.restore();
    g.strokeStyle = C.gold; g.lineWidth = 8; g.beginPath(); g.arc(cx, cy, R + 6, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R + 22, 0, 7); g.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; star4(g, cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22), 10, C.gold); }
    g.lineWidth = 5; g.strokeRect(50, 50, PG_W - 100, PG_H - 100);
    g.font = `128px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#5A1512'; g.fillText(BOOK.title, PG_W / 2 + 5, 205); g.fillStyle = '#F6DB98'; g.fillText(BOOK.title, PG_W / 2, 200);
    g.font = `36px ${FONT}`; g.fillStyle = '#F2D48A'; g.fillText(BOOK.sub, PG_W / 2, 300);
    g.fillText('· 翻开它 ·', PG_W / 2, PG_H - 130);
    grain(g, PG_W, PG_H, .06);
    return c;
  }
  function backCover() { const c = mk(256, 360), g = c.getContext('2d'); linen(g, 256, 360, '#9E2B25'); return c; }

  /* ---------------- extra paper bits ---------------- */
  function leafTex(col, vein) {
    const c = mk(64, 64), g = c.getContext('2d'); g.translate(32, 32); g.fillStyle = col;
    g.beginPath(); for (let k = 0; k <= 16; k++) { const t = k / 16 * Math.PI * 2, r = 26 * (.75 + .25 * Math.abs(Math.sin(t * 3))); g.lineTo(Math.cos(t) * r * .55, Math.sin(t) * r); } g.closePath(); g.fill();
    g.strokeStyle = vein; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 26); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  function beamTex() { const c = mk(64, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,248,220,.9)'); gr.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = gr; const h = g.createLinearGradient(0, 0, 64, 0); g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in'; h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = h; g.fillRect(0, 0, 64, 256); return new THREE.CanvasTexture(c); }
  // leaves drifting down a layer
  function fallingLeaves(ly, n, seed) {
    const rnd = U.mulberry32(seed), texs = [leafTex('#D9822B', '#8A4A16'), leafTex('#E8B33C', '#9A6A16'), leafTex('#7FAE5A', '#3E6A2C'), leafTex('#C8572D', '#7A2A12')], ms = [];
    for (let i = 0; i < n; i++) { const right = i % 2 === 1, m = new THREE.Mesh(unit(), new THREE.MeshStandardMaterial({ map: texs[i % 4], transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .8 })); (right ? ly.R : ly.Lg).add(m); m.userData = { right, x: (right ? 1 : -1) * (.08 + rnd() * .8) * ly.L, sp: .05 + rnd() * .05, ph: rnd(), sw: rnd() * 6 }; ms.push(m); }
    return (dt, t) => ms.forEach(m => { const u = m.userData, a = (t * u.sp + u.ph) % 1; m.position.set(u.x + Math.sin(t * .9 + u.sw) * .04, ly.H * (1.02 - a * 1.05), .03); m.rotation.z = t * 1.3 + u.sw; m.scale.set(.035 * Math.cos(t * 2 + u.sw), .035, 1); m.visible = a < .97; });
  }
  // a butterfly looping over a layer
  function butterflies(sp, ly, list, speed = () => 1) {
    const out = list.map(([u, v, h, ph]) => { const m = piece(ly, 'butterfly', ly.cw * u, ly.ch * v, h, { ax: .5, ay: .5, dz: .05, rim: 4 }); m.userData.b = m.position.clone(); m.userData.ph = ph; m.userData.t = ph; return m; });
    out.forEach(m => sp.taps.push({ m, act: () => { m.userData.burst = 1.2; SFX.tone({ f: 1800, f2: 2600, dur: .08, vol: .04 }); } }));
    sp.fx.push((dt, t) => out.forEach(m => {
      const u = m.userData; u.burst = Math.max(0, (u.burst || 0) - dt); u.t += dt * speed() * (1 + u.burst * 2);
      m.position.set(u.b.x + Math.sin(u.t * .7) * .12, u.b.y + Math.sin(u.t * 1.3) * .05 + u.burst * .03, u.b.z);
      m.scale.set(Math.max(.05, Math.abs(Math.sin(t * 13 + u.ph * 9))), 1, 1);
    }));
    return out;
  }
  function storyExtras() { }
  // golden motes drifting up through a layer
  function motes(sp, ly, rate, cols, o = {}) {
    let acc = 0;
    sp.fx.push(dt => { if (sp.alpha < Math.PI * .9) return; acc += dt * rate; while (acc > 1) { acc--; const right = Math.random() < .5, pnl = right ? ly.R : ly.Lg; emit(pnl, (right ? 1 : -1) * (.05 + Math.random() * .9) * ly.L, (o.y0 || .05) * ly.H + Math.random() * (o.yh || .6) * ly.H, .05, { kind: o.kind || 'glow', vy: o.vy == null ? .03 : o.vy, vx: (Math.random() - .5) * .03, drag: .1, size: o.size || .022, life: 2.5 + Math.random() * 2, twinkle: 6, color: cols[Math.floor(Math.random() * cols.length)], op: o.op || .9 }); } });
  }
  // little sparkles left behind by something that moves
  function trailOf(sp, m, every = .12, col = 0xFFE9A8, size = .02) { let acc = 0; sp.fx.push(dt => { if (sp.alpha < Math.PI * .9 || !m.visible || m.scale.y < .2) return; acc += dt; if (acc > every) { acc = 0; emit(m.parent, m.position.x, m.position.y, m.position.z + .002, { vy: -.02, size, life: .8, twinkle: 12, color: col }); } }); }
  function sunHalo(ly, px, py, r) {
    const lc = local(ly, px, py), rays = addSprite(lc.panel, rayTex, 0xFFE6A0); rays.position.set(lc.x, lc.y, .004); rays.scale.setScalar(r * 4.2); rays.material.color.copy(hot(0xFFE0A0, 1.2));
    const core = addSprite(lc.panel, glowTex, 0xFFE8B0); core.position.set(lc.x, lc.y, .005); core.scale.setScalar(r * 3); core.material.color.copy(hot(0xFFE8B0, 1.6)); core.material.opacity = .9;
    // lens-flare ghosts along the line from the sun towards the middle of the page
    const ghosts = [[.35, .5, 0xFFD27A], [.55, .28, 0xA8E0FF], [.75, .7, 0xFFB0A0], [.9, .18, 0xFFFFFF]].map(([f, s, c]) => { const g = addSprite(lc.panel, softTex, c); g.position.set(lc.x * (1 - f) + (lc.panel === ly.R ? .15 : -.15) * f, lc.y * (1 - f) + ly.H * .25 * f, .006); g.scale.setScalar(r * s * 2); g.material.opacity = .22; return g; });
    return (dt, t) => { rays.rotation.z = t * .08; rays.material.opacity = .45 + .1 * Math.sin(t * .7); core.material.opacity = .8 + .1 * Math.sin(t * 1.3); ghosts.forEach((g, i) => g.material.opacity = .14 + .08 * Math.sin(t * .9 + i)); };
  }

  /* ---------------- pop-up art helpers ---------------- */
  function daySky(g, w, h, top, bot, seed) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); return skySheet(g, w, h, gr, seed); }
  function puffCloud(g, x, y, s) {
    const bits = [[0, 0, 1], [-.95, .3, .68], [.95, .3, .72], [-.45, -.35, .75], [.45, -.42, .82], [0, .35, .8]];
    g.save(); g.fillStyle = 'rgba(60,50,40,.16)'; bits.forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * 60 * s, y + dy * 60 * s + 3, r * 60 * s + 9, 0, 7); g.fill(); });
    g.fillStyle = '#FFFFFF'; bits.forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * 60 * s, y + dy * 60 * s, r * 60 * s + 7, 0, 7); g.fill(); });
    g.fillStyle = '#FBF7EC'; bits.forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * 60 * s, y + dy * 60 * s, r * 60 * s, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(160,190,205,.22)'; g.beginPath(); g.ellipse(x, y + 34 * s, 100 * s, 22 * s, 0, 0, 7); g.fill(); g.restore();
  }
  function hills(g, w, h, y, col, seed, amp = 40, n = 4) {
    const rnd = U.mulberry32(seed), p = P(q => { q.moveTo(0, h); q.lineTo(0, y); const step = w / n; for (let i = 0; i < n; i++) { const a = amp * (.6 + rnd() * .8); q.bezierCurveTo(i * step + step * .3, y - a, i * step + step * .7, y - a, (i + 1) * step, y + (rnd() - .5) * amp * .3); } q.lineTo(w, h); q.closePath(); });
    g.save(); g.strokeStyle = '#FFFBF1'; g.lineWidth = 10; g.lineJoin = 'round'; g.stroke(p); g.fillStyle = col; g.fill(p); g.restore();
  }
  function tinyTrees(g, w, y, n, col, seed) { const rnd = U.mulberry32(seed); for (let i = 0; i < n; i++) { const x = rnd() * w, s = 10 + rnd() * 14; g.fillStyle = '#6B4A2E'; g.fillRect(x - 2, y - s * .3, 4, s * .6); g.fillStyle = col; g.beginPath(); g.arc(x, y - s * .8, s * .7, 0, 7); g.fill(); } }
  function wallpaperSheet(g, w, h, seed) {
    const pc = mk(120, 120), pg = pc.getContext('2d'); pg.fillStyle = '#F3E2CC'; pg.fillRect(0, 0, 120, 120);
    for (const [x, y] of [[30, 30], [90, 90]]) { pg.fillStyle = 'rgba(110,150,90,.55)'; pg.beginPath(); pg.ellipse(x - 9, y + 6, 7, 3, -.5, 0, 7); pg.fill(); pg.beginPath(); pg.ellipse(x + 9, y + 6, 7, 3, .5, 0, 7); pg.fill(); pg.fillStyle = 'rgba(205,95,85,.6)'; pg.beginPath(); pg.arc(x, y, 6, 0, 7); pg.fill(); }
    pg.strokeStyle = 'rgba(180,140,110,.25)'; pg.lineWidth = 2; pg.beginPath(); pg.moveTo(60, 0); pg.lineTo(60, 120); pg.stroke();
    const shape = skySheet(g, w, h, g.createPattern(pc, 'repeat'), seed);
    g.save(); g.clip(shape);
    const wd = g.createLinearGradient(0, h * .86, 0, h); wd.addColorStop(0, '#8A5A36'); wd.addColorStop(1, '#6E4426'); g.fillStyle = wd; g.fillRect(0, h * .86, w, h * .14);
    g.fillStyle = 'rgba(255,240,210,.3)'; g.fillRect(0, h * .86, w, 4);
    g.restore();
  }
  function floorStrip(g, w, h, y, rug) {
    const p = P(q => { q.moveTo(0, h); q.lineTo(0, y); q.lineTo(w, y); q.lineTo(w, h); q.closePath(); });
    g.save(); g.strokeStyle = '#FFFBF1'; g.lineWidth = 12; g.stroke(p); g.clip(p); g.fillStyle = '#9A6A40'; g.fillRect(0, y, w, h - y);
    for (let x = 0; x < w; x += 96) { g.fillStyle = 'rgba(60,35,20,.35)'; g.fillRect(x, y, 3, h - y); g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(x + 4, y, 30, h - y); }
    if (rug) { const cx = w * rug, ry = (h - y) * .42; for (const [r, col] of [[1, '#2F5A3C'], [.82, '#C8372D'], [.64, '#F3E2CC'], [.46, '#C8372D'], [.28, '#F3E2CC']]) { g.fillStyle = col; g.beginPath(); g.ellipse(cx, y + (h - y) * .55, 300 * r, ry * r, 0, 0, 7); g.fill(); } }
    g.restore();
  }
  function bunting(g, x0, x1, y, sag, n) {
    const pt = u => [U.lerp(x0, x1, u), y + Math.sin(u * Math.PI) * sag];
    g.strokeStyle = 'rgba(80,60,40,.6)'; g.lineWidth = 3; g.beginPath(); for (let u = 0; u <= 1.001; u += .05) g.lineTo(...pt(u)); g.stroke();
    for (let i = 0; i < n; i++) { const [xa, ya] = pt((i + .1) / n), [xb, yb] = pt((i + .9) / n), col = ['#C8372D', '#F6EBD3', '#2F5A3C', '#E9B44C'][i % 4]; g.fillStyle = '#FFFBF1'; g.beginPath(); g.moveTo(xa - 3, ya - 2); g.lineTo(xb + 3, yb - 2); g.lineTo((xa + xb) / 2, (ya + yb) / 2 + 52); g.closePath(); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo((xa + xb) / 2, (ya + yb) / 2 + 46); g.closePath(); g.fill(); }
  }
  function meadowStrip(g, w, h, y, seed) {
    grassStrip(g, w, h, y, '#5E8A4E', seed);
    const rnd = U.mulberry32(seed + 9);
    for (let i = 0; i < 70; i++) { const x = 20 + rnd() * (w - 40), yy = y + 18 + rnd() * (h - y - 30); flowerDot(g, x, yy, 6 + rnd() * 5, ['#D9452E', '#FFFFFF', '#5B7BD5', '#F2C14E'][i % 4], i % 4 === 1 ? '#F2C14E' : '#3A2A20'); }
  }

  /* ---------------- pop-up layers (art) ---------------- */
  const ART = {
    1() {
      const B = layerCanvas(LAY.back), M = layerCanvas(LAY.mid), F = layerCanvas(LAY.front), an = {};
      { const [c, g] = B, w = c.width, h = c.height;
        const sh = daySky(g, w, h, '#BCDCEB', '#F5EFD9', 41); g.save(); g.clip(sh);
        an.sun = [w * .84, h * .27];
        const sg = g.createRadialGradient(w * .84, h * .27, 10, w * .84, h * .27, 190); sg.addColorStop(0, 'rgba(255,236,170,.9)'); sg.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
        g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(w * .84, h * .27, 58, 0, 7); g.fill();
        puffCloud(g, w * .16, h * .3, 1); puffCloud(g, w * .6, h * .22, .75); puffCloud(g, w * .73, h * .42, .55);
        hills(g, w, h, h * .7, '#AACB8F', 7, 50, 3); tinyTrees(g, w, h * .7, 14, '#7FA86A', 4); hills(g, w, h, h * .8, '#8DB676', 8, 36, 4);
        bunting(g, w * .05, w * .45, h * .2, 50, 9);
        g.restore();
      }
      { const [c, g] = M, w = c.width, h = c.height;
        const ct = place(g, 'cottage', w * .5, h - 4, h * .92, { rim: 9 });
        an.chim = ct.at(.27, .03); an.door = ct.at(.53, .7); an.doorH = ct.h * .28; an.lamp = ct.at(.54, .44);
      }
      { const [c, g] = F, w = c.width, h = c.height;
        const fh = w * .48 / (IMG_META.fence.w / IMG_META.fence.h);
        place(g, 'fence', w * .25, h - 2, fh); place(g, 'fence', w * .75, h - 2, fh, { flip: true });
        an.fenceTop = h - fh * .85;
      }
      return { layers: [B, M, F], an };
    },
    2() {
      const B = layerCanvas(LAY.back), M = layerCanvas(LAY.mid), F = layerCanvas(LAY.front), an = {};
      { const [c, g] = B, w = c.width, h = c.height;
        const sh = daySky(g, w, h, '#E9F0CE', '#A8C890', 52); g.save(); g.clip(sh);
        const sg = g.createRadialGradient(w * .5, 0, 20, w * .5, 0, w * .5); sg.addColorStop(0, 'rgba(255,244,200,.8)'); sg.addColorStop(1, 'rgba(255,244,200,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
        const fh2 = h * .66; place(g, 'forest', w * .26, h - 2, fh2); place(g, 'forest', w * .74, h - 2, fh2, { flip: true });
        g.restore();
      }
      { const [c, g] = M, w = c.width, h = c.height; grassStrip(g, w, h, h * .93, '#5E8A4E', 7); }
      { const [c, g] = F, w = c.width, h = c.height;
        grassStrip(g, w, h, h * .88, '#4E7B45', 11);
        place(g, 'shrooms', w * .07, h - 2, h * .36); place(g, 'shrooms', w * .94, h - 2, h * .3, { flip: true });
      }
      return { layers: [B, M, F], an };
    },
    3() {
      const B = layerCanvas(LAY.back), M = layerCanvas(LAY.mid), F = layerCanvas(LAY.front), an = {};
      { const [c, g] = B, w = c.width, h = c.height;
        const sh = daySky(g, w, h, '#CBE5F1', '#FFF3D6', 63); g.save(); g.clip(sh);
        puffCloud(g, w * .2, h * .26, .9); puffCloud(g, w * .78, h * .2, .7); puffCloud(g, w * .5, h * .34, .45);
        hills(g, w, h, h * .66, '#BCD69E', 21, 46, 3); tinyTrees(g, w, h * .66, 18, '#6E9A5C', 5); hills(g, w, h, h * .76, '#A3C585', 22, 30, 5);
        g.restore();
      }
      { const [c, g] = M, w = c.width, h = c.height;
        meadowStrip(g, w, h, h * .72, 31);
        const md = place(g, 'meadow', w * .5, h - 3, h * .95, { rim: 8 });
        an.path = [md.at(.56, .95), md.at(.64, .66), md.at(.76, .42), md.at(.87, .22)]; an.house = md.at(.88, .14);
      }
      { const [c, g] = F, w = c.width, h = c.height; meadowStrip(g, w, h, h * .84, 41); }
      return { layers: [B, M, F], an };
    },
    4() {
      const B = layerCanvas(LAY.back), M = layerCanvas(LAY.mid), F = layerCanvas(LAY.front), an = {};
      { const [c, g] = B, w = c.width, h = c.height;
        wallpaperSheet(g, w, h, 71);
        const wl = place(g, 'wall', w * .5, h * .88, h * .78, { rim: 6 });
        an.win = wl.at(.545, .43); an.winW = wl.w * .22; an.clock = wl.at(.33, .22);
      }
      { const [c, g] = M, w = c.width, h = c.height; }
      { const [c, g] = F, w = c.width, h = c.height; floorStrip(g, w, h, h * .8, .5); }
      return { layers: [B, M, F], an };
    },
    5() {
      const B = layerCanvas(LAY.back), M = layerCanvas(LAY.mid), F = layerCanvas(LAY.front), an = {};
      { const [c, g] = B, w = c.width, h = c.height;
        wallpaperSheet(g, w, h, 83);
        const wl = place(g, 'wall', w * .62, h * .88, h * .72, { rim: 6 });
        an.win = wl.at(.545, .43);
      }
      { const [c, g] = M, w = c.width, h = c.height;
        const hr = place(g, 'hearth', w * .2, h - 3, h * .92, { rim: 8 });
        an.fire = hr.at(.6, .66); an.fireW = hr.w * .3; an.candles = [hr.at(.33, .06), hr.at(.4, .1), hr.at(.48, .1), hr.at(.56, .14), hr.at(.64, .1)];
        const tb = place(g, 'table', w * .66, h - 3, h * .6, { rim: 8 });
        an.cups = [tb.at(.22, .5), tb.at(.6, .6), tb.at(.86, .55)];
      }
      { const [c, g] = F, w = c.width, h = c.height; floorStrip(g, w, h, h * .82, .32); }
      return { layers: [B, M, F], an };
    }
  };

  /* ---------------- spreads: pieces + behaviour ---------------- */
  const lx = (ly, px) => local(ly, px, 0).x, ly_ = (ly, py) => local(ly, 0, py).y;
  const SPREADS = {
    1(sp, A) {
      const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch;
      sp.taps = []; sp.puff = 0;
      sp.mom = piece(Fr, 'mom', fw * .3, fh * .995, fh * .93);
      sp.hood = piece(Fr, 'hoodWalk', fw * .6, fh * .995, fh * .8, { dz: .012 });
      const hx0 = sp.hood.position.x, hx1 = lx(Fr, fw * .9);
      sp.hen = piece(Fr, 'hen', fw * .09, fh * .995, fh * .3, { dz: .014 });
      sp.bird = piece(Fr, 'bird', fw * .965, an.fenceTop + 6, fh * .2, { dz: .014 });
      sp.laundry = piece(Bk, 'laundry', Bk.cw * .25, Bk.ch * .8, Bk.ch * .3, { dz: .01 });
      sp.laundry.matrixAutoUpdate = false;
      sp.fx.push(smoke(Md, an.chim[0], an.chim[1], { op: .5, s0: .03, s1: .09, gain: () => 1 + sp.puff * 1.5 }));
      const bf1 = butterflies(sp, Md, [[.12, .5, 54, 0], [.86, .6, 46, 2]]); bf1.forEach(m => trailOf(sp, m, .14, 0xFFF0B0, .016));
      sp.fx.push(sunHalo(Bk, an.sun[0], an.sun[1], .06));
      motes(sp, Md, 4, [0xFFE2A0, 0xFFF6D0, 0xE8F8C0], { y0: .1, yh: .7 });
      const door = hotspot(Md, an.door[0], an.door[1], an.doorH * .6, an.doorH);
      sp.taps.push(
        { m: sp.mom, say: ['一直走小路，千万不要乱跑哦！', '路上小心，替我问外婆好！', '篮子里有刚烤的面包和果酱。'], snd: 'mom' },
        { m: sp.hood, say: ['知道啦，妈妈！', '外婆，我来啦！', '我会一直走小路的！'], snd: 'girl' },
        { m: sp.hen, act: () => { sp.peck = 1.2; [0, .12, .26].forEach(d => SFX.tone({ f: 620, f2: 420, dur: .07, vol: .06, type: 'square', lp: 1400, delay: d })); } },
        { m: sp.bird, act: () => chirp() },
        { m: sp.laundry, act: () => { sp.gust = 1.5; whoosh(.4); } },
        { m: door, act: () => { [0, .16].forEach(d => { SFX.noise({ type: 'lowpass', f: 380, dur: .05, vol: .3, delay: d }); SFX.tone({ f: 120, f2: 80, dur: .06, vol: .2, delay: d }); }); sp.puff = 1; } }
      );
      sp.peck = 0; sp.gust = 0; sp.saidGo = false;
      let birdT = 3;
      sp.update = (dt, t) => {
        const k = U.smooth(sp.p), moving = Math.abs(sp.pT - sp.p) > .01;
        sp.hood.position.x = U.lerp(hx0, hx1, k);
        sp.hood.position.y = sp.hood.userData.base.y + (moving ? Math.abs(Math.sin(t * 10)) * .01 : 0);
        if (sp.p > .95 && !sp.saidGo) { sp.saidGo = true; burstAt(sp.hood, { dy: .18, n: 26, speed: .3, up: .08, size: .03, life: 1 }); say(sp.hood, '出发啦！外婆等着我！'); voice('girl'); after(sp, 1.6, () => { say(sp.mom, '一直走小路哦！'); voice('mom'); startHop(sp.mom); }); }
        if (sp.p < .3) sp.saidGo = false;
        sp.peck = Math.max(0, sp.peck - dt);
        sp.hen.rotation.z = -.14 * Math.pow(Math.max(0, Math.sin(t * (sp.peck > 0 ? 14 : 3))), 6);
        sp.gust = Math.max(0, sp.gust - dt);
        const shear = Math.sin(t * 1.7) * .035 + Math.sin(t * 7) * .03 * sp.gust, L0 = sp.laundry;
        L0.matrix.set(1, shear, 0, L0.position.x, 0, 1, 0, L0.position.y, 0, 0, 1, L0.position.z, 0, 0, 0, 1);
        birdT -= dt; if (birdT < 0) { birdT = 4 + Math.random() * 4; startHop(sp.bird); if (sp.alpha > Math.PI * .9) chirp(); }
        sp.puff = Math.max(0, sp.puff - dt * .5);
        hop(sp.mom, dt); hop(sp.bird, dt);
      };
      sp.onPull = on => { if (on) [0, .3, .6, .9].forEach(d => SFX.noise({ type: 'lowpass', f: 500, dur: .05, vol: .12, delay: d })); };
      hiddenStar(sp, Bk, Bk.cw * .06, Bk.ch * .52, 48);
    },
    2(sp, A) {
      const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch, mw = Md.cw, mh = Md.ch;
      sp.taps = [];
      const ox = mw * .8, oy = mh * .995, oh = mh * .84, oakW = oh * IMG_META.oak.w / IMG_META.oak.h;
      sp.oak = piece(Md, 'oak', ox, oy, oh, { dz: .025 });
      const trunkX = artAt('oak', ox, oy, oh, .55, .6)[0], wh = mh * .78, ww = wh * IMG_META.wolfHi.w / IMG_META.wolfHi.h;
      sp.wolf = piece(Md, 'wolfHi', trunkX, oy - 2, wh, { dz: .012 });
      const wx0 = lx(Md, trunkX - oakW * .1 - ww * .04 + ww / 2), wx1 = lx(Md, ox - oakW / 2 - ww * .08);
      clipX(sp.wolf, sp.wolf.parent, lx(Md, trunkX), true);
      const sq0 = [ox - oh * .25, oy - 2], hole = artAt('oak', ox, oy, oh, .62, .6);
      sp.squirrel = piece(Md, 'squirrel', sq0[0], sq0[1], oh * .17, { dz: .035 });
      const sqA = sp.squirrel.position.clone(), sqB = local(Md, hole[0], hole[1] + oh * .06);
      const br = artAt('oak', ox, oy, oh, .2, .36);
      sp.bird = piece(Md, 'bird', br[0], br[1], oh * .12, { dz: .035 });
      sp.hood = piece(Fr, 'hoodWalk', fw * .32, fh * .99, fh * .82);
      sp.fx.push(fallingLeaves(Md, 10, 12));
      // sun beams through the trees
      const bt = beamTex(), beams = [[-.6, .05], [-.25, -.1], [.35, .12], [.7, -.05]].map(([u, rot], i) => { const m = addSprite(u < 0 ? Bk.Lg : Bk.R, bt, 0xFFF4D0); m.position.set(u * Bk.L, Bk.H * .55, .006); m.rotation.z = rot - .25; m.scale.set(.12 + i % 2 * .05, Bk.H * 1.1, 1); return m; });
      beams.forEach(m => m.material.color.copy(hot(0xFFF0C0, 1.3)));
      sp.fx.push((dt, t) => beams.forEach((m, i) => { m.material.opacity = .16 + .1 * Math.sin(t * .6 + i * 1.7); }));
      // fireflies and glowing spores drifting between the trees
      const flies = []; for (let i = 0; i < 18; i++) { const ly = i % 3 ? Md : Fr, right = i % 2 === 0, m = addSprite(right ? ly.R : ly.Lg, softTex, 0xD8FF90); m.material.color.copy(hot(0xD8FF90, 2)); m.userData = { ly, s: right ? 1 : -1, x: .1 + Math.random() * .8, y: .15 + Math.random() * .6, ph: Math.random() * 7, sp: .3 + Math.random() * .4 }; flies.push(m); }
      sp.fx.push((dt, t) => flies.forEach(m => { const u = m.userData; m.position.set(u.s * (u.x + Math.sin(t * u.sp + u.ph) * .06) * u.ly.L, (u.y + Math.sin(t * u.sp * 1.3 + u.ph * 2) * .05) * u.ly.H, .05); m.scale.setScalar(.03); m.material.opacity = Math.pow(Math.max(0, Math.sin(t * 1.6 + u.ph)), 3) * .95; }));
      motes(sp, Md, 3, [0xFFF0C0, 0xE0FFB0], { y0: .2, yh: .7, vy: -.015 });
      sp.revealed = false;
      const wU = px2u(Md, wh), wwU = px2u(Md, ww);
      sp.fx.push(() => {
        if (sp.p > .85 && !sp.revealed) { sp.revealed = true; FXS.shake = Math.max(FXS.shake, .35);
          for (const ex of [.24, .33]) burst(sp.wolf.parent, sp.wolf.position.x + (ex - .5) * wwU, sp.wolf.position.y + .9 * wU, .02, { n: 8, speed: .08, size: .03, life: .8, colors: [0xFFE070, 0xFFFFFF], hot: 2.4 }); }
        if (sp.p < .3) sp.revealed = false;
        if (sp.alpha > Math.PI * .9 && sp.p > .5) FXS.lampReq = Math.min(FXS.lampReq, .74);   // the forest darkens when the wolf steps out
      });
      sp.sqT = -1;
      sp.taps.push(
        { m: sp.wolf, act: () => { if (sp.pT < .5) { sp.pT = 1; sp.onPull(true); return; } startHop(sp.wolf); say(sp.wolf, U.pick(['篮子里装的是什么好吃的呀？', '嘿嘿，外婆家住在哪儿呀？', '这么早，你一个人去哪儿呀？'])); voice('wolf'); } },
        { m: sp.hood, say: ['我去看外婆！', '外婆家就在森林那头！', '篮子里是面包和果酱哦。'], snd: 'girl' },
        { m: sp.bird, act: () => { chirp(); after(sp, .3, chirp); } },
        { m: sp.squirrel, act: () => { if (sp.sqT < 0) { sp.sqT = 0; SFX.tone({ f: 900, f2: 1600, dur: .12, vol: .05 }); } } },
        { m: sp.oak, act: () => { SFX.noise({ type: 'bandpass', f: 2600, dur: .5, vol: .08, q: .6 }); sp.shake = 1; } }
      );
      sp.shake = 0;
      let birdT = 2;
      sp.update = (dt, t) => {
        const k = U.smooth(sp.p);
        sp.wolf.position.x = U.lerp(wx0, wx1, k); sp.wolf.position.y = sp.wolf.userData.base.y + Math.sin(k * Math.PI) * .03;
        if (sp.wolf.userData.hopT > 0) hop(sp.wolf, dt);
        // squirrel scampers into the hole and pops back out later
        if (sp.sqT >= 0) {
          sp.sqT += dt; const a = Math.min(1, sp.sqT / .6), back = U.clamp((sp.sqT - 3.5) / .5, 0, 1);
          const p = sp.sqT < 3.5 ? a : 1 - back;
          sp.squirrel.position.set(U.lerp(sqA.x, sqB.x, p), U.lerp(sqA.y, sqB.y, p) + Math.sin(p * Math.PI) * .05, sqA.z);
          sp.squirrel.scale.setScalar(Math.max(.001, sp.sqT < 3.5 ? 1 - Math.max(0, a - .6) * 2.5 : back));
          if (sp.sqT > 4) { sp.sqT = -1; sp.squirrel.scale.setScalar(1); sp.squirrel.position.copy(sqA); }
        }
        sp.shake = Math.max(0, sp.shake - dt * 2); sp.oak.position.x = sp.oak.userData.base.x + Math.sin(t * 40) * .004 * sp.shake;
        birdT -= dt; if (birdT < 0) { birdT = 3 + Math.random() * 4; startHop(sp.bird); if (sp.alpha > Math.PI * .9) chirp(); }
        hop(sp.bird, dt); hop(sp.hood, dt);
      };
      sp.onPull = on => {
        SFX.noise({ type: 'bandpass', f: 1800, dur: .6, vol: .1, q: .7 });
        if (on) { after(sp, .7, () => { say(sp.wolf, '小姑娘，你要去哪儿呀？'); voice('wolf'); }); after(sp, 2.9, () => { say(sp.hood, '我去看外婆！'); voice('girl'); }); }
      };
      hiddenStar(sp, Bk, Bk.cw * .1, Bk.ch * .36, 48);
    },
    3(sp, A) {
      const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch;
      sp.taps = [];
      sp.hood = piece(Fr, 'hoodPick', fw * .3, fh * .995, fh * .82);
      const bx = fw * .58, by = fh * .985, bh = fh * .34;
      sp.basketE = piece(Fr, 'basketE', bx, by, bh, { dz: .012 }); sp.basketF = piece(Fr, 'basketF', bx, by, bh * 1.02, { dz: .013 }); sp.basketF.scale.setScalar(.001);
      // daisies to pick: they open as the dial turns
      sp.daisies = [[.68, .78, 70], [.77, .9, 62], [.85, .74, 58], [.93, .88, 66], [.72, .62, 50]].map(([u, v, h], i) => { const m = piece(Fr, 'daisy', fw * u, fh * v, h, { ax: .5, ay: .5, dz: .016, rim: 5 }); m.userData.i = i; m.userData.picked = 0; return m; });
      sp.picked = 0;
      const bc = local(Fr, bx, by - bh * .55);
      sp.daisies.forEach(m => trailOf(sp, m, .05, 0xFFF4C0, .018));
      sp.daisies.forEach(m => sp.taps.push({ m, act: () => {
        const u = m.userData; if (u.picked || u.open < .8) { startHop(m); return; }
        u.picked = 1e-3; u.from = m.position.clone(); SFX.tone({ f: 1320, dur: .04, rel: .5, vol: .05 });
        sp.picked++; if (sp.picked === 3) after(sp, .7, () => { sp.full = 0; FXS.flash = Math.max(FXS.flash, .14); burstAt(sp.basketF, { dy: .06, n: 40, speed: .4, up: .12, size: .032, life: 1.1, colors: [0xFF6A50, 0x6A8CFF, 0xFFFFFF, 0xFFE070] }); chime([784, 988, 1175, 1568]); say(sp.hood, '篮子装满啦！外婆一定会喜欢！'); voice('girl'); });
      } }));
      // the wolf slips away up the path toward grandma's house
      const wh0 = Md.ch * .42, pts = an.path.map(([x, y]) => local(Md, x, y));
      sp.wolf = piece(Md, 'wolfSneak', an.path[0][0], an.path[0][1], wh0, { dz: .012 });
      sp.wolfK = 0; sp.saidAway = false;
      makeDial(sp, 'daisy', .8, ZF - .2, .3);
      motes(sp, Md, 3.5, [0xFFE2A0, 0xFFF6D0]);
      let puffAcc = 0; sp.fx.push(dt => { const mv = Math.abs(sp.spin) > .5 && sp.wolfK < .98; puffAcc += mv ? dt : 0; if (puffAcc > .22) { puffAcc = 0; emit(sp.wolf.parent, sp.wolf.position.x + (Math.random() - .5) * .03, sp.wolf.position.y + .005, .013, { kind: 'dust', color: 0xE8D8B8, vy: .03, vx: -.03, size: .04 * sp.wolf.scale.x, life: .9 }); } });
      const fly = butterflies(sp, Bk, [[.3, .5, 60, 0], [.64, .4, 52, 1.6], [.85, .62, 46, 3.1]], () => 1 + Math.min(4, Math.abs(sp.spin) * .4)); fly.forEach(m => trailOf(sp, m, .12, 0xFFF0B0, .015));
      sp.taps.push(
        { m: sp.hood, say: ['哇，好漂亮的花！', '外婆一定会喜欢的！', '再摘一朵……就一朵！'], snd: 'girl' },
        { m: sp.wolf, say: ['嘘——别出声……', '嘿嘿，我先去外婆家！'], snd: 'wolf' },
        { m: sp.basketE, act: () => startHop(sp.basketE) }, { m: sp.basketF, act: () => startHop(sp.basketF) }
      );
      sp.full = -1;
      sp.update = (dt, t) => {
        dialStep(sp, dt);
        const bloom = U.clamp(sp.dialTotal / (Math.PI * 3), 0, 1);
        sp.daisies.forEach((m, i) => {
          const u = m.userData; u.open = U.clamp(bloom * 1.6 - i * .15, 0, 1);
          if (u.picked) {
            u.picked += dt / .7; const q = Math.min(1, u.picked);
            m.position.set(U.lerp(u.from.x, bc.x, q), U.lerp(u.from.y, bc.y, q) + Math.sin(q * Math.PI) * .08, u.from.z + .01);
            m.scale.setScalar(Math.max(.001, 1 - q * .9)); m.rotation.z += dt * 8; if (q >= 1) m.visible = false;
          } else { m.scale.setScalar(.35 + .65 * U.easeOutBack(u.open, 2)); m.rotation.z = Math.sin(t * 1.5 + i) * .06; hop(m, dt);
            if (u.open > .95 && !u.bloomed) { u.bloomed = true; burst(m.parent, m.position.x, m.position.y, .03, { n: 14, speed: .16, size: .026, life: .8, colors: [0xFFFFFF, 0xFFE070, 0xFFF4D0] }); SFX.tone({ f: 1046 + i * 130, dur: .04, rel: .5, vol: .03 }); } if (u.open < .5) u.bloomed = false; }
        });
        if (sp.full >= 0) { sp.full = Math.min(1, sp.full + dt / .35); sp.basketE.scale.setScalar(Math.max(.001, 1 - sp.full)); sp.basketF.scale.setScalar(Math.max(.001, U.easeOutBack(sp.full, 2.4))); }
        sp.wolfK = U.lerp(sp.wolfK, U.clamp(sp.dialTotal / (Math.PI * 5), 0, 1), 1 - Math.exp(-dt * 3));
        const k = sp.wolfK, seg = Math.min(pts.length - 2, Math.floor(k * (pts.length - 1))), f = k * (pts.length - 1) - seg;
        sp.wolf.position.set(U.lerp(pts[seg].x, pts[seg + 1].x, f), U.lerp(pts[seg].y, pts[seg + 1].y, f) + Math.abs(Math.sin(t * 9)) * .006 * (k < .99 ? 1 : 0), .012);
        sp.wolf.scale.setScalar(Math.max(.001, 1 - k * .75));
        if (k > .97 && !sp.saidAway) { sp.saidAway = true; say(sp.wolf, '嘿嘿，我先去外婆家啦！'); voice('wolf'); }
        hop(sp.hood, dt); hop(sp.basketE, dt); hop(sp.basketF, dt);
      };
      hiddenStar(sp, Bk, Bk.cw * .62, Bk.ch * .3, 48);
    },
    4(sp, A) {
      const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch, mw = Md.cw, mh = Md.ch;
      sp.taps = [];
      const bx = mw * .26, by = mh * .995, bh = mh * .9, bw = bh * IMG_META.bed.w / IMG_META.bed.h;
      sp.bed = piece(Md, 'bed', bx, by, bh, { dz: .02 });
      const wbH = bw * .6 * IMG_META.wolfBed.h / IMG_META.wolfBed.w, wbY = by - bh * .3;
      sp.wolfBed = piece(Md, 'wolfBed', bx, wbY, wbH, { dz: .03 });
      sp.wolfUp = piece(Md, 'wolfUp', bx, wbY - bh * .08, wbH * 1.02, { dz: .032 }); sp.wolfUp.scale.setScalar(.001);
      const wdx = mw * .8, wdH = mh * .95;
      sp.wardC = piece(Md, 'wardC', wdx, by, wdH, { dz: .02 });
      sp.wardO = piece(Md, 'wardO', wdx, by, wdH, { dz: .021 }); sp.wardO.scale.set(.001, 1, 1);
      sp.hood = piece(Fr, 'hoodAsk', fw * .7, fh * .995, fh * .88);
      // light pouring through the window, with dust in it
      const bt = beamTex(), wl = local(Bk, an.win[0], an.win[1]);
      const beam = addSprite(wl.panel, bt, 0xFFF0C8); beam.position.set(wl.x - .05, wl.y - .12, .008); beam.rotation.z = .5; beam.scale.set(.26, .5, 1);
      beam.material.color.copy(hot(0xFFF0C8, 1.4)); beam.scale.set(.32, .62, 1);
      sp.fx.push((dt, t) => { beam.material.opacity = .26 + .06 * Math.sin(t * .5); });
      let dustAcc = 0; sp.fx.push(dt => { if (sp.alpha < Math.PI * .9) return; dustAcc += dt * 6; while (dustAcc > 1) { dustAcc--; const f = Math.random(); emit(wl.panel, wl.x - .05 - f * .2 + (Math.random() - .5) * .08, wl.y - .02 - f * .3, .02, { kind: 'glow', vx: (Math.random() - .5) * .01, vy: -.006, drag: .1, size: .012, life: 3, twinkle: 5, color: 0xFFF2D0, op: .8 }); } });
      // a "ta-da" starburst behind the wolf when he is found out, and warm light spilling from the wardrobe
      const tada = addSprite(sp.wolfUp.parent, getBurstTex(), 0xFFE080); tada.material.color.copy(hot(0xFFE080, 1.5)); tada.position.set(sp.wolfUp.position.x, sp.wolfUp.position.y + px2u(Md, wbH) * .55, .029);
      const wardGlow = addSprite(sp.wardO.parent, glowTex, 0xFFD890); wardGlow.material.color.copy(hot(0xFFD890, 1.6)); wardGlow.position.set(sp.wardO.position.x, sp.wardO.position.y + px2u(Md, wdH) * .45, .024); wardGlow.scale.setScalar(.36);
      sp.tadaT = 9; sp.wasUp = false;
      sp.fx.push((dt, t) => {
        const up = sp.p > .5; if (up && !sp.wasUp) { sp.tadaT = 0; FXS.flash = Math.max(FXS.flash, .32); FXS.shake = 1; burst(sp.wolfUp.parent, tada.position.x, tada.position.y, .034, { n: 30, speed: .45, size: .034, life: 1, colors: [0xFFE070, 0xFFFFFF, 0xFF9A70] }); } sp.wasUp = up;
        sp.tadaT += dt; const k = sp.tadaT; tada.material.opacity = k < 1.6 ? Math.min(1, k * 6) * (1 - k / 1.6) * .9 : 0; tada.scale.setScalar(.2 + Math.min(1, k * 4) * .35); tada.rotation.z = t * .6;
        wardGlow.material.opacity = sp.wardO.scale.x * (.5 + .1 * Math.sin(t * 2));
      });
      // cuckoo-clock pendulum ticking on the wall
      let tickT = 0; sp.fx.push(dt => { tickT += dt; if (tickT > 1) { tickT = 0; if (sp.alpha > Math.PI * .9) tick(2400, .03); } });
      const QA = [['外婆，你的耳朵怎么这么大？', '为了更清楚地听你说话呀！'], ['外婆，你的眼睛怎么这么大？', '为了更清楚地看你呀！'], ['外婆，你的嘴巴怎么这么大？', '为了……嘿嘿，为了亲亲你呀！']];
      sp.qa = 0; sp.busy = false;
      sp.ask = () => {
        if (sp.busy || sp.pT > .5) return; sp.busy = true; const [q, a] = QA[sp.qa % 3]; sp.qa++;
        say(sp.hood, q); voice('girl'); startHop(sp.hood);
        after(sp, 1.8, () => { say(sp.wolfBed, a); voice('wolf'); startHop(sp.wolfBed); });
        after(sp, 3.2, () => { sp.busy = false; if (sp.qa === 3) { say(sp.hood, '咦……外婆好像有点奇怪？'); voice('girl'); } });
      };
      sp.ward = 0; sp.wardT = 1;
      const toggleWard = sp.toggleWard = () => { sp.ward = 1 - sp.ward; sp.wardT = 0; if (sp.ward) after(sp, .3, () => burstAt(sp.wardO, { dy: .2, n: 22, speed: .25, size: .028, life: 1, colors: [0xFFE2A0, 0xFFFFFF] })); SFX.noise({ type: 'lowpass', f: 700, f2: 300, dur: .3, vol: .12 }); SFX.tone({ f: 300, f2: 420, dur: .25, vol: .04, type: 'triangle' }); if (sp.ward) after(sp, .45, () => { say(sp.wardO, '嘘——我躲在这儿呢！'); voice('gran'); }); };
      sp.taps.push(
        { m: sp.wolfBed, act: sp.ask },
        { m: sp.wolfUp, say: ['嗷呜！被你发现啦！', '我、我只是来借顶睡帽……'], snd: 'wolf' },
        { m: sp.hood, act: sp.ask },
        { m: sp.wardC, act: toggleWard }, { m: sp.wardO, act: toggleWard }
      );
      sp.upT = 0;
      sp.update = (dt, t) => {
        const up = sp.p > .5; sp.upT = U.clamp(sp.upT + (up ? dt : -dt) / .35, 0, 1);
        sp.wolfBed.scale.setScalar(Math.max(.001, 1 - sp.upT)); sp.wolfUp.scale.setScalar(Math.max(.001, U.easeOutBack(sp.upT, 2.6)));
        if (!up) sp.wolfBed.position.y = sp.wolfBed.userData.base.y + Math.sin(t * 1.4) * .003;   // breathing under the quilt
        sp.wardT = Math.min(1, sp.wardT + dt / .4); const k = sp.wardT, open = sp.ward;
        const c = open ? Math.max(0, 1 - k * 2) : Math.max(0, k * 2 - 1), o = open ? Math.max(0, k * 2 - 1) : Math.max(0, 1 - k * 2);
        sp.wardC.scale.set(Math.max(.001, c), 1, 1); sp.wardO.scale.set(Math.max(.001, o), 1, 1);
        hop(sp.hood, dt); hop(sp.wolfBed, dt); hop(sp.wolfUp, dt);
      };
      sp.onPull = on => {
        if (on) { SFX.tone({ f: 200, f2: 520, dur: .25, vol: .1, type: 'sawtooth', lp: 1200 }); after(sp, .4, () => { say(sp.wolfUp, '嗷呜！被你发现啦！'); voice('wolf'); }); after(sp, 2.2, () => { say(sp.hood, '啊！你根本不是外婆！'); voice('girl'); startHop(sp.hood); }); }
      };
      hiddenStar(sp, Bk, Bk.cw * .15, Bk.ch * .4, 46);
    },
    5(sp, A) {
      const [Bk, Md, Fr] = sp.layers, an = A.an, fw = Fr.cw, fh = Fr.ch;
      sp.taps = [];
      // fire: glow, flicker light, sparks
      const fl = warmLight(Md, an.fire[0], an.fire[1], 0xFF9A40, 1.8), fg = glow(Md, an.fire[0], an.fire[1], .42, 0xFFA040, .5); fg.material.color.copy(hot(0xFFA040, 1.8));
      const sparks = []; for (let i = 0; i < 14; i++) { const lc = local(Md, an.fire[0], an.fire[1]); const m = addSprite(lc.panel, softTex, 0xFFB050); m.material.color.copy(hot(0xFFB050, 2.4)); m.userData = { x: lc.x, y: lc.y, ph: Math.random(), sp: .5 + Math.random() * .6, dx: (Math.random() - .5) * .1 }; sparks.push(m); }
      const candles = an.candles.map(([x, y]) => { const c = glow(Md, x, y, .08, 0xFFD27A, .7); c.material.color.copy(hot(0xFFD27A, 2)); return c; });
      sp.fx.push((dt, t) => {
        const f = .8 + .2 * Math.sin(t * 13) * Math.sin(t * 7.3); fl.intensity = 1.6 * f; fg.material.opacity = .45 * f; candles.forEach((c, i) => c.material.opacity = .55 + .2 * Math.sin(t * 9 + i * 2));
        sparks.forEach(m => { const u = m.userData, a = (t * u.sp + u.ph) % 1; m.position.set(u.x + u.dx * a + Math.sin(t * 3 + u.ph * 9) * .01, u.y + a * .14, .02); m.scale.setScalar(.012 * (1 - a)); m.material.opacity = (1 - a) * .9; });
      });
      an.cups.forEach(([x, y]) => sp.fx.push(smoke(Md, x, y, { color: 0xFFFFFF, op: .3, n: 5, s0: .01, s1: .04, rise: .07, rate: .3, wind: .01 })));
      sp.gran = piece(Fr, 'gran', fw * .17, fh * .995, fh * .9);
      sp.hood = piece(Fr, 'hoodCake', fw * .41, fh * .995, fh * .86);
      sp.cutter = piece(Fr, 'cutter', fw * .66, fh * .995, fh * .97);
      sp.cat = piece(Md, 'cat', Md.cw * .08, Md.ch * .99, Md.ch * .24, { dz: .03 });
      sp.yarn = piece(Fr, 'yarn', fw * .3, fh * .99, fh * .2, { ax: .5, ay: .55, dz: .014 }); sp.yarn.position.y = local(Fr, 0, fh * .99 - fh * .1).y; sp.yarn.userData.base = sp.yarn.position.clone();
      const lan = hanger(Bk, Bk.cw * .32, Bk.ch * .165, 150, 'lantern', 120); sp.fx.push((dt, t) => lan.step(dt, t));
      const lg = addSprite(lan.m, glowTex, 0xFFD27A, true, .7); lg.material.color.copy(hot(0xFFD27A, 2)); lg.position.set(0, -px2u(Bk, 120) * .6, .002); lg.scale.setScalar(.16);
      sp.taps.push({ m: lan.m, act: () => { lan.kick(1.4); SFX.tone({ f: 1500, dur: .03, rel: .8, vol: .04 }); } });
      // the wolf bolts out of the right-hand edge of the page
      sp.wolf = piece(Fr, 'wolfRun', fw * .87, fh * .9, fh * .52, { dz: .016 });
      const wx0 = sp.wolf.position.x, wx1 = lx(Fr, fw * 1.25);
      clipX(sp.wolf, sp.wolf.parent, Fr.L * .995, true);
      sp.taps.push(
        { m: sp.gran, say: ['好孩子，谢谢你的花！', '以后要听妈妈的话哦。', '来，大家一起吃蛋糕吧！'], snd: 'gran' },
        { m: sp.hood, say: ['外婆，吃蛋糕！', '以后我再也不离开小路了！', '谢谢你，樵夫叔叔！'], snd: 'girl' },
        { m: sp.cutter, say: ['别怕，有我在！', '走开！别再回来！', '哈哈，它跑得比兔子还快！'], snd: 'cutter' },
        { m: sp.wolf, say: ['嗷——我再也不敢啦！', '救命呀，快跑！'], snd: 'wolf' },
        { m: sp.cat, act: () => { sp.catT = 1; SFX.tone({ f: 700, f2: 1000, dur: .18, vol: .05, type: 'triangle' }); SFX.tone({ f: 1000, f2: 600, dur: .25, vol: .05, type: 'triangle', delay: .18 }); } },
        { m: sp.yarn, act: () => { sp.yarnT = 0; SFX.noise({ type: 'lowpass', f: 400, dur: .5, vol: .06 }); } }
      );
      sp.catT = 0; sp.yarnT = -1; sp.said = false;
      sp.update = (dt, t) => {
        const k = U.smooth(sp.p);
        sp.wolf.visible = k < .97; sp.wolf.position.x = U.lerp(wx0, wx1, k); sp.wolf.position.y = sp.wolf.userData.base.y + Math.abs(Math.sin(k * Math.PI * 3)) * .03 * (k > .01 && k < .99 ? 1 : 0) + (k < .01 ? Math.sin(t * 9) * .002 : 0);
        sp.gran.rotation.z = Math.sin(t * 1.6) * .035;
        sp.catT = Math.max(0, sp.catT - dt); sp.cat.scale.set(1 + sp.catT * .12, 1 - sp.catT * .08, 1);
        if (sp.yarnT >= 0) { sp.yarnT += dt; const q = sp.yarnT / 1.6, d = Math.sin(Math.min(1, q) * Math.PI) * .09; sp.yarn.position.x = sp.yarn.userData.base.x + d; sp.yarn.rotation.z = -d / .03; if (q >= 1) sp.yarnT = -1; }
        if (k > .45 && !sp.puffed) { sp.puffed = true; for (let i = 0; i < 10; i++) emit(sp.wolf.parent, sp.wolf.position.x - .05 - Math.random() * .1, sp.wolf.position.y - .05 + Math.random() * .04, .02, { kind: 'dust', color: 0xD8CBB4, vx: -.05 - Math.random() * .08, vy: .03 + Math.random() * .04, size: .05 + Math.random() * .04, life: 1.2 }); }
        if (k < .2) sp.puffed = false;
        if (sp.alpha > Math.PI * .9 && sp.p > .9) FXS.lampReq = Math.max(FXS.lampReq, 1.12);
        if (sp.p > .9 && !sp.said) { sp.said = true; after(sp, .5, () => { FXS.flash = Math.max(FXS.flash, .16); for (let i = 0; i < 70; i++) { const right = i % 2 === 0; emit(right ? Fr.R : Fr.Lg, (right ? 1 : -1) * Math.random() * Fr.L, Fr.H * (1.05 + Math.random() * .3), .06, { kind: 'confetti', color: [0xC8372D, 0x2F5A3C, 0xE9B44C, 0xF6EBD3, 0x5B7BD5][i % 5], vx: (Math.random() - .5) * .1, vy: -.05, grav: .12, drag: .6, size: .022, life: 3 + Math.random() }); } burst(Fr.R, .05, Fr.H * .7, .06, { n: 24, speed: .4, size: .03, life: 1.1 }); burst(Fr.Lg, -.05, Fr.H * .7, .06, { n: 24, speed: .4, size: .03, life: 1.1 }); chime([1047, 1319, 1568, 2093]); }); after(sp, .2, () => { say(sp.cutter, '走开！别再回来！'); voice('cutter'); startHop(sp.cutter); }); after(sp, 2.2, () => { say(sp.hood, '谢谢你，樵夫叔叔！'); voice('girl'); startHop(sp.hood); }); after(sp, 4.2, () => { say(sp.gran, '来，大家一起吃蛋糕吧！'); voice('gran'); }); }
        if (sp.p < .3) sp.said = false;
        hop(sp.hood, dt); hop(sp.cutter, dt);
      };
      sp.onPull = on => { if (on) { [0, .14, .28, .42].forEach(d => SFX.noise({ type: 'lowpass', f: 600, dur: .04, vol: .14, delay: d })); SFX.tone({ f: 500, f2: 200, dur: .5, vol: .07, type: 'sawtooth', lp: 900, delay: .1 }); } };
      hiddenStar(sp, Bk, Bk.cw * .9, Bk.ch * .45, 46);
    }
  };
  const DETAILS = {};

  /* ---------------- ambience ---------------- */
  // birdsong garden, forest wind, meadow breeze, quiet room (clock ticks), crackling fire
  function makeBeds() { return [SFX.bed({ type: 'bandpass', f: 3800, q: 6, lfo: 6, lfoDepth: 900 }), SFX.bed({ f: 520, lfo: .2, lfoDepth: 300 }), SFX.bed({ f: 700, lfo: .14, lfoDepth: 260 }), null, SFX.bed({ type: 'bandpass', f: 1900, q: 1.6, lfo: 13, lfoDepth: 900 })]; }
  function bedLevel(i) { return [.018, .05, .035, 0, .05][i]; }

  /* ---------------- auto demo ---------------- */
  async function demoScript(W8, S) {
    if (currentSpread() !== 0) { leaves.forEach(l => l.target = 0); rustle(); await W8(1.8); }
    spreads.forEach(sp => { sp.pT = 0; }); cam.zoom = 1;
    await W8(.8); await goTo(1); await W8(.6);
    let s = S(1);
    poke(s, s.mom, 0); await W8(2.6); poke(s, s.hood, 0); await W8(1.8); poke(s, s.hen); await W8(1.2);
    await pull(s, 1, 2.4); await W8(3.4);
    await goTo(2); await W8(.6);
    s = S(2); poke(s, s.bird); await W8(1); poke(s, s.squirrel); await W8(1.4);
    await pull(s, 1, 1.4); await W8(4.4); poke(s, s.wolf); await W8(2.8);
    await goTo(3); await W8(.6);
    s = S(3); poke(s, s.hood, 0); await W8(2); s.spin = -9; await W8(3);
    for (const m of s.daisies.slice(0, 3)) { poke(s, m); await W8(.7); }
    await W8(2.2); s.spin = -12; await W8(4.2);
    await goTo(4); await W8(.6);
    s = S(4); for (let i = 0; i < 3; i++) { poke(s, s.wolfBed); await W8(3.6); }
    await W8(1); await pull(s, 1, 1.2); await W8(3.6); poke(s, s.wardC); await W8(3);
    await goTo(5); await W8(.6);
    s = S(5); poke(s, s.gran, 0); await W8(2.6); await pull(s, 1, 1.4); await W8(6.4); poke(s, s.cat); await W8(1.4); poke(s, s.hood, 1); await W8(3);
    Toy.toast('全书完 · 小红帽平安到家啦', 3200); await W8(2);
  }

  /* ---------------- film script (30 s) ---------------- */
  function filmShots() {
    return [
      K(0, .52, .02, .1, .55, 1.06, 2.2), K(.75, .46, .05, .02, .34, .96, 2.0), K(1.7, 0, .2, .05, .06, .92, 2.38),
      K(3.1, -.06, .24, .05, .22, 1.03, 2.0), K(4.9, .2, .2, .1, -.2, 1.05, 1.8), K(5.75, 0, .22, .05, -.04, .95, 2.32),
      K(7.4, .3, .26, 0, -.18, 1.02, 1.8), K(9.3, .26, .24, .05, -.3, 1.05, 1.65), K(10.05, 0, .22, .05, .04, .95, 2.32),
      K(11.6, .2, .2, .1, .12, 1.06, 1.8), K(13.4, .3, .22, .0, -.16, 1.0, 1.85), K(14.3, 0, .22, .05, 0, .95, 2.32),
      K(16.2, -.2, .26, .05, .18, 1.05, 1.75), K(18.3, -.1, .3, .05, .05, 1.0, 1.9), K(18.95, 0, .22, .05, 0, .95, 2.32),
      K(21.2, .1, .22, .12, -.15, 1.05, 1.75), K(24.4, -.1, .24, .08, .16, 1.0, 1.9), K(27.4, 0, .18, .05, 0, .86, 2.6), K(30.5, 0, .18, .05, -.04, .82, 2.85)
    ];
  }
  function filmSegs() {
    return [
      { s: 1, a: 1.0, b: 5.4, title: '出发', sub: '小红帽要去森林那头，看望生病的外婆。' },
      { s: 2, a: 5.75, b: 9.7, title: '森林', sub: '大树后面，探出了一个毛茸茸的脑袋……' },
      { s: 3, a: 10.05, b: 14.0, title: '花田', sub: '小红帽摘呀摘，大灰狼却悄悄溜走了。' },
      { s: 4, a: 14.3, b: 18.6, title: '外婆家', sub: '“外婆，你的耳朵怎么这么大？”' },
      { s: 5, a: 18.95, b: 27.2, title: '团聚', sub: '樵夫赶来，大灰狼吓得夹着尾巴逃走了。' }
    ];
  }
  function filmActs() {
    const S = i => spreads[i - 1], pullTo = (sp, dur) => () => { SFX.tone({ f: 900, dur: .02, vol: .08 }); sp.demoPull = { from: sp.pT, to: 1, t: 0, dur }; };
    const pk = (i, key, line = 0) => () => { const sp = S(i), m = typeof key === 'function' ? key(sp) : sp[key]; poke(sp, m, line); };
    return [
      [.7, () => turn(1)],
      [1.9, pk(1, 'mom', 0)], [2.8, () => pullTo(S(1), 1.6)()], [3.2, pk(1, 'hen')],
      [5.4, () => turn(1)],
      [6.2, pk(2, 'bird')], [6.5, () => pullTo(S(2), 1.2)()],
      [9.7, () => turn(1)],
      [10.4, () => { S(3).spin = -14; }], [11.6, pk(3, sp => sp.daisies[0])], [12.0, pk(3, sp => sp.daisies[1])], [12.4, pk(3, sp => sp.daisies[2])],
      [14.0, () => turn(1)],
      [14.6, pk(4, 'wolfBed')], [17.2, () => pullTo(S(4), .8)()],
      [18.6, () => turn(1)],
      [19.6, pk(5, 'gran', 0)], [21.0, () => pullTo(S(5), 1.4)()], [25.2, pk(5, 'cat')]
    ];
  }

  /* ---------------- voiced film hooks ---------------- */
  // which piece speaks a role's line on each spread (bubbles appear over it)
  function speaker(s, role, sp) {
    const map = {
      1: { '小红帽': sp.hood, '妈妈': sp.mom },
      2: { '小红帽': sp.hood, '大灰狼': sp.wolf },
      3: { '小红帽': sp.hood, '大灰狼': sp.wolf },
      4: { '小红帽': sp.hood, '大灰狼': sp.pT > .5 ? sp.wolfUp : sp.wolfBed, '外婆': sp.wardO },
      5: { '小红帽': sp.hood, '外婆': sp.gran, '樵夫': sp.cutter, '大灰狼': sp.wolf }
    }[s] || {};
    return map[role] || null;
  }
  // named story actions a voiced plan can call: {"do":"call","s":4,"fn":"openWardrobe"}
  const FILM_HOOKS = {
    openWardrobe(sp) { if (!sp.ward) sp.toggleWard(); },
    bloomAll(sp) { sp.spin = -12; }
  };
