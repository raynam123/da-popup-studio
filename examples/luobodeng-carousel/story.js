  /* ===================== 一盏萝卜灯的两千年 · carousel story ===================== */
  const BOOK = {
    title: '一盏萝卜灯的两千年', sub: '万圣节的由来 · 转一圈的纸艺立体书', author: '万圣节的由来 · 旋转木马立体书',
    intro: '万圣节的夜里，\n一盏萝卜灯亮了，\n讲两千年的故事。', tagline: '七个小剧场，绕着书脊转一圈 · 点角色听他们说话',
    coverHex: 0x26315F, coverCss: '#26315F', spineHex: 0x18203F, filmEnd: 58.5
  };
  const C = { ink: '#2A2440', red: '#C8572D', gold: '#C9962E', green: '#5E7A4A' };
  const VOICES = {
    lamp: { f: 880, type: 'triangle', gap: .07 }, girl: { f: 760, type: 'square', lp: 2400, gap: .07 },
    man: { f: 200, type: 'square', lp: 1100, gap: .09 }, kid: { f: 640, type: 'square', lp: 2000, gap: .07 },
    imp: { f: 1150, type: 'square', lp: 3000, gap: .05, vol: .05 }, gran: { f: 440, type: 'triangle', spread: .25, gap: .11 },
    spirit: { f: 1300, type: 'sine', gap: .06, spread: .4 }, pump: { f: 300, type: 'triangle', gap: .1 }
  };

  /* ---------------- painting helpers ---------------- */
  function moonDisc(g, x, y, r) {
    const gr = g.createRadialGradient(x, y, r * .3, x, y, r * 2.6); gr.addColorStop(0, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.6, 0, 7); g.fill();
    g.fillStyle = '#FFF2CC'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(214,196,150,.45)'; for (const [dx, dy, rr] of [[-.3, -.2, .18], [.25, .1, .12], [-.05, .35, .1]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r, 0, 7); g.fill(); }
  }
  // a tall night-sky strip with a scalloped top: stars, an optional moon and a little bat or two
  function nightStrip(g, w, h, o) {
    const path = scallopTop(w, h, 70, 2, 46, 9), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, o.top); gr.addColorStop(.8, o.bot); gr.addColorStop(1, o.bot);
    sheet(g, path, gr, 8);
    g.save(); g.clip(path);
    const rnd = U.mulberry32(o.seed || 3);
    for (let i = 0; i < (o.stars == null ? 70 : o.stars); i++) { const x = rnd() * w, y = 90 + rnd() * h * .55; if (rnd() > .85) star4(g, x, y, 6 + rnd() * 6, '#FFE8A8'); else { g.fillStyle = `rgba(255,246,220,${.4 + rnd() * .5})`; g.beginPath(); g.arc(x, y, 1.5 + rnd() * 2.2, 0, 7); g.fill(); } }
    if (o.glow) { const sg = g.createRadialGradient(w / 2, h, 20, w / 2, h, w * .6); sg.addColorStop(0, o.glow); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h); }
    if (o.moon) moonDisc(g, w * o.moon[0], o.moon[1], o.moon[2] || 50);
    (o.bats || []).forEach(([x, y, s]) => batShape(g, w * x, y, s, 'rgba(40,30,60,.75)'));
    g.restore(); grain(g, w, h, .05);
  }
  function batShape(g, x, y, s, col) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 4 * s);
    g.quadraticCurveTo(x - 8 * s, y - 10 * s, x - 22 * s, y - 6 * s); g.quadraticCurveTo(x - 16 * s, y - 2 * s, x - 18 * s, y + 4 * s);
    g.quadraticCurveTo(x - 10 * s, y, x - 6 * s, y + 5 * s); g.quadraticCurveTo(x - 2 * s, y + 1 * s, x, y + 6 * s);
    g.quadraticCurveTo(x + 2 * s, y + 1 * s, x + 6 * s, y + 5 * s); g.quadraticCurveTo(x + 10 * s, y, x + 18 * s, y + 4 * s);
    g.quadraticCurveTo(x + 16 * s, y - 2 * s, x + 22 * s, y - 6 * s); g.quadraticCurveTo(x + 8 * s, y - 10 * s, x, y - 4 * s); g.fill();
  }
  // a wide picture standing on the bottom of a strip, sized to the strip width
  function bandArt(g, key, w, h, frac = .98, by) { const ar = IM[key].width / IM[key].height; let hh = w * frac / ar; if (hh > h * .95) hh = h * .95; place(g, key, w / 2, by == null ? h - 4 : by, hh); }
  function bushStrip(g, w, h, col, seed) {
    const rnd = U.mulberry32(seed), path = P(p => { p.moveTo(6, h - 2); p.lineTo(6, h * .5); let x = 6; while (x < w - 6) { const s = 40 + rnd() * 50, x1 = Math.min(w - 6, x + s); p.quadraticCurveTo((x + x1) / 2, h * .5 - 30 - rnd() * 40, x1, h * .5 + (rnd() - .5) * 10); x = x1; } p.lineTo(w - 6, h - 2); p.closePath(); });
    sheet(g, path, col, 6);
  }
  // printed night scenery on the lower half of a wall (the text keeps the top)
  function wallNight(seed, tint = '#2E3A66') {
    return (g, w, h) => {
      const y0 = h * .52, rnd = U.mulberry32(seed);
      g.save(); g.beginPath(); g.rect(40, y0 - 60, w - 80, h - y0 + 20); g.clip();
      const sk = g.createLinearGradient(0, y0 - 60, 0, h); sk.addColorStop(0, 'rgba(46,58,102,0)'); sk.addColorStop(.3, U.rgba(tint, .55)); sk.addColorStop(1, U.rgba(tint, .8)); g.fillStyle = sk; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,240,200,${.3 + rnd() * .5})`; g.beginPath(); g.arc(rnd() * w, y0 + rnd() * (h * .3), 1.5 + rnd() * 2, 0, 7); g.fill(); }
      for (let i = 0; i < 4; i++) batShape(g, 100 + rnd() * (w - 200), y0 + 30 + rnd() * 120, 1 + rnd(), 'rgba(30,24,50,.55)');
      g.fillStyle = 'rgba(30,24,50,.65)'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * .82); for (let x = 0; x <= w; x += 60) g.quadraticCurveTo(x + 30, h * .78 - rnd() * 30, x + 60, h * .82); g.lineTo(w, h); g.fill();
      for (let i = 0; i < 3; i++) { const x = 140 + rnd() * (w - 280), y = h * .86; g.fillStyle = '#E07A2E'; g.beginPath(); g.ellipse(x, y, 26, 20, 0, 0, 7); g.fill(); g.fillStyle = '#FFE08A'; g.beginPath(); g.moveTo(x - 12, y - 4); g.lineTo(x - 6, y - 10); g.lineTo(x - 2, y - 4); g.fill(); g.beginPath(); g.moveTo(x + 2, y - 4); g.lineTo(x + 6, y - 10); g.lineTo(x + 12, y - 4); g.fill(); g.fillRect(x - 10, y + 4, 20, 4); }
      g.restore();
    };
  }

  /* ---------------- grounds (base-disc sectors) ---------------- */
  const at = (cx, px, a, d) => [cx + Math.cos(a) * d * px, cx + Math.sin(a) * d * px];
  const nightGround = (color, cols, n = 160, kind = 'blade') => ({ color, paint(g, cx, px, a0, a1, rnd) {
    for (let i = 0; i < n; i++) { const a = a0 + rnd() * (a1 - a0), d = .15 + rnd() * .92, [x, y] = at(cx, px, a, d), col = cols[i % cols.length];
      if (kind === 'blade') { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - 12); g.stroke(); }
      else if (kind === 'leaf') { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 12, 5, rnd() * 3, 0, 7); g.fill(); }
      else if (kind === 'stone') { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 16 + rnd() * 10, 10 + rnd() * 6, rnd() * 3, 0, 7); g.fill(); }
      else if (kind === 'wave') { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
    for (let i = 0; i < 20; i++) { const a = a0 + rnd() * (a1 - a0), d = .2 + rnd() * .85, [x, y] = at(cx, px, a, d); g.fillStyle = 'rgba(255,230,140,.75)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  } });
  const GROUND = {
    grass: nightGround('#3F5E42', ['rgba(140,190,120,.35)', 'rgba(20,40,20,.35)']),
    forest: nightGround('#34503A', ['rgba(200,120,60,.5)', 'rgba(170,80,50,.45)', 'rgba(90,130,70,.5)'], 160, 'leaf'),
    cobble: nightGround('#5A4E6A', ['rgba(255,255,255,.12)', 'rgba(20,10,30,.2)'], 120, 'stone'),
    mist: nightGround('#2C3E36', ['rgba(220,230,240,.12)', 'rgba(140,170,140,.3)']),
    village: nightGround('#4A5560', ['rgba(255,255,255,.1)', 'rgba(20,20,30,.2)'], 120, 'stone'),
    sea: nightGround('#2E5A86', ['rgba(255,255,255,.35)', 'rgba(160,210,240,.35)'], 120, 'wave'),
    street: nightGround('#3E3452', ['rgba(224,122,46,.55)', 'rgba(200,90,40,.5)', 'rgba(140,100,160,.4)'], 140, 'leaf')
  };

  /* ---------------- rooms ---------------- */
  const flap = (m, t, sp = 14) => { m.userData.sx = .35 + .65 * Math.abs(Math.sin(t * sp + m.position.x * 9)); };
  // a glow sprite that follows a piece (art fraction u across, v down from top)
  function follow(r, m, u, v, size, col, op = .5) { const s = r.glow(0, 0, 0, size, col, op); r.fx.push(() => { const ud = m.userData, ph = ud.ct.c.height / LPX, pw = ud.ct.c.width / LPX; s.position.set(m.position.x + (u - .5) * pw / (r.spread || 1), m.position.y + (1 - v) * ph - ud.ct.pad / LPX, m.position.z + .01); s.visible = m.visible; }); return s; }
  const knock = () => [0, .18, .36].forEach(d => { SFX.noise({ type: 'lowpass', f: 380, dur: .05, vol: .3, delay: d }); SFX.tone({ f: 120, f2: 80, dur: .06, vol: .2, delay: d }); });
  const drum = () => { SFX.tone({ f: 110, f2: 60, dur: .18, vol: .22 }); SFX.noise({ type: 'lowpass', f: 300, dur: .08, vol: .2 }); };
  const dong = (v = .1) => { SFX.tone({ f: 392, dur: .05, rel: 2.2, vol: v, type: 'triangle' }); SFX.tone({ f: 784.5, dur: .03, rel: 1.6, vol: v * .4 }); };
  function wuwu(r, x, z, h, lines) {
    r.wuwu = r.piece('wuwu', x, z, h); r.wglow = follow(r, r.wuwu, .5, .64, h * 1.1, 0xFFC060, .32);
    r.taps.push({ m: r.wuwu, say: lines, snd: 'lamp', role: '芜芜' });
    r.fx.push((dt, t) => { r.wglow.material.opacity = .3 + .08 * Math.sin(t * 9) * Math.sin(t * 5.3); });
    return r.wuwu;
  }
  function sparks(r, x, y, z, rate, gain = () => 1) { let acc = 0; r.fx.push(dt => { const g0 = gain(); if (g0 < .2 || !ST.open) return; acc += dt * rate * g0; while (acc > 1) { acc--; const p = r.local(x + (Math.random() - .5) * .06, y, z); emit(scene, p.x, p.y, p.z, { kind: 'glow', vy: .12 + Math.random() * .08, vx: (Math.random() - .5) * .04, drag: .4, size: .016 + Math.random() * .012, life: .9 + Math.random() * .5, twinkle: 8, color: Math.random() < .5 ? 0xFFB050 : 0xFFE08A }); } }); }

  const ROOMS = [
    { title: '萨温节的篝火', pano: { top: '#16203F', bot: '#3E507E', key: 'hills', seed: 11, frac: .8, hazeY: .22, hazeH: .7 }, action: '点篝火', hintLine: '点燃篝火，迎接冬天', dur: 3.2, ground: GROUND.grass,
      text: ['两千年前，秋天收完了', '最后一捆麦子，', '凯尔特人点起篝火，', '迎接冬天。'],
      hint: ['点起篝火，', '两个世界的门变薄啦。'],
      bed: { type: 'bandpass', f: 1900, q: 1.6, lfo: 13, lfoDepth: 900, vol: .03 }, wallL: wallNight(1), wallR: wallNight(2),
      build(r) {
        r.layer(.46, .4, (g, w, h, px) => place(g, 'huts', w / 2, h - 4, .3 * px));
        r.doors = [r.glowFixed(-.075, BH + .07, .47, .1, 0xFFC060, 0), r.glowFixed(.07, BH + .07, .47, .1, 0xFFC060, 0)];
        r.brid = r.piece('bridRef', -.18, .72, .4);
        r.pile = r.piece('woodpile', .1, .7, .16); r.fire = r.piece('bonfire', .1, .7, .25, { hidden: true });
        r.fg = r.glow(.1, BH + .14, .72, .5, 0xFFA040, 0);
        wuwu(r, .3, .82, .14, ['我的故事，要从这堆火讲起。', '那时候，我还没出生呢！']);
        r.taps.push({ m: r.brid, role: '布丽德' }, { m: r.pile, act: () => act(r.k) }, { m: r.fire, act: () => SFX.noise({ type: 'bandpass', f: 1400, dur: .4, vol: .08, q: .8 }) });
        r.lit = 0; sparks(r, .1, BH + .2, .72, 9, () => r.lit);
        r.update = (dt, t) => { const f = .8 + .2 * Math.sin(t * 13) * Math.sin(t * 7.3); r.fg.material.opacity = .55 * f * r.lit; r.doors.forEach((d, i) => d.material.opacity = U.clamp(r.lit * 1.6 - i * .4, 0, 1) * .7); if (r.lit > .5 && nearestRoom() === r.k) FXS.lampReq = 1.08; };
      },
      act(r) {
        SFX.noise({ type: 'bandpass', f: 1600, dur: 1.2, vol: .1, q: .6 }); whoosh(.5);
        after(.5, () => { r.pile.visible = false; r.fire.visible = true; startHop(r.fire); FXS.flash = .2; starburst(r.fire, .14, .4); burstAt(r.fire, { dy: .15, n: 30, speed: .35, up: .1, size: .03, life: 1, colors: [0xFFB050, 0xFFE08A, 0xFFFFFF] }); });
        tween(1.4, q => { r.lit = q; });
        after(1.4, () => { say(r.brid, '篝火好暖和！冬天要来啦！'); voice('girl'); startHop(r.brid); });
      },
      reset(r) { r.pile.visible = true; r.fire.visible = false; r.lit = 0; }
    },
    { title: '戴面具的人', pano: { top: '#121933', bot: '#2E3D66', key: 'woods', stars: 110, seed: 22, frac: .72, bats: [[.3, .14, 1.6], [.66, .18, 1.2]] }, action: '戴面具', hintLine: '戴上面具，和精灵一起跳舞', dur: 3.2, ground: GROUND.forest,
      text: ['传说这一夜，', '淘气的精灵会溜出来。', '人们戴上面具跳舞，', '让精灵以为是自己人。'],
      hint: ['戴上面具，', '扮成精灵的样子。'],
      bed: { type: 'bandpass', f: 1900, q: 1.6, lfo: 11, lfoDepth: 900, vol: .03 }, wallL: wallNight(3), wallR: wallNight(4),
      build(r) {
        r.layer(.48, .3, (g, w, h, px) => place(g, 'bonfire', w / 2, h - 4, .26 * px));
        r.fg = r.glow(0, BH + .14, .5, .55, 0xFFA040, .5); sparks(r, 0, BH + .2, .5, 8);
        r.dad = r.piece('dadDrum', -.22, .72, .44); r.dadM = r.piece('dadMask', -.22, .72, .44, { hidden: true });
        r.brid = r.piece('bridRef', -.04, .78, .38); r.bridM = r.piece('bridMask', -.04, .78, .38, { hidden: true });
        r.sp1 = r.piece('spiritsPeek', .22, .7, .17, { y: .12 }); r.sp2 = r.piece('spiritsDance', .22, .7, .19, { y: .12, hidden: true });
        wuwu(r, .33, .86, .11, ['这就是扮装最早的样子！']);
        r.taps.push({ m: r.dad, role: '爸爸', act: () => { drum(); after(.2, drum); } }, { m: r.dadM, role: '爸爸', act: () => { drum(); after(.2, drum); after(.4, drum); } },
          { m: r.brid, role: '布丽德' }, { m: r.bridM, role: '布丽德' },
          { m: r.sp1, role: '精灵' }, { m: r.sp2, role: '精灵' });
        r.masked = false;
        r.update = (dt, t) => { r.fg.material.opacity = .45 + .1 * Math.sin(t * 13) * Math.sin(t * 7); r.sp1.userData.dy = Math.sin(t * 1.6) * .012; r.sp2.userData.dy = Math.abs(Math.sin(t * 3)) * .02; r.sp2.position.x = .22 + Math.sin(t * 2.2) * .02; if (!r.masked && nearestRoom() === r.k && ST.open) FXS.lampReq = .82; };
      },
      act(r) {
        drum(); [.25, .5, .75].forEach(d => after(d, drum));
        after(.6, () => { r.masked = true; r.dad.visible = false; r.dadM.visible = true; r.brid.visible = false; r.bridM.visible = true; startHop(r.dadM); startHop(r.bridM); });
        after(1.2, () => { r.sp1.visible = false; r.sp2.visible = true; startHop(r.sp2); FXS.flash = .14; burstAt(r.sp2, { dy: .1, n: 24, speed: .3, size: .028, life: 1, colors: [0xFFFFFF, 0xFFE08A, 0xDDE6FF] }); chime([784, 988, 1175]); say(r.sp2, '原来是自己人！一起跳！'); voice('spirit'); });
      },
      reset(r) { r.masked = false; r.dad.visible = r.brid.visible = r.sp1.visible = true; r.dadM.visible = r.bridM.visible = r.sp2.visible = false; }
    },
    { title: '万圣夜的名字', pano: { top: '#2C2350', bot: '#E0A266', key: 'roofs', stars: 30, seed: 33, frac: .66, glow: 'rgba(255,210,140,.55)' }, action: '敲钟', hintLine: '点亮蜡烛，敲响钟声', dur: 3.6, ground: GROUND.cobble,
      text: ['很多年后，11月1日', '成了「万圣节」，', '前一晚叫「万圣夜」，', '念着念着就成了 Halloween。'],
      hint: ['点亮蜡烛，', '听，钟声响了。'],
      bed: { f: 600, lfo: .15, lfoDepth: 240, vol: .02 }, wallL: wallNight(5, '#4A3A6E'), wallR: wallNight(6, '#4A3A6E'),
      build(r) {
        r.tower = r.piece('tower', -.17, .46, .62); r.clipWalls(r.tower);
        r.bell = r.piece('bell', -.17, .465, .055, { y: .46 });
        bannerArt(); r.banner = r.piece('bannerTxt', .1, .44, .085, { y: .5, hidden: true });
        r.monk = r.piece('monk', -.02, .74, .36); r.mg = follow(r, r.monk, .77, .42, .07, 0xFFD27A, .5);
        r.candles = [.1, .16, .22, .28].map((x, i) => { const off = r.piece('candleOff', x, .8 - i * .01, .14), on = r.piece('candleOn', x, .8 - i * .01, .14, { hidden: true }); const g = follow(r, on, .5, .06, .06, 0xFFD27A, .6); return { off, on, g }; });
        wuwu(r, .32, .86, .12, ['名字原来是这么来的！', '念快一点：Halloween！']);
        r.swing = 0;
        r.taps.push({ m: r.bell, act: () => { r.swing = .6; dong(.09); } }, { m: r.monk, role: '小修士' });
        r.update = (dt, t) => { r.swing = Math.max(0, r.swing - dt * .35); r.bell.rotation.z = Math.sin(t * 5) * .3 * r.swing; r.candles.forEach((c, i) => c.g.material.opacity = .5 + .15 * Math.sin(t * 9 + i * 2)); };
      },
      act(r) {
        r.candles.forEach((c, i) => after(.3 + i * .4, () => { c.off.visible = false; c.on.visible = true; startHop(c.on); burstAt(c.on, { dy: .14, n: 8, speed: .1, size: .02, life: .6 }); SFX.tone({ f: 1046 + i * 130, dur: .04, rel: .6, vol: .04 }); }));
        after(2.1, () => { r.swing = 1; dong(.12); after(1.1, () => dong(.09)); FXS.flash = .14; r.banner.visible = true; startHop(r.banner); starburst(r.bell, .02, .35); chime([1047, 1319, 1568]); });
      },
      reset(r) { r.candles.forEach(c => { c.off.visible = true; c.on.visible = false; }); r.banner.visible = false; }
    },
    { title: '吝啬鬼杰克', pano: { top: '#0E1430', bot: '#2A3660', key: 'mistField', stars: 70, seed: 44, frac: .78, noHaze: true }, action: '提灯人', hintLine: '看看谁从苹果树后走出来', dur: 3.4, ground: GROUND.mist,
      text: ['爱尔兰人爱讲', '吝啬鬼杰克的故事。', '后来他只好提着萝卜灯，', '在夜里游荡。'],
      hint: ['苹果树后面，', '有一点灯光……'],
      bed: { f: 420, lfo: .1, lfoDepth: 200, vol: .035 }, wallL: wallNight(7, '#1F2A4E'), wallR: wallNight(8, '#1F2A4E'),
      build(r) {
        r.tree = r.piece('appleTree', .12, .5, .6); r.clipWalls(r.tree);
        r.imp = r.piece('imp', .26, .52, .14, { y: .3 });
        r.jack = r.piece('jackLamp', .34, .48, .42); r.clipX(r.jack, .1, true); r.clipWalls(r.jack);
        r.lamp = follow(r, r.jack, .1, .57, .12, 0xFFC060, 0);
        r.layer(.64, .12, (g, w, h, px) => { g.globalAlpha = .9; bandArt(g, 'mist', w, h, .98); g.globalAlpha = 1; });
        wuwu(r, -.28, .8, .13, ['那盏灯……是我的祖先！', '雾好大，我有点怕。']);
        r.taps.push({ m: r.imp, role: '小恶魔', act: rr => { rr.kick = 1.2; } },
          { m: r.jack, role: '杰克' });
        r.kick = 0; r.out = 0;
        r.update = (dt, t) => { r.kick = Math.max(0, r.kick - dt * .6); r.imp.rotation.z = Math.sin(t * 2.4) * (.06 + .18 * r.kick); r.lamp.material.opacity = (.5 + .12 * Math.sin(t * 8)) * r.out; if (nearestRoom() === r.k && ST.open) FXS.lampReq = .74; };
      },
      act(r) {
        SFX.tone({ f: 110, f2: 80, dur: .9, vol: .12, type: 'sawtooth', lp: 500 });
        tween(.6, q => { r.out = q; });
        tween(2.2, (q, k) => { r.jack.position.x = U.lerp(.34, -.08, q); r.jack.userData.dy = Math.abs(Math.sin(k * Math.PI * 5)) * .008; if (Math.floor(k * 10) !== r._st) { r._st = Math.floor(k * 10); SFX.noise({ type: 'lowpass', f: 420, dur: .05, vol: .1 }); } }, () => {
          r.jack.userData.dy = 0; FXS.shake = .5; startHop(r.wuwu); say(r.jack, '嘿嘿，说话算话哦。'); voice('man');
          after(1.4, () => { say(r.wuwu, '那盏灯……是我的祖先！'); voice('lamp'); });
        }, U.easeInOutCubic);
      },
      reset(r) { r.jack.position.x = .34; r.out = 0; }
    },
    { title: '挨家讨饼', pano: { top: '#18213F', bot: '#3E4A7A', moon: [.2, .15, 50], key: 'village', seed: 55, frac: .7 }, action: '敲门', hintLine: '敲敲门，唱首歌换灵魂饼', dur: 3.2, ground: GROUND.village,
      text: ['后来，孩子们', '挨家挨户唱歌，', '换一块香香的「灵魂饼」，', '提着萝卜灯照路。'],
      hint: ['敲敲门，', '奶奶会开门哦。'],
      bed: { type: 'bandpass', f: 3600, q: 7, lfo: 5, lfoDepth: 700, vol: .01 }, wallL: wallNight(9), wallR: wallNight(10),
      build(r) {
        r.cotC = r.piece('cottageC', .13, .5, .36); r.cotO = r.piece('cottageO', .13, .5, .36, { hidden: true }); r.clipWalls(r.cotC); r.clipWalls(r.cotO);
        r.dg = r.glow(.12, BH + .12, .52, .2, 0xFFC060, 0);
        r.gran = r.piece('granny', .26, .58, .26, { hidden: true });
        r.tommy = r.piece('tommy', -.26, .74, .36); r.ella = r.piece('ella', -.1, .78, .38); follow(r, r.ella, .86, .58, .06, 0xFFC060, .45);
        r.bE = r.piece('basketE', .04, .84, .1); r.bF = r.piece('basketF', .04, .84, .11, { hidden: true });
        r.taps.push({ m: r.tommy, role: '汤米' }, { m: r.ella, role: '艾拉' }, { m: r.gran, role: '老奶奶' }, { m: r.cotC, act: () => act(r.k) });
      },
      act(r) {
        knock(); say(r.tommy, '叮咚，我们来唱歌啦！'); voice('kid'); startHop(r.tommy);
        after(.9, () => { r.cotC.visible = false; r.cotO.visible = true; r.dg.material.opacity = .7; SFX.noise({ type: 'lowpass', f: 700, f2: 300, dur: .4, vol: .1 }); });
        after(1.3, () => { r.gran.visible = true; startHop(r.gran); say(r.gran, '拿去吧，热乎乎的灵魂饼。'); voice('gran'); });
        after(2.4, () => { r.bE.visible = false; r.bF.visible = true; startHop(r.bF); burstAt(r.bF, { dy: .08, n: 20, speed: .25, size: .025, life: 1, colors: [0xFFD27A, 0xFFFFFF, 0xE8A050] }); chime([784, 988, 1175, 1568]); });
      },
      reset(r) { r.cotC.visible = true; r.cotO.visible = false; r.gran.visible = false; r.dg.material.opacity = 0; r.bE.visible = true; r.bF.visible = false; }
    },
    { title: '漂洋过海', pano: { top: '#121C42', bot: '#36547E', moon: [.24, .16, 54], stars: 120, key: 'waves', frac: .34, seed: 66, noHaze: true, back: ['shore', .72, .2, .58] }, action: '传火苗', hintLine: '把火苗传给新大陆的南瓜', dur: 3.2, ground: GROUND.sea,
      text: ['后来，很多爱尔兰人', '坐大船去了美洲。', '萝卜不好找，南瓜又大又圆：', '「用南瓜雕灯吧！」'],
      hint: ['接住火苗，', '南瓜灯诞生啦！'],
      bed: { f: 320, lfo: .12, lfoDepth: 200, vol: .045 }, wallL: wallNight(11, '#22406E'), wallR: wallNight(12, '#22406E'),
      build(r) {
        r.ship = r.piece('ship', -.13, .44, .3, { y: -.02 });
        r.sean = r.piece('sean', -.1, .435, .09, { y: .1 }); r.taps.push({ m: r.sean, role: '肖恩' });
        r.layer(.5, .1, (g, w, h) => bandArt(g, 'waves', w, h, .99));
        wuwu(r, -.22, .78, .14, ['接住我的火苗！', '萝卜不好找……']);
        r.chP = r.piece('chengPlain', .22, .78, .17); r.chL = r.piece('chengLit', .22, .78, .17, { hidden: true }); r.cg = follow(r, r.chL, .5, .6, .2, 0xFFB040, 0);
        r.flame = r.glow(0, 0, 0, .07, 0xFFC060, 0);
        r.taps.push({ m: r.ship, act: rr => { rr.rock = 1; } }, { m: r.chL, role: '橙橙' }, { m: r.chP, act: () => act(r.k) });
        r.rock = 0;
        r.update = (dt, t) => { r.rock = Math.max(0, r.rock - dt * .7); r.ship.userData.dy = Math.sin(t * 1.6) * .008; r.sean.userData.dy = r.ship.userData.dy; r.sean.rotation.z = r.ship.rotation.z * .6; r.ship.rotation.z = Math.sin(t * 1.2) * (.03 + .06 * r.rock); r.cg.material.opacity = r.chL.visible ? .35 + .08 * Math.sin(t * 8) : 0; };
      },
      act(r) {
        say(r.wuwu, '萝卜不好找，那就……接住我的火苗！'); voice('lamp'); startHop(r.wuwu);
        const a = new THREE.Vector3(-.22, BH + .09, .8), b = new THREE.Vector3(.22, BH + .1, .8);
        tween(1.4, q => { r.flame.position.set(U.lerp(a.x, b.x, q), U.lerp(a.y, b.y, q) + Math.sin(q * Math.PI) * .16, .8); r.flame.material.opacity = q < .98 ? .9 : 0; if (Math.random() < .5) { const p = r.local(r.flame.position.x, r.flame.position.y, .8); emit(scene, p.x, p.y, p.z, { kind: 'glow', vy: -.01, size: .02, life: .6, twinkle: 10, color: 0xFFD27A }); } }, () => {
          r.chP.visible = false; r.chL.visible = true; startHop(r.chL); FXS.flash = .3; FXS.shake = .4; starburst(r.chL, .1, .4); burstAt(r.chL, { dy: .1, n: 30, speed: .4, up: .1, size: .03, life: 1.1, colors: [0xFFB040, 0xFFE08A, 0xFFFFFF] }); chime([659, 784, 1047, 1319]);
          after(.6, () => { say(r.chL, '我……我亮了？'); voice('pump'); });
        }, x => x);
      },
      reset(r) { r.chP.visible = true; r.chL.visible = false; }
    },
    { title: '不给糖就捣蛋', pano: { top: '#1A1944', bot: '#4A3E78', moon: [.8, .14, 52], key: 'street', seed: 77, frac: .72, bats: [[.2, .16, 1.4], [.34, .12, 1.1]] }, action: '敲门', hintLine: '敲敲门：不给糖，就捣蛋！', dur: 3.4, ground: GROUND.street,
      text: ['今天，每到10月31日，', '孩子们扮成女巫、', '幽灵和小猫，敲敲门：', '「不给糖，就捣蛋！」'],
      hint: ['原来每一盏灯，', '都在照亮回家的路。'],
      bed: { f: 700, lfo: .2, lfoDepth: 300, vol: .025 }, wallL: wallNight(13, '#3A2E62'), wallR: wallNight(14, '#3A2E62'),
      build(r) {
        r.porC = r.piece('porchC', .13, .5, .44); r.porO = r.piece('porchO', .13, .5, .44, { hidden: true }); r.clipWalls(r.porC); r.clipWalls(r.porO);
        r.dg = r.glow(.13, BH + .16, .52, .24, 0xFFC060, 0);
        r.jl = [[-.24, .56, .07], [-.1, .58, .06], [.33, .6, .06]].map(([x, z, h]) => { const m = r.piece('jackSmall', x, z, h); const g = follow(r, m, .5, .55, h * 1.2, 0xFFA040, 0); return { m, g }; });
        r.witch = r.piece('witch', -.27, .74, .34); r.ghost = r.piece('ghost', -.12, .79, .32); r.catKid = r.piece('catKid', .02, .83, .28);
        wuwu(r, .2, .85, .11, ['原来每一盏灯，都在照亮回家的路。', '万圣节快乐！']);
        r.cheng = r.piece('chengLit', .3, .83, .14); r.chg = follow(r, r.cheng, .5, .6, .16, 0xFFB040, .32);
        r.taps.push({ m: r.witch, role: '孩子们', act: rr => { burstAt(rr.witch, { dy: .2, n: 16, speed: .25, size: .024, life: .8, colors: [0xFFE08A, 0xC9A0FF] }); } },
          { m: r.ghost, role: '孩子们' }, { m: r.catKid, role: '孩子们', act: rr => { SFX.tone({ f: 700, f2: 1100, dur: .2, vol: .05, type: 'triangle' }); } },
          { m: r.cheng, role: '橙橙' });
        r.update = (dt, t) => { r.chg.material.opacity = .3 + .08 * Math.sin(t * 8); };
      },
      act(r) {
        knock(); after(.4, () => { say(r.ghost, '不给糖，就捣蛋！'); voice('kid'); [r.witch, r.ghost, r.catKid].forEach((m, i) => after(i * .12, () => startHop(m))); });
        after(1.1, () => {
          r.porC.visible = false; r.porO.visible = true; r.dg.material.opacity = .75; FXS.flash = .2;
          for (let i = 0; i < 80; i++) { const p = r.local((Math.random() - .5) * .6, .8 + Math.random() * .15, .6); emit(scene, p.x, p.y, p.z, { kind: 'confetti', vx: (Math.random() - .5) * .3, vy: -.05, grav: .25, drag: .6, size: .03, life: 2.4, color: [0xE07A2E, 0x7A5A9A, 0xF2D48A, 0x9CCFB8, 0xFFFFFF][i % 5] }); }
          chime([784, 988, 1175, 1568, 2093]);
        });
        r.jl.forEach(({ g }, i) => after(1.4 + i * .3, () => { g.material.opacity = .45; SFX.tone({ f: 880 + i * 220, dur: .04, rel: .6, vol: .04 }); }));
        after(2.6, () => { say(r.wuwu, '原来每一盏灯，都在照亮回家的路。'); voice('lamp'); startHop(r.wuwu); });
      },
      reset(r) { r.porC.visible = true; r.porO.visible = false; r.dg.material.opacity = 0; r.jl.forEach(({ g }) => g.material.opacity = 0); }
    }
  ];
  // the banner with its words printed on (drawn once, when room 3 is built)
  function bannerArt() { if (IM.banner && !IM.bannerTxt) art('bannerTxt', 1200, Math.round(1200 * IM.banner.height / IM.banner.width), (g, w, h) => { g.drawImage(IM.banner, 0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4A2E6A'; const tx = "All Hallows' Eve → Halloween"; let fs = Math.round(h * .26); g.font = `${fs}px ${FONT}`; const mw = g.measureText(tx).width; if (mw > w * .62) { fs = Math.floor(fs * w * .62 / mw); g.font = `${fs}px ${FONT}`; } g.fillText(tx, w / 2, h * .5); }); }

  /* ---------------- film: a tour ---------------- */
  function filmTimeline(A) {
    const V = A.VIEW, view = (az = 0, d = 0, ty = 0) => [V.tx, V.ty + ty, V.tz, V.az + az, V.el, V.dist + d];
    const acts = [], shots = [], K = (t, v) => shots.push(A.K(t, ...v));
    K(0, [.44, .55, .2, .34, .12, 2.3]); K(1.25, [.44, .54, .2, .2, .15, 2.42]);
    acts.push([1.1, () => A.press('act')], [1.2, () => A.openBook()]);
    K(2.6, [.1, .45, .2, .1, .3, 3.2]); K(4.05, view(.03));
    let T = 4.2, end = 0;
    const firstTap = [r => r.brid, r => r.sp1, r => r.monk, r => r.imp, r => r.ella, r => r.wuwu, r => r.cheng];
    for (let k = 0; k < A.N; k++) {
      const d = ROOMS[k].dur;
      acts.push([T + .6, () => A.poke(k, firstTap[k](A.rooms[k]), 0)], [T + 1.9, () => A.press('act')], [T + 2.0, () => A.act(k)]);
      const nx = T + 2.0 + d + .4;
      K(T + 1.8, view(-.04, -.04)); K(T + 2.0 + d * .55, view(.05, -.18, -.02)); K(nx - .15, view(-.02, -.02));
      if (k < A.N - 1) { acts.push([nx, () => A.press('next')], [nx + .05, () => A.goTo(k + 1)]); K(nx + .75, view(.04, .12)); T = nx + 1.45; }
      else end = nx;
    }
    acts.push([end, () => A.spin(.32)]);
    K(end + 1.6, [0, .36, .05, .28, .42, 3.4]); K(end + 6, [0, .36, .05, -.12, .48, 3.7]);
    return { acts, shots, end };
  }
  function speaker(k, role, r) {
    const vis = (...ms) => ms.find(m => m && m.visible) || null;
    const map = {
      0: { '布丽德': r.brid, '芜芜': r.wuwu },
      1: { '精灵': vis(r.sp2, r.sp1), '爸爸': vis(r.dadM, r.dad), '布丽德': vis(r.bridM, r.brid), '芜芜': r.wuwu },
      2: { '小修士': r.monk, '芜芜': r.wuwu },
      3: { '小恶魔': r.imp, '杰克': r.jack, '芜芜': r.wuwu },
      4: { '汤米': r.tommy, '老奶奶': vis(r.gran), '艾拉': r.ella },
      5: { '肖恩': r.sean, '芜芜': r.wuwu, '橙橙': vis(r.chL, r.chP) },
      6: { '孩子们': r.ghost, '橙橙': r.cheng, '芜芜': r.wuwu }
    }[k] || {};
    return map[role] || null;
  }
  // film/plan.json (injected as FILM_PLAN): voiced timeline made by the planner from the dub clips
  function planTimeline(A) {
    const P = window.FILM_PLAN, acts = [], shots = P.shots.map(v => A.K(...v));
    for (const a of P.acts) acts.push([a.t, () => {
      if (a.do === 'open') A.openBook(); else if (a.do === 'goto') A.goTo(a.k); else if (a.do === 'act') A.act(a.k); else if (a.do === 'spin') A.spin(a.v); else if (a.do === 'press') A.press(a.id);
      else if (a.do === 'say') { const r = A.rooms[a.k], m = speaker(a.k, a.role, r); if (m) { startHop(m); A.say(m, a.text, a.life); } else A.sub(a.text, a.life); }
    }]);
    return { acts, shots };
  }
  function filmActs(A) { return window.FILM_PLAN ? planTimeline(A).acts : filmTimeline(A).acts; }
  function filmShots(A) { return window.FILM_PLAN ? planTimeline(A).shots : filmTimeline(A).shots; }
