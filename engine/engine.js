/* ===================== popup-studio · pop-up book engine =====================
   One story file (see templates/story_template.js) is injected at the STORY marker.
   Film mode: window.FILM_MODE = true; a voiced film adds window.FILM_PLAN (built by tools/plan.py). */
(() => {
  const PW = 1.0, PD = 1.4, LT = .012;                      // page width, depth, leaf thickness
  const BETA = 72 * Math.PI / 180;                          // V-fold glue line angle from the spine
  const ZF = PD / 2, CW = 2048, PG_W = 1024, PG_H = 1434;
  const LAY = { back: { L: .9, H: .68, z0: -.06 }, mid: { L: .84, H: .52, z0: .12 }, front: { L: .64, H: .4, z0: .3 } };
  const FONT = '"ZCOOL XiaoWei","Songti SC","STSong","SimSun",serif';
/*@STORY@*/
  const NL = STORY.length - 1;                              // turnable leaves = spreads (the story decides; 5 is the house format)

  /* ---------------- utilities ---------------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const IM = {};
  let grainTile = null;
  function grain(g, w, h, a = .06) {
    if (!grainTile) { grainTile = mk(128, 128); const t = grainTile.getContext('2d'), d = t.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } t.putImageData(d, 0, 0); }
    g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  }
  function fibres(g, w, h, n, col) {
    const rnd = U.mulberry32(n); g.save(); g.globalCompositeOperation = 'source-atop'; g.lineCap = 'round';
    for (let i = 0; i < w * h / 2400; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 6 + rnd() * 22; g.strokeStyle = `rgba(${col},${.05 + rnd() * .08})`; g.lineWidth = .7 + rnd(); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + rnd() * 3, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.restore();
  }
  function silhouette(src, w, h, col) { const c = mk(w, h), g = c.getContext('2d'); g.drawImage(src, 0, 0, w, h); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, w, h); return c; }
  // a die-cut paper piece: white paper core around the printed art, with a faint cut edge
  const cutCache = new Map();
  function cutout(key, h, rim = 7, flip = false) {
    const id = key + '|' + Math.round(h) + '|' + rim + '|' + flip;
    if (cutCache.has(id)) return cutCache.get(id);
    const img = IM[key], w = h * img.width / img.height, pad = rim + 3;
    const c = mk(w + pad * 2, h + pad * 2), g = c.getContext('2d');
    const white = silhouette(img, w, h, '#FFFBF1'), grey = silhouette(img, w, h, 'rgba(60,50,40,1)');
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.globalAlpha = .28;
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; g.drawImage(grey, pad + Math.cos(a) * (rim + 1.6), pad + Math.sin(a) * (rim + 1.6)); }
    g.globalAlpha = 1;
    for (const r of [rim, rim * .55]) for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; g.drawImage(white, pad + Math.cos(a) * r, pad + Math.sin(a) * r); }
    g.drawImage(img, pad, pad, w, h);
    const res = { c, pad, w, h };
    cutCache.set(id, res);
    return res;
  }
  // draw a cut-out on a canvas: centre x, baseline y (bottom of the art), art height
  function place(g, key, cx, by, h, opt = {}) {
    const ct = cutout(key, h, opt.rim || 7, opt.flip);
    const x = cx - ct.c.width / 2, y = by - h - ct.pad;
    g.drawImage(ct.c, x, y);
    return { x: x + ct.pad, y: y + ct.pad, w: ct.w, h: ct.h, at(u, v) { return [this.x + u * this.w, this.y + v * this.h]; } };
  }
  const P = fn => { const p = new Path2D(); fn(p); return p; };
  function star4(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .3 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
  function starField(g, x0, y0, w, h, n, seed, big = 1) {
    const rnd = U.mulberry32(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * w, y = y0 + rnd() * h, r = rnd();
      if (r > .9) star4(g, x, y, (6 + rnd() * 6) * big, '#FFE8A8');
      else { g.fillStyle = `rgba(255,246,220,${.4 + rnd() * .5})`; g.beginPath(); g.arc(x, y, (1 + rnd() * 2.2) * big, 0, 7); g.fill(); }
    }
  }
  function scallopTop(p, x0, x1, y, n, amp, seed = 1) {
    const rnd = U.mulberry32(seed), step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const xa = x0 + i * step, xb = xa + step, a = amp * (.6 + rnd() * .8); p.bezierCurveTo(xa + step * .05, y - a, xb - step * .05, y - a, xb, y + (rnd() - .5) * amp * .4); }
  }
  // the die-cut sky: an arched sheet with a cloud-scalloped top and a paper rim
  function skySheet(g, w, h, fill, seed, rim = 9) {
    const top = h * .14;
    const shape = P(p => { p.moveTo(28, h); p.lineTo(28, top + 40); scallopTop(p, 28, w - 28, top, 13, 34, seed); p.lineTo(w - 28, h); p.closePath(); });
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = 'rgba(60,50,40,.25)'; g.lineWidth = rim * 2 + 3; g.stroke(shape);
    g.strokeStyle = '#FFFBF1'; g.lineWidth = rim * 2; g.stroke(shape);
    g.fillStyle = fill; g.fill(shape);
    g.restore();
    return shape;
  }
  function moon(g, x, y, r) {
    const gr = g.createRadialGradient(x, y, r * .2, x, y, r * 2.4); gr.addColorStop(0, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill();
    g.fillStyle = '#FFF4D6'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(214,196,150,.45)'; for (const [dx, dy, rr] of [[-.3, -.2, .18], [.25, .1, .12], [-.05, .35, .1], [.35, -.35, .08]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r, 0, 7); g.fill(); }
  }
  function grassStrip(g, w, h, y, col, seed) {
    const rnd = U.mulberry32(seed);
    const p = P(q => { q.moveTo(0, h); q.lineTo(0, y); for (let x = 0; x <= w; x += 22) q.quadraticCurveTo(x + 11, y - 14 - rnd() * 26, x + 22, y + rnd() * 6); q.lineTo(w, h); q.closePath(); });
    g.save(); g.strokeStyle = '#FFFBF1'; g.lineWidth = 14; g.lineJoin = 'round'; g.stroke(p); g.fillStyle = col; g.fill(p); g.restore();
  }

  /* ---------------- printed pages ---------------- */
  function pageBase(s, side) {
    const c = mk(PG_W, PG_H), g = c.getContext('2d'), P0 = PAGE[s];
    const gr = g.createLinearGradient(0, 0, 0, PG_H); gr.addColorStop(0, P0.a); gr.addColorStop(1, P0.b);
    g.fillStyle = gr; g.fillRect(0, 0, PG_W, PG_H);
    pageDeco(g, s, side, U.mulberry32(s * 31 + (side === 'L' ? 1 : 2)));
    g.strokeStyle = P0.line; g.lineWidth = 3; g.strokeRect(34, 34, PG_W - 68, PG_H - 68); g.lineWidth = 1.5; g.strokeRect(46, 46, PG_W - 92, PG_H - 92);
    for (const [x, y] of [[34, 34], [PG_W - 34, 34], [34, PG_H - 34], [PG_W - 34, PG_H - 34]]) star4(g, x, y, 14, P0.star);
    fibres(g, PG_W, PG_H, s * 13, '255,255,255'); grain(g, PG_W, PG_H, .05);
    return [c, g];
  }
  function storyText(g, s) {
    const lines = STORY[s].text, dark = s !== 4;
    const y0 = 1236;
    g.save();
    // a soft paper label behind the text keeps it legible on any page colour
    g.fillStyle = dark ? 'rgba(255,248,232,.92)' : 'rgba(255,250,240,.88)';
    const box = P(p => { p.roundRect ? p.roundRect(56, y0, PG_W - 112, 176, 20) : p.rect(56, y0, PG_W - 112, 176); });
    g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 4; g.fill(box); g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(42,36,64,.25)'; g.lineWidth = 2; g.stroke(box);
    g.fillStyle = C.ink; g.font = `36px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    lines.forEach((l, i) => {
      if (i || /^[“"「『（(]/.test(l)) return g.fillText(l, 96, y0 + 40 + i * 48);
      // a gold drop-cap opens every page
      g.save(); g.fillStyle = C.gold; g.beginPath(); g.arc(122, y0 + 40, 27, 0, 7); g.fill(); star4(g, 146, y0 + 18, 8, '#F6DB98');
      g.fillStyle = '#2A2440'; g.font = `38px ${FONT}`; g.textAlign = 'center'; g.fillText(l[0], 122, y0 + 41); g.restore();
      g.fillText(l.slice(1), 160, y0 + 40);
    });
    g.font = `24px ${FONT}`; g.fillStyle = 'rgba(42,36,64,.5)'; g.textAlign = 'right'; g.fillText(`${s}`, PG_W - 88, y0 + 136);
    g.restore();
  }
  function tabSlot(g, s) {
    if (!STORY[s].tab) {
      // a dial page has no tab
      g.save(); g.fillStyle = 'rgba(255,248,232,.9)'; g.font = `30px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(STORY[s].dial || '转动 ↻', PG_W - 300, PG_H - 70); g.restore(); return;
    }
    const y = PG_H - 50;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect ? g.roundRect(260, y - 13, 600, 26, 13) : g.rect(260, y - 13, 600, 26); g.fill();
    g.setLineDash([10, 10]); g.strokeStyle = 'rgba(255,250,235,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(290, y); g.lineTo(830, y); g.stroke(); g.setLineDash([]);
    g.font = `34px ${FONT}`; g.fillStyle = '#FFF6E2'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.strokeText(STORY[s].tab + ' →', 46, y - 2); g.fillText(STORY[s].tab + ' →', 46, y - 2);
    g.restore();
  }
  function page(s, side) {
    const [c, g] = pageBase(s, side);
    if (side === 'L') storyText(g, s); else tabSlot(g, s);
    return c;
  }
  function deskTex() {
    const c = mk(512, 512), g = c.getContext('2d'); g.fillStyle = '#5E3C26'; g.fillRect(0, 0, 512, 512);
    const rnd = U.mulberry32(17);
    for (let y = 0; y < 512; y += 3) { g.fillStyle = `rgba(${rnd() < .5 ? '40,22,12' : '140,92,56'},${.05 + rnd() * .08})`; g.fillRect(0, y + Math.sin(y * .05) * 2, 512, 2); }
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(30,16,8,.28)'; g.fillRect(0, k * 128, 512, 2); }
    return c;
  }

  /* ---------------- pop-up layers (art) ---------------- */
  const layerCanvas = (spec) => { const c = mk(CW, CW * spec.H / (2 * spec.L)); return [c, c.getContext('2d')]; };
  /* ---------------- three.js scene ---------------- */
  let cv, renderer, scene, camera, W = 0, H = 0, ready = false, time = 0;
  let leaves = [], base, spreads = [], tabs = [], lamp;
  const cam = { az: 0, pol: .86, azT: 0, polT: .86, tx: .5, dist: 4, base: .86 };
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let storyEl, shownStory = -1, capEl, pgEl, hintEl, prevBtn, nextBtn, bubblesEl, lastPopped = -1, bubbles = [];
  let glowTex = null, rayTex = null, softTex = null, sparkTex = null;

  const gR = new THREE.Vector3(Math.sin(BETA), 0, Math.cos(BETA));
  const tmp = { gL: new THREE.Vector3(), c: new THREE.Vector3(), n: new THREE.Vector3(), ng: new THREE.Vector3() };
  function placePanels(layer, alpha) {
    const gL = tmp.gL.set(Math.sin(BETA) * Math.cos(alpha), Math.sin(BETA) * Math.sin(alpha), Math.cos(BETA));
    const c = tmp.c.crossVectors(gR, gL).negate();
    if (c.lengthSq() < 1e-8) c.set(Math.cos(BETA), 0, -Math.sin(BETA)); else c.normalize();
    const lift = LT + .0012 + layer.order * .0006;
    tmp.n.crossVectors(gR, c); layer.R.matrix.makeBasis(gR, c, tmp.n).setPosition(0, lift, layer.z0);
    tmp.ng.copy(gL).negate(); tmp.n.crossVectors(tmp.ng, c); layer.Lg.matrix.makeBasis(tmp.ng, c, tmp.n).setPosition(0, lift, layer.z0);
    layer.R.matrixWorldNeedsUpdate = layer.Lg.matrixWorldNeedsUpdate = true;
  }
  function tex(canvas) { const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1; return t; }
  function radialTex(stops) { const c = mk(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

  function makeLeaf(i, frontCanvas, backCanvas, isCover) {
    const pivot = new THREE.Group();
    const geo = new THREE.BoxGeometry(PW - .01, LT, PD); geo.translate(.005 + (PW - .01) / 2, LT / 2, 0);
    const edge = new THREE.MeshStandardMaterial({ color: isCover ? BOOK.coverHex : 0xF1E7D2, roughness: .9 });
    const front = new THREE.MeshStandardMaterial({ map: tex(frontCanvas), roughness: .82 });
    const bt = tex(backCanvas); bt.center.set(.5, .5); bt.rotation = Math.PI;
    const back = new THREE.MeshStandardMaterial({ map: bt, roughness: .82 });
    const mesh = new THREE.Mesh(geo, [edge, edge, front, back, edge, edge]);
    mesh.castShadow = true; mesh.receiveShadow = true; pivot.add(mesh); scene.add(pivot);
    return { pivot, mesh, theta: 0, target: 0, i, front, back };
  }
  function makeLayer(canvas, spec, order, altCanvas) {
    const { L, H } = spec, t = tex(canvas), tb = tex(silhouette(canvas, canvas.width, canvas.height, '#EFE4CC'));
    const ta = altCanvas ? tex(altCanvas) : null;
    const mkp = (left) => {
      const geo = new THREE.PlaneGeometry(L, H); geo.translate(left ? -L / 2 : L / 2, H / 2, 0);
      const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) { const u = uv.getX(k); uv.setX(k, left ? u * .5 : .5 + u * .5); }
      const fm = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, roughness: .85 }); fm.shadowSide = THREE.DoubleSide;
      const bm = new THREE.MeshStandardMaterial({ map: tb, alphaTest: .5, roughness: .95, side: THREE.BackSide });
      const grp = new THREE.Group(); grp.matrixAutoUpdate = false;
      const m1 = new THREE.Mesh(geo, fm), m2 = new THREE.Mesh(geo, bm);
      m1.castShadow = true; m1.receiveShadow = true; m2.receiveShadow = true;
      m1.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: .5, side: THREE.DoubleSide });
      grp.add(m1, m2);
      if (ta) { const am = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: ta, transparent: true, opacity: 0, roughness: .85, depthWrite: false, alphaTest: .02 })); am.position.z = .0008; am.receiveShadow = true; grp.add(am); grp.userData.alt = am; }
      return grp;
    };
    return { L, H, z0: spec.z0, order, R: mkp(false), Lg: mkp(true), cw: canvas.width, ch: canvas.height };
  }
  // panel-local coordinates for a pixel of a layer canvas
  function local(ly, px, py) { return { x: (px / ly.cw - .5) * 2 * ly.L, y: ly.H * (1 - py / ly.ch), panel: px >= ly.cw / 2 ? ly.R : ly.Lg }; }
  // a moving piece cut from an asset; size in layer pixels, pivot at (ax, ay) of the art
  function piece(ly, key, px, py, hPx, opt = {}) {
    const ct = cutout(key, hPx, opt.rim || 7, opt.flip), t = tex(ct.c);
    const s = 2 * ly.L / ly.cw, w = ct.c.width * s, h = ct.c.height * s;
    const ax = opt.ax == null ? .5 : opt.ax, ay = opt.ay == null ? 1 : opt.ay;   // default: bottom centre
    const axp = (ct.pad + ax * ct.w) / ct.c.width, ayp = (ct.pad + ay * ct.h) / ct.c.height;
    const geo = new THREE.PlaneGeometry(w, h); geo.translate((.5 - axp) * w, (ayp - .5) * h, 0);
    const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, roughness: .85, transparent: !!opt.fade }); mat.shadowSide = THREE.DoubleSide;
    const m = new THREE.Mesh(geo, mat); m.castShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: .5, side: THREE.DoubleSide });
    const lc = local(ly, px, py), panel = opt.panel || lc.panel;
    m.position.set(lc.x, lc.y, opt.dz || .006); panel.add(m);
    m.userData.base = m.position.clone(); m.userData.hop = 0;
    return m;
  }
  function glow(ly, px, py, size, color, opacity = 0, panel) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
    const lc = local(ly, px, py); m.position.set(lc.x, lc.y, .012); (panel || lc.panel).add(m); return m;
  }
  const px2u = (ly, v) => v * 2 * ly.L / ly.cw;
  function warmLight(ly, px, py, color = 0xFFC46A, dist = .9) { const l = new THREE.PointLight(color, 0, dist, 2); const lc = local(ly, px, py); l.position.set(lc.x, lc.y, .08); lc.panel.add(l); return l; }

  function twinkles(ly, n, seed, col = 0xFFF2C8, gain) {
    const rnd = U.mulberry32(seed), out = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: sparkTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      const lc = local(ly, (.04 + rnd() * .92) * ly.cw, (.18 + rnd() * .5) * ly.ch); m.position.set(lc.x, lc.y, .003); lc.panel.add(m);
      m.userData = { ph: rnd() * 6.28, sp: .6 + rnd() * 1.6, s: .025 + rnd() * .03 }; out.push(m);
    }
    return (t) => out.forEach(m => { const u = m.userData, k = Math.pow(Math.max(0, Math.sin(t * u.sp + u.ph)), 6); m.material.opacity = k * .9 * (gain ? gain() : 1); m.scale.setScalar(u.s * (.4 + k)); m.rotation.z = t * .3 + u.ph; });
  }
  /* ---------------- spreads: build + behaviour ---------------- */
  function hop(m, t) { if (m.userData.hopT > 0) { m.userData.hopT -= t; const k = 1 - m.userData.hopT / .5; m.position.y = m.userData.base.y + Math.sin(Math.min(1, k) * Math.PI) * .05; } else m.position.y = m.userData.base.y; }
  function startHop(m) { m.userData.hopT = .5; }
  /* ================= details: extra paper props, ambient life, hidden stars ================= */
  // procedural paper art; a real image with the same key (from IMG_SRC) always wins
  function drawAsset(key, w, h, fn) { if (IM[key]) return; const c = mk(w, h), g = c.getContext('2d'); g.lineJoin = g.lineCap = 'round'; fn(g, w, h); grain(g, w, h, .07); IM[key] = c; }
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  function starPts(cx, cy, R, r, n = 5) { const p = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return p; }
  function origamiStar(g, cx, cy, R, light, dark, line) {
    const pts = starPts(cx, cy, R, R * .43);
    pts.forEach(([x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; g.fillStyle = i % 2 ? dark : light; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill(); });
    g.strokeStyle = line; g.lineWidth = 2.5; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke();
  }
  function drawExtras() {
    drawAsset('hangStar', 240, 240, g => origamiStar(g, 120, 126, 110, '#FBE08E', '#EDBB4C', 'rgba(150,100,30,.55)'));
    drawAsset('hangStarB', 240, 240, g => origamiStar(g, 120, 126, 110, '#FCE3D6', '#EE9F86', 'rgba(150,70,50,.5)'));
    drawAsset('hangStarC', 240, 240, g => origamiStar(g, 120, 126, 110, '#E1F2EA', '#9CCFB8', 'rgba(50,110,90,.5)'));
    drawAsset('goldStar', 200, 200, g => {
      const pts = starPts(100, 106, 92, 40), gr = g.createRadialGradient(80, 80, 6, 100, 106, 100); gr.addColorStop(0, '#FFF6C8'); gr.addColorStop(.45, '#FFD24A'); gr.addColorStop(1, '#D8901C');
      g.fillStyle = gr; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
      g.strokeStyle = '#A8640E'; g.lineWidth = 4; g.stroke(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(78, 74, 14, 7, -.6, 0, 7); g.fill();
    });
    if (typeof storyExtras === 'function') storyExtras();
  }

  let planeG = null;
  const unit = () => planeG || (planeG = new THREE.PlaneGeometry(1, 1));
  const addSprite = (panel, map, color, add = true, opacity = 0) => { const m = new THREE.Mesh(unit(), new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity })); panel.add(m); return m; };
  function artAt(key, px, py, hPx, u, v, flip) { const w = hPx * IM[key].width / IM[key].height; return [px + (flip ? .5 - u : u - .5) * w, py - (1 - v) * hPx]; }
  function hotspot(ly, px, py, wPx, hPx) { const lc = local(ly, px, py), m = new THREE.Mesh(new THREE.PlaneGeometry(px2u(ly, wPx), px2u(ly, hPx)), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(lc.x, lc.y, .03); lc.panel.add(m); m.userData.base = m.position.clone(); return m; }
  // rising puffs of smoke / steam
  function smoke(ly, px, py, o = {}) {
    const lc = local(ly, px, py), n = o.n || 8, ms = [];
    for (let i = 0; i < n; i++) ms.push(addSprite(lc.panel, softTex, o.color || 0xEFE8DC, false));
    return (dt, t) => ms.forEach((m, i) => {
      const a = (t * (o.rate || .2) + i / n) % 1, gain = o.gain ? o.gain() : 1;
      m.position.set(lc.x + Math.sin(a * 4 + i) * .012 + a * (o.wind || .05), lc.y + a * (o.rise || .17), .03 + i * .0004);
      m.scale.setScalar((o.s0 || .025) + a * (o.s1 || .075) * (.8 + gain * .2)); m.material.opacity = Math.sin(a * Math.PI) * (o.op || .42) * Math.min(1.6, gain);
    });
  }
  // water drops falling from a spout
  function drops(ly, px, py, groundPy) {
    const lc = local(ly, px, py), y1 = local(ly, px, groundPy).y, fall = lc.y - y1, ms = [];
    for (let i = 0; i < 7; i++) ms.push(addSprite(lc.panel, softTex, 0xD6ECFF, false));
    const rings = [0, 1].map(() => addSprite(lc.panel, softTex, 0xD6ECFF, false));
    return (dt, t) => {
      ms.forEach((m, i) => { const a = (t * 1.3 + i / 7) % 1; m.position.set(lc.x + a * .012, lc.y - a * a * fall, .03); m.scale.set(.007, .013, 1); m.material.opacity = a < .92 ? .9 : (1 - a) * 10; });
      rings.forEach((m, i) => { const a = (t * 1.3 * 1.5 + i * .5) % 1; m.position.set(lc.x + .012, y1 + .002, .031); m.scale.set(.012 + a * .03, .004 + a * .006, 1); m.material.opacity = (1 - a) * .6; });
    };
  }
  // a paper ornament hanging from the top of the sky on a thread
  function hanger(ly, px, pyTop, lenPx, key, hPx, dz = .035) {
    const lc = local(ly, px, pyTop), grp = new THREE.Group(); grp.position.set(lc.x, lc.y, dz); lc.panel.add(grp);
    const len = px2u(ly, lenPx);
    const thread = new THREE.Mesh(new THREE.PlaneGeometry(.0022, len), new THREE.MeshBasicMaterial({ color: 0xF4E8CC })); thread.position.y = -len / 2; grp.add(thread);
    const m = piece(ly, key, px, pyTop, hPx, { ax: .5, ay: .04, panel: grp, dz: .001 }); m.position.set(0, -len, .001); m.userData.base = m.position.clone();
    const st = { grp, m, a: U.rand(-.1, .1), v: 0, ph: U.rand(0, 6), len, kick(v) { this.v += v; } };
    st.step = (dt, t) => { const acc = -st.a * (9.8 / (.25 + len * 4)) - st.v * .5 + Math.sin(t * .7 + st.ph) * .05; st.v += acc * dt; st.a += st.v * dt; grp.rotation.z = st.a; m.rotation.z = Math.sin(t * 1.1 + st.ph) * .08; };
    return st;
  }
  function hangers(sp, ly, list) {
    const top = ly.ch * .165, out = list.map(([u, len, key, h]) => hanger(ly, ly.cw * u, top, len, key, h));
    out.forEach((h, i) => sp.taps.push({ m: h.m, act: () => { h.kick(U.pick([-1, 1]) * 1.6); SFX.tone({ f: [1319, 1568, 1760, 2093][i % 4], dur: .04, rel: 1.4, vol: .06 }); SFX.tone({ f: [1319, 1568, 1760, 2093][i % 4] * 2.01, dur: .02, rel: .8, vol: .02 }); } }));
    sp.fx.push((dt, t) => out.forEach(h => h.step(dt, t)));
    sp.hangers = out; return out;
  }
  function shooters(ly, n, gain) {
    const ms = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.22, .01), new THREE.MeshBasicMaterial({ color: 0xFFF4D0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); ly.R.add(m); m.userData = { t: U.rand(1, 6), dur: .9 }; ms.push(m); }
    return (dt) => ms.forEach(m => { const u = m.userData; u.t -= dt; if (u.t < 0) { u.t = U.rand(4, 9); u.x0 = U.rand(.1, .55) * ly.L; u.y0 = U.rand(.6, .9) * ly.H; u.age = 0; } if (u.age != null) { u.age += dt; const q = u.age / u.dur; m.material.opacity = q < 1 ? Math.sin(q * Math.PI) * .9 * (gain ? gain() : 1) : 0; m.position.set(u.x0 + q * .3, u.y0 - q * .12, .01); m.rotation.z = -.38; } });
  }
  /* hidden stars: one per spread */
  const found = new Set(); let starEl = null;
  function hiddenStar(sp, ly, px, py, hPx, dz = .014) {
    const m = piece(ly, 'goldStar', px, py, hPx, { ax: .5, ay: .5, dz }), lc = local(ly, px, py);
    const gl = addSprite(m.parent, sparkTex, 0xFFF0B0); gl.position.set(lc.x, lc.y, dz + .002);
    const st = { m, gl, fly: -1, ph: sp.s * 1.3 };
    sp.taps.push({ m, act: () => {
      if (found.has(sp.s)) return; found.add(sp.s); st.fly = 0;
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => SFX.tone({ f, dur: .04, rel: .7, vol: .05, delay: i * .06 }));
      paintStars(true);
      Toy.toast(found.size < NL ? `找到第 ${found.size} 颗藏起来的星星！还有 ${NL - found.size} 颗` : `${NL} 颗星星全部找到啦！今晚的星空送给你 ✦`, 2400);
      if (found.size === NL) celebrate(sp);
    } });
    sp.fx.push((dt, t) => {
      if (st.fly < 0) { const k = Math.pow(Math.max(0, Math.sin(t * 1.4 + st.ph)), 14); gl.material.opacity = k * .9; gl.scale.setScalar(.05 + k * .07); gl.rotation.z = t; m.rotation.z = Math.sin(t * .9) * .15; return; }
      st.fly += dt; const k = st.fly / 1.1, e = U.easeOutBack(Math.min(1, k * 2), 2.5);
      m.position.y = m.userData.base.y + U.smooth(Math.min(1, k)) * .22; m.rotation.z += dt * 9;
      m.scale.setScalar(Math.max(.001, k < .5 ? 1 + e * .8 : 1.8 * (1 - (k - .5) * 2))); gl.position.copy(m.position); gl.material.opacity = Math.max(0, 1 - k); gl.scale.setScalar(.2);
      if (k >= 1) { m.visible = gl.visible = false; m.scale.setScalar(.001); st.fly = 99; }
    });
    return st;
  }
  function paintStars(pop) { if (!starEl) return; starEl.querySelector('b').textContent = `${found.size}/${NL}`; if (pop) { starEl.classList.remove('pop'); void starEl.offsetWidth; starEl.classList.add('pop'); } starEl.classList.toggle('done', found.size === NL); }
  function celebrate(sp) {
    // a shower of shooting stars across every sky
    for (const s2 of spreads) s2.shower = 6;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => SFX.tone({ f, dur: .1, rel: 1.2, vol: .06, type: 'triangle', delay: .3 + i * .12 }));
  }
  function showerFx(sp) {
    const ly = sp.layers[0], ms = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.26, .012), new THREE.MeshBasicMaterial({ color: 0xFFE9A8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); (i % 2 ? ly.R : ly.Lg).add(m); m.userData = { age: 9 }; ms.push(m); }
    return (dt) => { if (!(sp.shower > 0)) return; sp.shower -= dt; ms.forEach((m, i) => { const u = m.userData; if (u.age > 1 && sp.shower > .8 && Math.random() < dt * 2.5) { u.age = 0; const left = i % 2 === 0; u.x0 = (left ? -1 : 0) * ly.L + U.rand(.05, .6) * ly.L; u.y0 = U.rand(.55, .95) * ly.H; } u.age += dt; const q = u.age / .8; m.material.opacity = q < 1 ? Math.sin(q * Math.PI) : 0; m.position.set(u.x0 + q * .3, u.y0 - q * .14, .012); m.rotation.z = -.42; }); };
  }

  /* desk props: tea, pencil, loose paper stars, a folded crane, a ribbon bookmark, dust in the lamp light */
  const steamFx = [];
  function deskProps() {
    // tea mug
    const mc = mk(256, 64), mg = mc.getContext('2d'); mg.fillStyle = '#F4EBDA'; mg.fillRect(0, 0, 256, 64); mg.fillStyle = '#E8826A'; mg.fillRect(0, 22, 256, 6); mg.fillStyle = '#24305E'; for (let x = 8; x < 256; x += 32) { star4(mg, x, 44, 6, '#24305E'); } grain(mg, 256, 64, .05);
    const mug = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.085, .075, .16, 32, 1, true), new THREE.MeshStandardMaterial({ map: tex(mc), roughness: .4, side: THREE.DoubleSide }));
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(.075, 32), new THREE.MeshStandardMaterial({ color: 0xE8DCC2 })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -.079;
    const tea = new THREE.Mesh(new THREE.CircleGeometry(.08, 32), new THREE.MeshStandardMaterial({ color: 0x8A4A22, roughness: .15 })); tea.rotation.x = -Math.PI / 2; tea.position.y = .055;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.04, .011, 10, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0xF4EBDA, roughness: .4 })); handle.rotation.z = -Math.PI / 2; handle.position.x = .085;
    for (const m of [body, handle]) m.castShadow = true;
    mug.add(body, bottom, tea, handle); mug.position.set(1.32, .08, -.28); mug.rotation.y = -.6; scene.add(mug);
    const sm = []; for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xFFFFFF, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); sm.push(s); }
    steamFx.push((dt, t) => sm.forEach((s, i) => { const a = (t * .16 + i / 6) % 1; s.position.set(1.32 + Math.sin(a * 5 + i) * .025, .17 + a * .35, -.28 + Math.cos(a * 4 + i) * .015); s.scale.setScalar(.05 + a * .12); s.material.opacity = Math.sin(a * Math.PI) * .2; }));
    // pencil
    const pencil = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .4, 6), new THREE.MeshStandardMaterial({ color: 0x3E5A9A, roughness: .6 }));
    const wood = new THREE.Mesh(new THREE.ConeGeometry(.013, .045, 6), new THREE.MeshStandardMaterial({ color: 0xE8C8A0 })); wood.position.y = .2225;
    const lead = new THREE.Mesh(new THREE.ConeGeometry(.004, .014, 6), new THREE.MeshStandardMaterial({ color: 0x2A2A2A })); lead.position.y = .238;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.0135, .0135, .03, 10), new THREE.MeshStandardMaterial({ color: 0xE2BE6A, metalness: .6, roughness: .3 })); cap.position.y = -.215;
    const eraser = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .025, 10), new THREE.MeshStandardMaterial({ color: 0xF0A090 })); eraser.position.y = -.24;
    pencil.add(shaft, wood, lead, cap, eraser); pencil.children.forEach(m => m.castShadow = true);
    pencil.rotation.set(0, .9, Math.PI / 2); pencil.position.set(-1.28, .014, .42); scene.add(pencil);
    // paper stars
    const shape = new THREE.Shape(); starPts(0, 0, .05, .022).forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
    const sgeo = new THREE.ExtrudeGeometry(shape, { depth: .01, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1 });
    [[-1.22, -.42, 0xF6D06E, .3], [-1.4, -.1, 0xEE9F86, 1.2], [1.25, .25, 0x9CCFB8, 2.2], [1.45, -.05, 0xF6D06E, .9], [-1.15, .02, 0xF6D06E, 2.8, .6]].forEach(([x, z, col, r, s = 1]) => {
      const m = new THREE.Mesh(sgeo, new THREE.MeshStandardMaterial({ color: col, roughness: .7 })); m.rotation.set(-Math.PI / 2, 0, r); m.position.set(x, .002, z); m.scale.setScalar(s); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    });
    // a folded crane stands on the desk
    const dk = BOOK.deskPiece && IM[BOOK.deskPiece] ? BOOK.deskPiece : null;
    if (dk) { const ct = cutout(dk, 300, 6), cw = .26, ch = cw * ct.c.height / ct.c.width, ctex = tex(ct.c);
    const crane = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshStandardMaterial({ map: ctex, alphaTest: .5, side: THREE.DoubleSide, roughness: .8 }));
    crane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: ctex, alphaTest: .5, side: THREE.DoubleSide });
    crane.castShadow = true; crane.position.set(-1.3, ch / 2 - .01, -.42); crane.rotation.y = .5; scene.add(crane); }
    // ribbon bookmark peeking out of the bottom edge
    const rc = mk(32, 256), rg = rc.getContext('2d'); rg.fillStyle = '#B8324A'; rg.beginPath(); rg.moveTo(0, 0); rg.lineTo(32, 0); rg.lineTo(32, 256); rg.lineTo(16, 226); rg.lineTo(0, 256); rg.closePath(); rg.fill(); rg.fillStyle = 'rgba(255,255,255,.18)'; rg.fillRect(4, 0, 3, 236);
    const rgeo = new THREE.PlaneGeometry(.034, .3, 1, 10), rp = rgeo.attributes.position;
    for (let i = 0; i < rp.count; i++) { const y = rp.getY(i), u = (y + .15) / .3; rp.setXYZ(i, rp.getX(i) + Math.sin(u * 2.4) * .03, 0, -y); }
    rgeo.computeVertexNormals();
    const ribbon = new THREE.Mesh(rgeo, new THREE.MeshStandardMaterial({ map: tex(rc), alphaTest: .5, side: THREE.DoubleSide, roughness: .5 }));
    ribbon.position.set(.06, .0015, .8); ribbon.receiveShadow = true; scene.add(ribbon);
    // dust motes floating in the lamp light
    const N = 70, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) seeds.push([U.rand(-1.3, 1.3), U.rand(.1, 1.3), U.rand(-.7, .9), U.rand(0, 6.28), U.rand(.2, .6)]);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .012, map: softTex, color: 0xFFE6B8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .45 })); scene.add(dust);
    steamFx.push((dt, t) => { seeds.forEach(([x, y, z, ph, s], i) => pos.set([x + Math.sin(t * .1 * s + ph) * .15, .1 + ((y + t * .015 * s) % 1.3), z + Math.cos(t * .08 * s + ph) * .1], i * 3)); dg.attributes.position.needsUpdate = true; });
  }

  /* ================= auto demo ================= */
  const STOP = { stop: true };
  const Demo = { tok: 0, on: false, clock: 0, timers: [], btn: null };
  function demoWait(sec) { const tok = Demo.tok; return new Promise((res, rej) => Demo.timers.push({ at: Demo.clock + sec, res, rej, tok })); }
  function demoTick(dt) {
    Demo.clock += dt;
    Demo.timers = Demo.timers.filter(tm => { if (tm.tok !== Demo.tok) { tm.rej(STOP); return false; } if (Demo.clock >= tm.at) { tm.res(); return false; } return true; });
    for (const sp of spreads) if (sp.demoPull) { const d = sp.demoPull; d.t += dt; sp.pT = U.lerp(d.from, d.to, U.smooth(Math.min(1, d.t / d.dur))); if (d.t >= d.dur) { sp.pT = d.to; sp.demoPull = null; SFX.tone({ f: d.to ? 1400 : 1100, dur: .02, vol: .12, type: 'square', lp: 2500 }); firePull(sp, d.to === 1); } }
    if (Demo.on) { cam.azT = Math.sin(Demo.clock * .22) * .13; cam.polT = cam.base + Math.sin(Demo.clock * .16) * .035; }
  }
  function paintDemo() {
    const b = Demo.btn; if (!b) return; b.setAttribute('aria-pressed', Demo.on ? 'true' : 'false');
    b.querySelector('span').textContent = Demo.on ? '停止' : '自动演示'; b.querySelector('.i-play').toggleAttribute('hidden', Demo.on); b.querySelector('.i-stop').toggleAttribute('hidden', !Demo.on);
  }
  function stopDemo() { if (!Demo.on) return; Demo.tok++; Demo.on = false; spreads.forEach(sp => sp.demoPull = null); cam.azT = 0; cam.polT = cam.base; paintDemo(); }
  function poke(sp, m, line = 0) {
    const t = sp.taps.find(q => q.m === m); if (!t) return;
    startHop(m); if (t.say) { say(m, t.say[line % t.say.length]); voice(t.snd); } if (t.act) t.act();
  }
  async function pull(sp, to = 1, dur = 1.6) { SFX.tone({ f: 900, dur: .02, vol: .08 }); sp.demoPull = { from: sp.pT, to, t: 0, dur }; await demoWait(dur + .1); }
  async function goTo(s) { while (currentSpread() < s) { turn(1); await demoWait(2.2); } }
  async function runDemo() {
    if (!ready) return;
    stopDemo(); SFX.init(); const tok = ++Demo.tok; Demo.on = true; paintDemo(); clearBubbles();
    const W8 = demoWait, S = i => spreads[i - 1];
    try {
      await demoScript(W8, S);
    } catch (e) { if (e !== STOP) console.error(e); }
    if (tok === Demo.tok) { Demo.on = false; cam.azT = 0; cam.polT = cam.base; paintDemo(); }
  }

  /* ================= film mode: a scripted 30-second shoot for video export ================= */
  const FILM = { on: false, t: 0, i: 0, skip: false, els: null };
  // camera keys: time, target xyz, azimuth, polar angle, distance
  function K(t, tx, ty, tz, az, pol, dist) { return { t, v: [tx, ty, tz, az, pol, dist] }; }
  function filmCam(t) {
    const S = FILM.shots; t = U.clamp(t, 0, S[S.length - 1].t);
    let i = 0; while (i < S.length - 2 && t > S[i + 1].t) i++;
    const a = S[i], b = S[i + 1], h = b.t - a.t, s = U.clamp((t - a.t) / h, 0, 1);
    const tan = j => (j <= 0 || j >= S.length - 1) ? S[j].v.map(() => 0) : S[j].v.map((_, k) => (S[j + 1].v[k] - S[j - 1].v[k]) / (S[j + 1].t - S[j - 1].t));
    const ma = tan(i), mb = tan(i + 1), s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    return a.v.map((p, k) => h00 * p + h10 * h * ma[k] + h01 * b.v[k] + h11 * h * mb[k]);
  }
  const NUM = new Proxy([], { get: (_, i) => String(i).padStart(2, '0') });
  let ACTS = [];
  function filmStart() {
    FILM.on = true; FILM.t = 0; FILM.i = 0;
    const P = window.FILM_PLAN;
    if (P) { FILM.plan = P; ACTS = planActs(P); FILM.shots = P.shots.map(k => K(...k)); FILM.segs = P.segs; FILM.subs = P.subs; FILM.endAt = P.endAt; }
    else { ACTS = filmActs(); FILM.shots = filmShots(); FILM.segs = filmSegs(); FILM.endAt = BOOK.filmEnd; }
    document.body.classList.add('film');
    FILM.els = { title: document.getElementById('ftitle'), num: document.getElementById('fnum'), text: document.getElementById('ftext'), sub: document.getElementById('fsub'), end: document.getElementById('endcard') };
    camera.clearViewOffset(); camera.updateProjectionMatrix();
    SFX.startRecord(() => FILM.t);
  }
  const fade = (t, a, b, f = .35) => U.clamp(Math.min((t - a) / f, (b - t) / f), 0, 1);
  function filmStep(dt) {
    FILM.t += dt;
    while (FILM.i < ACTS.length && ACTS[FILM.i][0] <= FILM.t) ACTS[FILM.i++][1]();
    update(dt);
    const t = FILM.t, E = FILM.els, seg = FILM.segs.find(g => t >= g.a && t < g.b);
    if (seg) {
      E.num.textContent = NUM[seg.s]; E.text.textContent = seg.title;
      const ot = fade(t, seg.a + .25, seg.a + 3.2), os = fade(t, seg.a + .45, seg.b - .15);
      E.title.style.opacity = ot; E.title.style.transform = `translateX(${(1 - ot) * -24}px)`;
      if (!FILM.subs) { E.sub.textContent = seg.sub; E.sub.style.opacity = os; E.sub.style.transform = `translate(-50%, ${(1 - os) * 14}px)`; }
    } else { E.title.style.opacity = 0; if (!FILM.subs) E.sub.style.opacity = 0; }
    if (FILM.subs) {   // one subtitle per narration line, timed to its voice clip
      const sb = FILM.subs.find(q => t >= q.a - .15 && t < q.b + .25);
      if (sb) { if (E.sub.dataset.t !== sb.text) { setBi(E.sub, sb.text); E.sub.dataset.t = sb.text; } const os = fade(t, sb.a - .15, sb.b + .25, .2); E.sub.style.opacity = os; E.sub.style.transform = `translate(-50%, ${(1 - os) * 10}px)`; } else E.sub.style.opacity = 0;
    }
    const oe = U.clamp((t - FILM.endAt) / .7, 0, 1); E.end.style.opacity = oe; E.end.querySelector('.ec').style.transform = `translateY(${(1 - U.smooth(oe)) * 20}px)`;
  }
  // a voiced film is data: actions at times, built from the voice clips by tools/plan.py
  //   turn · pull {s,dur,to} · spin {s,v} · say {s,role,text,life} · poke {s,key:'daisies.0'} · call {s,fn} (story's FILM_HOOKS[fn](sp, act))
  function planActs(P) {
    const S = i => spreads[i - 1];
    return P.acts.map(a => [a.t, () => {
      const sp = a.s ? S(a.s) : null;
      if (a.do === 'turn') turn(1);
      else if (a.do === 'pull') { SFX.tone({ f: 900, dur: .02, vol: .08 }); sp.demoPull = { from: sp.pT, to: a.to == null ? 1 : a.to, t: 0, dur: a.dur || 1.4 }; }
      else if (a.do === 'spin') sp.spin = a.v;
      else if (a.do === 'say') { const m = typeof speaker === 'function' ? speaker(a.s, a.role, sp) : null; if (m) { startHop(m); say(m, a.text, a.life, true); } else FILM.subs.push({ a: FILM.t, b: FILM.t + Math.max(.8, (a.life || 2) - .35), text: a.text }); }
      else if (a.do === 'poke') { const m = String(a.key).split('.').reduce((o, k) => o && o[k], sp); if (m) poke(sp, m, a.line || 0); }
      else if (a.do === 'call' && typeof FILM_HOOKS !== 'undefined' && FILM_HOOKS[a.fn]) FILM_HOOKS[a.fn](sp, a);
    }]);
  }
  async function filmAudio(dur) {
    const buf = await SFX.renderOffline(SFX.recording, dur);
    const ch = buf.numberOfChannels, n = buf.length, dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const ws = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
    dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7FFF, true); o += 2; }
    const u8 = new Uint8Array(dv.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  /* ---------------- sounds ---------------- */
  function chime(fs) { fs.forEach((f, i) => SFX.tone({ f, dur: .05, rel: 1, vol: .05, delay: i * .07 })); }
  function whoosh(v) { SFX.noise({ type: 'bandpass', f: 400, f2: 2200, dur: .7 * v + .2, vol: .1 * v + .04, q: .7 }); }
  function chirp() { [0, .09].forEach(d => SFX.tone({ f: 2200, f2: 3100, dur: .06, vol: .05, delay: d })); }
  function tick(f, v) { SFX.noise({ type: 'bandpass', f, dur: .02, vol: v, q: 6 }); }
  function voice(kind) {
    if (FILM.plan) return;
    const v = VOICES[kind] || { f: 500, type: 'square' };
    for (let i = 0; i < (v.n || 4); i++) SFX.tone({ f: v.f * (1 + Math.random() * (v.spread || .4)), dur: v.dur || .05, vol: v.vol || .05, type: v.type, lp: v.lp || 1600, delay: i * (v.gap || .08) });
  }

  /* ---------------- generic mechanisms ---------------- */
  // a flat disc on the page that turns when dragged round; spin carries on with friction
  function makeDial(sp, key, x = .8, z = ZF - .2, size = .3) {
    const dt = cutout(key, 420, 6), dtex = tex(dt.c);
    sp.dial = new THREE.Mesh(new THREE.CircleGeometry(size / 2 * dt.c.width / 420, 48), new THREE.MeshStandardMaterial({ map: dtex, alphaTest: .5, roughness: .6, metalness: .1 }));
    sp.dial.rotation.x = -Math.PI / 2; sp.dial.position.set(x, LT + .004, z); sp.dial.castShadow = true; sp.host.pivot.add(sp.dial);
    sp.dialHit = new THREE.Mesh(new THREE.CircleGeometry(size * .8, 24), new THREE.MeshBasicMaterial({ visible: false })); sp.dialHit.rotation.x = -Math.PI / 2; sp.dialHit.position.copy(sp.dial.position); sp.dialHit.position.y += .01; sp.host.pivot.add(sp.dialHit);
    sp.angle = 0; sp.spin = 0; sp.lastTooth = 0; sp.dialTotal = 0;
  }
  function dialStep(sp, dt) {
    if (!sp.dragDial) { sp.angle += sp.spin * dt; sp.spin *= Math.exp(-dt * 1.6); }
    sp.dialTotal += Math.abs(sp.angle - (sp.prevAngle ?? sp.angle)); sp.prevAngle = sp.angle; sp.dial.rotation.z = sp.angle;
    const tooth = Math.floor(sp.angle / (Math.PI / 8)); if (tooth !== sp.lastTooth) { sp.lastTooth = tooth; tick(1500 + Math.random() * 300, .05); }
  }
  // hide the part of a piece beyond a vertical line in its panel (x in panel units)
  const clipped = [];
  // keeps the side of the line n·p + d >= 0 (n, d in panel units)
  function clipPlane(mesh, panel, nx, ny, d) {
    const pl = new THREE.Plane(); mesh.material.clippingPlanes = [pl]; if (mesh.customDepthMaterial) mesh.customDepthMaterial.clippingPlanes = [pl];
    const c = { pl, panel, nx, ny, d }; clipped.push(c); return c;
  }
  const clipX = (mesh, panel, x, keepLeft = true) => keepLeft ? clipPlane(mesh, panel, -1, 0, x) : clipPlane(mesh, panel, 1, 0, -x);
  function updateClips() { for (const c of clipped) { c.pl.normal.set(c.nx, c.ny, 0); c.pl.constant = c.d; c.pl.applyMatrix4(c.panel.matrixWorld); } }
  // run something a little later, in simulated time (so it also lands on the right frame in a film export)
  function after(sp, sec, fn) { (sp.q || (sp.q = [])).push({ t: sec, fn }); }
  function stepQueue(sp, dt) { if (!sp.q || !sp.q.length) return; const due = []; sp.q = sp.q.filter(e => { e.t -= dt; if (e.t <= 0) { due.push(e); return false; } return true; }); due.forEach(e => e.fn()); }

  /* ---------------- light + magic effects ---------------- */
  // bloom makes anything brighter than white (glows, flames, sparkles) actually glow; the grade pass adds vignette, warmth and flashes
  let composer = null, bloom = null, gradePass = null;
  const FXS = { flash: 0, shake: 0, lampMul: 1, lampT: 1, lampReq: 1, sparkleAcc: 0 };
  const GRADE = {
    uniforms: { tDiffuse: { value: null }, vig: { value: .42 }, warm: { value: .035 }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float vig, warm, flash; varying vec2 vUv;',
      'void main(){ vec4 c = LinearTosRGB(texture2D(tDiffuse, vUv));',
      '  vec2 d = vUv - .5; float v = 1.0 - vig * smoothstep(.28, .9, length(d * vec2(1.1, 1.0)));',
      '  c.rgb = c.rgb * v + vec3(warm, warm * .5, -warm * .3) * (1.2 - v);',
      '  c.rgb += vec3(1.0, .9, .72) * flash; gl_FragColor = vec4(c.rgb, 1.0); }'].join('\n')
  };
  function setupPost() {
    if (!THREE.EffectComposer || !THREE.UnrealBloomPass) return;
    try {
      const opts = { format: THREE.RGBAFormat, type: THREE.HalfFloatType };
      const rt = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(4, 4, opts) : new THREE.WebGLRenderTarget(4, 4, opts);
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .85, .55, 1.55); composer.addPass(bloom);
      gradePass = new THREE.ShaderPass(GRADE); composer.addPass(gradePass);
    } catch (e) { console.warn('post-processing off', e); composer = null; }
  }
  function renderFrame() {
    if (composer) { gradePass.uniforms.flash.value = FXS.flash; composer.render(); } else renderer.render(scene, camera);
  }
  // a bright colour for additive sprites (values above 1 feed the bloom)
  const hot = (hex, k = 1.8) => new THREE.Color(hex).multiplyScalar(k * 1.4);

  /* particle pools: additive sparkles, soft glows, dust puffs, paper confetti */
  const POOLS = {};
  function pool(kind) {
    if (POOLS[kind]) return POOLS[kind];
    const n = { spark: 180, glow: 80, dust: 40, confetti: 90 }[kind], arr = [];
    for (let i = 0; i < n; i++) {
      const mat = kind === 'confetti' ? new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthWrite: false })
        : new THREE.MeshBasicMaterial({ map: kind === 'spark' ? sparkTex : softTex, transparent: true, depthWrite: false, blending: kind === 'dust' ? THREE.NormalBlending : THREE.AdditiveBlending });
      const m = new THREE.Mesh(unit(), mat); m.visible = false; m.userData = { live: false, kind }; arr.push(m);
    }
    return POOLS[kind] = arr;
  }
  function emit(parent, x, y, z, o = {}) {
    const kind = o.kind || 'spark', arr = pool(kind); let m = arr.find(q => !q.userData.live); if (!m) m = arr[Math.floor(Math.random() * arr.length)];
    if (m.parent !== parent) parent.add(m);
    const u = m.userData; u.live = true; u.age = 0; u.life = o.life || 1;
    u.v = new THREE.Vector3(o.vx || 0, o.vy || 0, o.vz || 0); u.g = o.grav == null ? 0 : o.grav; u.drag = o.drag == null ? 1.5 : o.drag;
    u.size = o.size || .03; u.spin = o.spin == null ? (Math.random() - .5) * 6 : o.spin; u.tw = o.twinkle || 0; u.op = o.op == null ? 1 : o.op; u.ph = Math.random() * 7;
    m.position.set(x, y, z); m.rotation.set(0, 0, Math.random() * 6); m.visible = true;
    m.material.color.copy(o.color instanceof THREE.Color ? o.color : hot(o.color == null ? 0xFFE2A0 : o.color, kind === 'confetti' || kind === 'dust' ? 1 : (o.hot || 1.8)));
    return m;
  }
  function burst(parent, x, y, z, o = {}) {
    const n = o.n || 16, sp = o.speed || .25, cols = o.colors || [0xFFE2A0, 0xFFFFFF, 0xFFC870];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = sp * (.4 + Math.random() * .8);
      emit(parent, x + (Math.random() - .5) * (o.spread || 0), y + (Math.random() - .5) * (o.spread || 0) * .5, z, Object.assign({}, o, { vx: Math.cos(a) * s, vy: Math.sin(a) * s * (o.flat ? .4 : 1) + (o.up || 0), vz: o.vz || 0, color: cols[i % cols.length], size: (o.size || .03) * (.6 + Math.random() * .8), life: (o.life || .9) * (.7 + Math.random() * .6) }));
    }
  }
  function stepParticles(dt, t) {
    for (const kind in POOLS) for (const m of POOLS[kind]) {
      const u = m.userData; if (!u.live) continue;
      u.age += dt; const q = u.age / u.life; if (q >= 1 || !m.parent) { u.live = false; m.visible = false; continue; }
      u.v.y -= u.g * dt; u.v.multiplyScalar(Math.exp(-u.drag * dt)); m.position.addScaledVector(u.v, dt); m.rotation.z += u.spin * dt;
      const tw = u.tw ? .55 + .45 * Math.sin(t * u.tw + u.ph) : 1;
      if (kind === 'confetti') { m.scale.set(u.size * Math.cos(t * 7 + u.ph), u.size * .55, 1); m.material.opacity = Math.min(1, (1 - q) * 3); }
      else if (kind === 'dust') { m.scale.setScalar(u.size * (1 + q * 1.6)); m.material.opacity = u.op * (1 - q) * .75; }
      else { m.scale.setScalar(u.size * (kind === 'spark' ? (1 - q * .5) : (.6 + q * .6)) * tw); m.material.opacity = u.op * Math.pow(1 - q, 1.4) * Math.min(1, q * 12); }
    }
  }
  // world-space helpers
  const worldOf = obj => obj.getWorldPosition(new THREE.Vector3());
  function burstAt(obj, o) { const p = worldOf(obj); burst(scene, p.x, p.y + (o && o.dy || 0), p.z + .02, o); }
  function tapFx(hit) { const p = hit.point; burst(scene, p.x, p.y, p.z + .01, { n: 12, speed: .22, size: .028, life: .7, colors: [0xFFE9A8, 0xFFFFFF, 0xFFC0A0] }); }
  function openFx(sp) {
    // magic dust rises from the fold as a spread pops fully open
    for (let i = 0; i < 46; i++) { const x = (Math.random() - .5) * 1.7, z = (Math.random() - .5) * 1.0; emit(scene, x, .03 + Math.random() * .1, z, { vy: .18 + Math.random() * .25, vx: (Math.random() - .5) * .08, drag: .8, size: .02 + Math.random() * .03, life: 1.2 + Math.random() * 1.2, twinkle: 14, color: [0xFFE2A0, 0xFFFFFF, 0xFFD27A, 0xBFE8FF][i % 4] }); }
  }
  function firePull(sp, on) {
    sp.onPull && sp.onPull(on);
    if (on && sp.tab) { const p = worldOf(sp.tab); burst(scene, p.x, p.y + .02, p.z, { n: 22, speed: .35, up: .1, size: .03, life: .9 }); FXS.flash = Math.max(FXS.flash, .1); }
  }
  // background glitter: a few sparkles always twinkling over an open spread
  function ambientSparkles(dt) {
    const open = spreads.some(sp => sp.alpha > Math.PI * .9); if (!open) return;
    FXS.sparkleAcc += dt * 5;
    while (FXS.sparkleAcc > 1) { FXS.sparkleAcc--; emit(scene, (Math.random() - .5) * 1.8, .05 + Math.random() * .6, -.1 + Math.random() * .65, { vy: .02, drag: .2, size: .012 + Math.random() * .02, life: 1.4 + Math.random(), twinkle: 10, color: Math.random() < .7 ? 0xFFE6B0 : 0xFFFFFF, op: .8 }); }
  }
  function stepFxGlobal(dt, t) {
    FXS.flash = Math.max(0, FXS.flash - dt * 1.8); FXS.shake = Math.max(0, FXS.shake - dt * 2.2);
    FXS.lampT = FXS.lampReq; FXS.lampReq = 1;
    FXS.lampMul += (FXS.lampT - FXS.lampMul) * (1 - Math.exp(-dt * 3)); if (lamp) lamp.intensity = 1.3 * FXS.lampMul;
    ambientSparkles(dt); stepParticles(dt, t);
  }
  function shakeCamera() { if (FXS.shake > 0) { const s = FXS.shake * .012; camera.position.x += Math.sin(time * 61) * s; camera.position.y += Math.sin(time * 47 + 1) * s; } }
  // a radial "ta-da" starburst texture
  let burstTex = null;
  function getBurstTex() {
    if (burstTex) return burstTex;
    const c = mk(256, 256), g = c.getContext('2d'); g.translate(128, 128);
    for (let k = 0; k < 18; k++) { g.rotate(Math.PI * 2 / 18); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,240,180,.0)'); gr.addColorStop(.25, 'rgba(255,236,170,.95)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(14, -3); g.lineTo(128, k % 2 ? -12 : -6); g.lineTo(128, k % 2 ? 12 : 6); g.lineTo(14, 3); g.closePath(); g.fill(); }
    return burstTex = new THREE.CanvasTexture(c);
  }

  /* ---------------- building ---------------- */
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x1E1510); scene.fog = new THREE.Fog(0x1E1510, 6, 14);
    camera = new THREE.PerspectiveCamera(32, 1, .05, 40);
    glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
    { const c = mk(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.15, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; for (const r of [0, Math.PI / 2]) { g.save(); g.translate(64, 64); g.rotate(r); g.beginPath(); g.moveTo(-64, 0); g.quadraticCurveTo(0, -3, 64, 0); g.quadraticCurveTo(0, 3, -64, 0); g.fill(); g.restore(); } sparkTex = new THREE.CanvasTexture(c); }
    softTex = radialTex([[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]);
    { const c = mk(256, 256), g = c.getContext('2d'); g.translate(128, 128); for (let k = 0; k < 16; k++) { g.rotate(Math.PI / 8); const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, -9); g.lineTo(128, 9); g.closePath(); g.fill(); } rayTex = new THREE.CanvasTexture(c); }
    lamp = new THREE.SpotLight(0xFFE2B8, 1.3, 0, .62, .6, 1);
    lamp.position.set(-1.8, 3.9, 2.5); lamp.target.position.set(.15, 0, 0);
    lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0005; lamp.shadow.radius = 5; lamp.shadow.camera.near = 1; lamp.shadow.camera.far = 9;
    scene.add(lamp, lamp.target, new THREE.HemisphereLight(0xFFF1DC, 0x4A2E1E, .6));
    const dtx = tex(deskTex()); dtx.wrapS = dtx.wrapT = THREE.RepeatWrapping; dtx.repeat.set(3, 3);
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: dtx, roughness: .75 })); desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);
    const bc = new THREE.Mesh(new THREE.BoxGeometry(PW + .03, LT, PD + .04), new THREE.MeshStandardMaterial({ color: BOOK.coverHex, roughness: .9 })); bc.position.set((PW + .03) / 2 - .005, LT / 2 - .001, 0); bc.receiveShadow = true; scene.add(bc);
    base = makeLeaf(NL, page(NL, 'R'), backCover(), false);
    leaves = [];
    for (let i = 0; i < NL; i++) leaves.push(makeLeaf(i, i === 0 ? cover() : page(i, 'R'), page(i + 1, 'L'), i === 0));
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, PD + .04, 12, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: BOOK.spineHex, roughness: .9, side: THREE.DoubleSide }));
    spine.rotation.x = Math.PI / 2; spine.rotation.y = Math.PI; spine.position.set(0, .02, 0); scene.add(spine);
    spreads = [];
    for (let s = 1; s <= NL; s++) {
      const host = s < NL ? leaves[s] : base, A = ART[s]();
      const sp = { s, host, layers: [], p: 0, pT: 0, alpha: 0, def: STORY[s], fx: [] };
      const specs = [LAY.back, LAY.mid, LAY.front];
      A.layers.forEach(([c], k) => { const ly = makeLayer(c, specs[k], k, k === 0 ? A.night : null); host.pivot.add(ly.R, ly.Lg); sp.layers.push(ly); });
      SPREADS[s](sp, A);
      if (DETAILS[s]) DETAILS[s](sp, A); sp.fx.push(showerFx(sp));
      if (STORY[s].tab) {
        const tc = mk(200, 250), g = tc.getContext('2d');
        sp.paintTab = () => { g.fillStyle = '#FFF6E2'; g.fillRect(0, 0, 200, 250); g.fillStyle = C.coral; g.fillRect(0, 175, 200, 75);
        g.font = `56px ${FONT}`; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(STORY[s].tab, 100, 95); g.fillStyle = '#FFF6E2'; g.font = '40px sans-serif'; g.fillText('⇆', 100, 212); grain(g, 200, 250, .06); };
        sp.paintTab();
        const wm = new THREE.MeshStandardMaterial({ color: 0xF3E9D6 });
        const tab = new THREE.Mesh(new THREE.BoxGeometry(.16, .006, .2), [wm, wm, new THREE.MeshStandardMaterial({ map: tex(tc), roughness: .8 }), new THREE.MeshStandardMaterial({ color: 0xE8DCC2 }), wm, wm]);
        tab.castShadow = true; tab.userData.tab = sp;
        const hit = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .36), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.tab = sp; tab.add(hit); sp.tabHit = hit;
        host.pivot.add(tab); sp.tab = tab; sp.tabRange = [.3, .82]; tabs.push(tab);
      }
      spreads.push(sp);
    }
    deskProps(); setupPost();
    { const c = mk(512, 512), g = c.getContext('2d'); g.translate(256, 256); g.rotate(.35); const gr = g.createLinearGradient(-60, 0, 60, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(.5, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(-60, -400, 120, 800);
      const st = new THREE.CanvasTexture(c); st.wrapS = st.wrapT = THREE.ClampToEdgeWrapping;
      const geo = new THREE.PlaneGeometry(PW - .02, PD - .02); geo.translate(PW / 2, 0, 0);
      const sheen = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      sheen.rotation.x = -Math.PI / 2; sheen.position.y = LT + .0008; leaves[0].pivot.add(sheen);
      steamFx.push((dt, t) => { const a = (t / 5) % 1; st.offset.x = U.lerp(.9, -.9, a); sheen.material.opacity = leaves[0].theta < .05 ? .55 : 0; }); }
    ready = true;
  }
  function rebuildText() {
    if (!ready) return;
    const set = (mat, c) => { mat.map.image = c; mat.map.needsUpdate = true; };
    set(leaves[0].front, cover());
    for (let i = 1; i < NL; i++) set(leaves[i].front, page(i, 'R'));
    for (let i = 0; i < NL; i++) set(leaves[i].back, page(i + 1, 'L'));
    set(base.front, page(NL, 'R'));
    for (const sp of spreads) if (sp.paintTab) { sp.paintTab(); sp.tab.material[2].map.needsUpdate = true; }
  }

  /* ---------------- layout + camera ---------------- */
  const hingeY = (i, th) => U.lerp(LT * (NL - i) + .001, LT * i + LT, th / Math.PI);
  function layout() {
    for (const lf of leaves) { lf.pivot.position.set(0, hingeY(lf.i, lf.theta), 0); lf.pivot.rotation.z = lf.theta; }
    base.pivot.position.set(0, .0005, 0);
    for (const sp of spreads) {
      const leftTh = leaves[sp.s - 1].theta, rightTh = sp.s < NL ? leaves[sp.s].theta : 0;
      sp.alpha = U.clamp(leftTh - rightTh, 0, Math.PI);
      const vis = sp.alpha > .02;
      for (const ly of sp.layers) { ly.R.visible = ly.Lg.visible = vis; if (vis) placePanels(ly, sp.alpha); }
      if (sp.tab) { sp.tab.visible = sp.alpha > Math.PI * .9; const nudge = sp.pT === 0 && sp.p < .02 && !(drag && drag.sp === sp) ? Math.pow(Math.max(0, Math.sin(time * 2.4)), 10) * .04 : 0; sp.tab.position.set(U.lerp(sp.tabRange[0], sp.tabRange[1], sp.p) + nudge, LT + .004, ZF + .06); }
      if (sp.dial) sp.dial.visible = sp.alpha > .5;
    }
  }
  function placeCamera(dt) {
    if (FILM.on) { const [tx, ty, tz, az, pol, d0] = window.FILM_CAM || filmCam(FILM.t), dist = d0 * (window.FILM_DIST || 1); camera.position.set(tx + Math.sin(az) * Math.sin(pol) * dist, ty + Math.cos(pol) * dist, tz + Math.cos(az) * Math.sin(pol) * dist); camera.lookAt(tx, ty, tz); shakeCamera(); return; }
    const k = 1 - Math.exp(-dt * 6);
    cam.az += (cam.azT - cam.az) * k; cam.pol += (cam.polT - cam.pol) * k;
    const openAmt = U.clamp(leaves[0].theta / Math.PI, 0, 1);
    cam.tx += (U.lerp(.5, 0, U.smooth(openAmt)) - cam.tx) * k;
    const aspect = W / Math.max(1, H), vf = camera.fov * Math.PI / 180;
    const needW = U.lerp(1.2, aspect < .9 ? 1.98 : 2.3, U.smooth(openAmt));
    const needH = PD * Math.cos(cam.pol) + U.lerp(.05, .8, openAmt) * Math.sin(cam.pol) + .1;
    const dT = Math.max(needW / 2 / Math.tan(Math.atan(Math.tan(vf / 2) * aspect)) * 1.06, needH / 2 / Math.tan(vf / 2) * 1.12, 1.8) / (cam.zoom || 1);
    cam.dist += (dT - cam.dist) * k;
    const tgt = new THREE.Vector3(cam.tx, .17, .1);
    camera.position.set(tgt.x + Math.sin(cam.az) * Math.sin(cam.pol) * cam.dist, tgt.y + Math.cos(cam.pol) * cam.dist, tgt.z + Math.cos(cam.az) * Math.sin(cam.pol) * cam.dist);
    camera.lookAt(tgt); shakeCamera();
  }

  /* ---------------- turning + input ---------------- */
  const forwardLeaf = () => leaves.find(l => l.target === 0);
  function backLeaf() { for (let i = NL - 1; i >= 0; i--) if (leaves[i].target === Math.PI) return leaves[i]; return null; }
  function rustle() { SFX.noise({ type: 'bandpass', f: 3200, f2: 1200, dur: .35, vol: .14, q: .8 }); SFX.noise({ type: 'highpass', f: 5000, dur: .12, vol: .05, delay: .2 }); }
  function turn(dir) { const lf = dir > 0 ? forwardLeaf() : backLeaf(); if (!lf || drag) return; lf.target = dir > 0 ? Math.PI : 0; rustle(); clearBubbles(); spreads.forEach(sp => sp.q = []); }
  const currentSpread = () => leaves.filter(l => l.target === Math.PI).length;
  let drag = null;
  function pick(e) { const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, camera); }
  const openSpread = () => spreads.find(sp => sp.alpha > Math.PI * .85);
  function hostPlaneHit(sp) {
    const host = sp.host.pivot, n = new THREE.Vector3(0, 1, 0).applyQuaternion(host.getWorldQuaternion(new THREE.Quaternion()));
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(0, LT, 0).applyMatrix4(host.matrixWorld));
    const hit = new THREE.Vector3(); return ray.ray.intersectPlane(plane, hit) ? host.worldToLocal(hit) : null;
  }
  function onDown(e) {
    if (!ready || drag) return;
    stopDemo();
    pick(e); try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    const sp = openSpread();
    if (sp && sp.tab) { const th = ray.intersectObject(sp.tabHit, false)[0]; if (th) { drag = { kind: 'tab', id: e.pointerId, sp, x0: e.clientX, y0: e.clientY, moved: false }; SFX.tone({ f: 900, dur: .02, vol: .08 }); return; } }
    if (sp && sp.dialHit && ray.intersectObject(sp.dialHit, false)[0]) {
      const l = hostPlaneHit(sp); drag = { kind: 'dial', id: e.pointerId, sp, a0: Math.atan2(l.z - sp.dial.position.z, l.x - sp.dial.position.x), lastT: performance.now() }; sp.dragDial = true; sp.spin = 0; return;
    }
    const bookHit = ray.intersectObjects([...leaves.map(l => l.mesh), base.mesh], false)[0];
    drag = { kind: bookHit ? 'page' : 'orbit', id: e.pointerId, x0: e.clientX, y0: e.clientY, az0: cam.azT, pol0: cam.polT, lf: null, th0: 0, lastX: e.clientX, lastT: performance.now(), vx: 0 };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.kind === 'tab') {
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.moved = true; pick(e);
      const sp = drag.sp, l = hostPlaneHit(sp);
      if (l) { const p = U.clamp((l.x - sp.tabRange[0]) / (sp.tabRange[1] - sp.tabRange[0]), 0, 1); if ((p === 1 && sp.pT < 1) || (p === 0 && sp.pT > 0)) { SFX.tone({ f: p ? 1400 : 1100, dur: .02, vol: .12, type: 'square', lp: 2500 }); firePull(sp, p === 1); } sp.pT = p; }
      return;
    }
    if (drag.kind === 'dial') {
      pick(e); const sp = drag.sp, l = hostPlaneHit(sp); if (!l) return;
      const a = Math.atan2(l.z - sp.dial.position.z, l.x - sp.dial.position.x);
      let d = a - drag.a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const now = performance.now(), dtm = Math.max(.008, (now - drag.lastT) / 1000);
      sp.angle -= d; sp.spin = U.lerp(sp.spin, -d / dtm, .5); drag.a0 = a; drag.lastT = now;
      return;
    }
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, now = performance.now();
    drag.vx = U.lerp(drag.vx, (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT) * 1000, .4); drag.lastX = e.clientX; drag.lastT = now;
    if (drag.kind === 'orbit') { cam.azT = U.clamp(drag.az0 - dx * .004, -.55, .55); cam.polT = U.clamp(drag.pol0 - dy * .003, .5, 1.12); return; }
    if (!drag.lf) {
      if (Math.abs(dx) < 10) return;
      drag.lf = dx < 0 ? forwardLeaf() : backLeaf();
      if (!drag.lf) { drag.kind = 'orbit'; return; }
      drag.th0 = drag.lf.theta; rustle(); clearBubbles();
    }
    const a = new THREE.Vector3(0, 0, .3).project(camera), b = new THREE.Vector3(1, 0, .3).project(camera), pw = Math.max(80, Math.abs(b.x - a.x) / 2 * W);
    drag.lf.target = drag.lf.theta = U.clamp(drag.th0 - dx / pw * Math.PI * .55, 0, Math.PI); drag.lf.dragging = true;
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.kind === 'tab' && !d.moved) { d.sp.pT = d.sp.pT > .5 ? 0 : 1; firePull(d.sp, d.sp.pT === 1); SFX.tone({ f: d.sp.pT ? 1400 : 1100, dur: .02, vol: .12, type: 'square', lp: 2500, delay: .25 }); return; }
    if (d.kind === 'dial') { d.sp.dragDial = false; return; }
    if (d.kind === 'page' && d.lf) { d.lf.dragging = false; d.lf.target = Math.abs(d.vx) > 350 ? (d.vx < 0 ? Math.PI : 0) : (d.lf.theta > Math.PI / 2 ? Math.PI : 0); return; }
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) tap(e, d);
  }
  function tap(e, d) {
    pick(e);
    const sp = openSpread();
    if (sp && sp.taps) {
      const hit = ray.intersectObjects(sp.taps.map(t => t.m).filter(m => Math.abs(m.scale.x) > .2 && m.scale.y > .2), false)[0];
      if (hit) {
        const t = sp.taps.find(q => q.m === hit.object); tapFx(hit);
        startHop(t.m);
        if (t.say) { say(t.m, U.pick(t.say)); voice(t.snd); }
        if (t.act) t.act();
        return;
      }
    }
    if (d.kind === 'page') { const r = cv.getBoundingClientRect(); turn((e.clientX - r.left) > r.width / 2 || leaves[0].theta < .1 ? 1 : -1); }
    else if (d.kind === 'orbit') { const now = performance.now(); if (now - (tap.last || 0) < 320) { cam.azT = 0; cam.polT = cam.base; } tap.last = now; }
  }
  function onWheel(e) { e.preventDefault(); cam.zoom = U.clamp((cam.zoom || 1) * Math.exp(-e.deltaY * .001), .8, 1.8); }

  /* ---------------- speech bubbles ---------------- */
  // "中文\nEnglish" → Chinese line + smaller English line
  function setBi(el, text) { const i = text.indexOf('\n'); if (i < 0) { el.textContent = text; return; } el.textContent = text.slice(0, i); const en = document.createElement('span'); en.className = 'en'; en.textContent = text.slice(i + 1); el.appendChild(en); }
  function say(obj, text, life, fromPlan) {
    if (FILM.plan && !fromPlan) return;
    bubbles.filter(b => b.obj === obj).forEach(b => b.t = 9);
    const el = document.createElement('div'); el.className = 'bub'; setBi(el, text); bubblesEl.appendChild(el);
    bubbles.push({ obj, el, t: 0, life: life || 2.4 + text.length * .06 });
  }
  function clearBubbles() { bubbles.forEach(b => b.el.remove()); bubbles = []; }
  function stepBubbles(dt) {
    const r = cv.getBoundingClientRect(), box = new THREE.Box3();
    bubbles = bubbles.filter(b => {
      b.t += dt;
      box.setFromObject(b.obj); const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2).project(camera);
      b.el.style.left = ((top.x + 1) / 2 * r.width) + 'px'; b.el.style.top = ((1 - top.y) / 2 * r.height - 6) + 'px';
      if (FILM.on) { const ki = U.clamp(b.t / .3, 0, 1), ko = U.clamp((b.t - b.life) / .25, 0, 1); b.el.style.animation = 'none'; b.el.style.opacity = Math.min(1, ki * 3) * (1 - ko); b.el.style.transform = `translate(-50%,-100%) scale(${(ki < 1 ? .4 + .6 * U.easeOutBack(ki, 2.2) : 1) * (1 - ko * .3)})`; }
      else if (b.t > b.life && !b.el.classList.contains('out')) b.el.classList.add('out');
      if (b.t > b.life + .3) { b.el.remove(); return false; }
      return true;
    });
  }

  /* ---------------- frame ---------------- */
  let beds = null;
  function update(dt) {
    if (!ready) return;
    time += dt; demoTick(dt);
    for (const f of steamFx) f(dt, time);
    for (const lf of leaves) { if (lf.dragging) continue; const d = lf.target - lf.theta; lf.theta = Math.abs(d) < .002 ? lf.target : lf.theta + d * (1 - Math.exp(-dt * (FILM.on ? 4.2 : 7.5))); }
    for (let i = 1; i < NL; i++) leaves[i].theta = Math.min(leaves[i].theta, leaves[i - 1].theta);
    for (let i = NL - 2; i >= 0; i--) leaves[i].theta = Math.max(leaves[i].theta, leaves[i + 1].theta);
    layout();
    for (const sp of spreads) {
      sp.p += (sp.pT - sp.p) * (1 - Math.exp(-dt * (STORY[sp.s].slow ? 3 : 6)));
      if (sp.alpha > .02) { stepQueue(sp, dt); sp.update(dt, time); if (sp.tw) sp.tw(time); for (const f of sp.fx) f(dt, time); }
      if (sp.alpha > Math.PI * .97 && lastPopped !== sp.s) { lastPopped = sp.s; openFx(sp); SFX.noise({ type: 'bandpass', f: 1800, dur: .05, vol: .2, q: 1.5 }); SFX.tone({ f: 180, f2: 90, dur: .12, vol: .2 }); }
      if (sp.alpha < Math.PI * .5 && lastPopped === sp.s) lastPopped = -1;
    }
    stepFxGlobal(dt, time);
    placeCamera(dt);
    scene.updateMatrixWorld(); updateClips();
    stepBubbles(dt);
    const s = currentSpread();
    pgEl.textContent = s === 0 ? '封面' : `第 ${s} / ${NL} 页`;
    capEl.textContent = s === 0 ? BOOK.title : STORY[s].title;
    prevBtn.disabled = s === 0; nextBtn.disabled = s === NL;
    if (s !== shownStory) { shownStory = s; storyEl.classList.add('off'); clearTimeout(storyEl._t); if (s > 0) storyEl._t = setTimeout(() => { storyEl.innerHTML = `<p>${STORY[s].text.join('')}</p>`; storyEl.classList.remove('off'); }, 350); }
    hintEl.textContent = Demo.on ? '自动演示中 · 点一下画面随时接管' : s === 0 ? '点 ▶ 或向左拖动书页，翻开立体书 · 每页都藏着一颗金色小星星' : s === NL && spreads[NL - 1].p > .9 ? BOOK.endHint : STORY[s].hint;
    if (!beds && SFX.ready) beds = makeBeds();
    if (beds) beds.forEach((b, i) => { if (!b) return; const v = spreads[i].alpha > Math.PI * .85 ? bedLevel(i) : 0; if (v !== b.v) { b.v = v; b.set(v, 1); } });
    if (!FILM.skip) renderFrame();
  }

  /* ---------------- boot ---------------- */
  function loadImages(onProgress) {
    const keys = Object.keys(IMG_SRC); let n = 0;
    return Promise.all(keys.map(k => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => { n++; onProgress(n / keys.length); res(); }; im.src = IMG_SRC[k]; IM[k] = im; })));
  }
  function resize() {
    if (!renderer) return;
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    renderer.setSize(W, H, false); camera.aspect = W / Math.max(1, H); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H); }
    const portrait = W / Math.max(1, H) < .9; document.getElementById('stage').classList.toggle('portrait', portrait && !window.FILM_MODE);
    if (window.FILM_MODE) camera.clearViewOffset(); else camera.setViewOffset(W, H, 0, portrait ? H * .07 : Math.min(56, H * .07), W, H); camera.updateProjectionMatrix();
    const nb = W / Math.max(1, H) < .9 ? 1.0 : .86; if (nb !== cam.base) { cam.base = nb; cam.polT = cam.pol = nb; }
  }
  async function boot() {
    cv = document.getElementById('cv');
    capEl = document.getElementById('cap'); storyEl = document.getElementById('story'); pgEl = document.getElementById('pg'); hintEl = document.getElementById('hint'); bubblesEl = document.getElementById('bubbles');
    prevBtn = document.getElementById('prev'); nextBtn = document.getElementById('next');
    prevBtn.addEventListener('click', () => { stopDemo(); turn(-1); }); nextBtn.addEventListener('click', () => { stopDemo(); turn(1); });
    document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { stopDemo(); turn(1); } if (e.key === 'ArrowLeft') { stopDemo(); turn(-1); } });
    Demo.btn = document.getElementById('demo'); Demo.btn.addEventListener('click', () => Demo.on ? stopDemo() : runDemo()); paintDemo();
    starEl = document.getElementById('stars'); paintStars(false);
    const bar = document.getElementById('loadbar');
    if (typeof THREE === 'undefined') { document.querySelector('#loading .box').insertAdjacentHTML('beforeend', '<p style="font-family:var(--f-serif);font-size:14px;margin-top:14px">3D 引擎没有加载出来，请检查网络后刷新。</p>'); return; }
    await loadImages(p => bar.style.width = Math.round(p * 100) + '%');
    if (window.FILM_MODE) { document.body.classList.add('film'); try { await document.fonts.load(`40px ${FONT}`, BOOK.title); await document.fonts.ready; } catch (e) { } }
    drawExtras(); build(); resize(); layout(); placeCamera(10);
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    if (window.ResizeObserver) new ResizeObserver(resize).observe(document.getElementById('stage')); else window.addEventListener('resize', resize);
    const ld = document.getElementById('loading'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 600);
    if (document.fonts && document.fonts.load) document.fonts.load(`40px ${FONT}`, [BOOK.title, BOOK.sub, ...STORY.slice(1).flatMap(x => [x.title, x.tab, x.dial || '', ...x.text])].join('')).then(rebuildText).catch(() => { });
    let last = performance.now();
    const frame = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; if (!document.hidden && !paused) { try { update(dt); } catch (err) { console.error(err); } } requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }
  let paused = false;
  // audio unlock + mute
  window.addEventListener('pointerdown', () => SFX.init(), { capture: true });
  const mb = document.getElementById('mute');
  const paintMute = () => { mb.setAttribute('aria-pressed', SFX.muted ? 'true' : 'false'); mb.setAttribute('aria-label', SFX.muted ? '打开声音' : '静音'); document.getElementById('ico-snd').toggleAttribute('hidden', SFX.muted); document.getElementById('ico-mute').toggleAttribute('hidden', !SFX.muted); };
  mb.addEventListener('click', () => { SFX.init(); SFX.setMuted(!SFX.muted); paintMute(); }); paintMute();
  boot();
  window.__film = { start: () => { filmStart(); resize(); }, step(dt, n = 1) { for (let i = 0; i < n; i++) filmStep(dt); return FILM.t; }, audio: filmAudio, skip(v) { FILM.skip = v; }, get t() { return FILM.t; } };
  window.__book = { project(obj) { const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()).project(camera), r = cv.getBoundingClientRect(); return [r.left + (c.x + 1) / 2 * r.width, r.top + (1 - c.y) / 2 * r.height]; }, get spreads() { return spreads; }, get leaves() { return leaves; }, cam, turn, pause(v) { paused = v; }, runDemo, stopDemo, Demo, found, tick: dt => update(dt),
    settle() { leaves.forEach(l => l.theta = l.target); spreads.forEach(sp => sp.p = sp.pT); layout(); placeCamera(10); placeCamera(10); },
    open(s) { leaves.forEach((l, i) => l.target = i < s ? Math.PI : 0); this.settle(); } };
})();
