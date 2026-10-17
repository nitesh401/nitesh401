/* Hero sculpture: a faceted chrome geodesic with an inner wireframe, an orbit
   ring of seven nodes (one per delivery layer) and a bounded stream of data
   particles. Pure Canvas 2D, so it needs no WebGL and no library, and the whole
   module is only a few kilobytes. It only renders while the hero is on screen,
   and the tab is visible. */

const LIME = "198,255,61";
const UV = "139,108,255";

/* ---------- geometry (built once) ---------- */
function icosphere() {
  const t = (1 + Math.sqrt(5)) / 2;
  let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const norm = (p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
  v = v.map(norm);
  let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const cache = new Map();
  const mid = (a, b) => {
    const k = a < b ? a + "_" + b : b + "_" + a;
    if (cache.has(k)) return cache.get(k);
    const m = norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]);
    v.push(m); cache.set(k, v.length - 1); return v.length - 1;
  };
  const out = [];
  for (const [a, b, c] of f) {
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    out.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  const seen = new Set(), edges = [];
  for (const [a, b, c] of out) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    const k = p < q ? p + "_" + q : q + "_" + p;
    if (!seen.has(k)) { seen.add(k); edges.push([p, q]); }
  }
  return { v, faces: out, edges };
}

const OCTA = {
  v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  e: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5]],
};

export function createScene(canvas, { low = false, still = false } = {}) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  const G = icosphere();
  const maxP = low ? 22 : 46;
  const parts = Array.from({ length: maxP }, () => ({ e: (Math.random() * G.edges.length) | 0, t: Math.random(), s: 0.25 + Math.random() * 0.6, d: Math.random() < 0.5 ? 1 : -1 }));

  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  let yaw = 0.6, pitch = -0.25, vyaw = 0, vpitch = 0;
  let tx = 0, ty = 0; // pointer parallax target (-1..1)
  let px = 0, py = 0; // eased
  let scroll = 0;     // 0..1 hero scroll progress
  let running = false, raf = 0, last = 0, time = 0;
  let slow = 0, frames = 0;
  let dragging = false, lx = 0, ly = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (W < 900) { cx = W * 0.68; cy = Math.min(H * 0.24, 230); R = Math.min(W * 0.33, 150); }
    else { cx = W * 0.74; cy = H * 0.48; R = Math.min(H * 0.34, W * 0.22); }
    if (!running) draw(0);
  }

  const f = 3.6;
  function rot(p, cyw, syw, cp, sp) {
    const x = p[0] * cyw + p[2] * syw, z0 = -p[0] * syw + p[2] * cyw;
    const y = p[1] * cp - z0 * sp, z = p[1] * sp + z0 * cp;
    return [x, y, z];
  }
  function proj(p, k) { const s = f / (f - p[2]); return [cx + p[0] * s * R * k, cy - p[1] * s * R * k, s]; }

  function draw(dt) {
    time += dt;
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    if (!dragging) { vyaw *= 0.95; vpitch *= 0.95; yaw += vyaw + dt * 0.18; pitch += vpitch; }
    pitch += (-0.25 + py * -0.22 - pitch) * (dragging ? 0 : 0.015);

    const sy = yaw + scroll * 2.4 + px * 0.5;
    const cyw = Math.cos(sy), syw = Math.sin(sy), cp = Math.cos(pitch + scroll * 0.6), sp = Math.sin(pitch + scroll * 0.6);
    const k = (1 - scroll * 0.3) * (1 + Math.sin(time * 0.9) * 0.012);
    const alpha = 1 - scroll * 0.7;
    const ccy = cy; const prevCy = cy; cy = ccy - scroll * 50;

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0.15, alpha);

    // transformed vertices
    const tv = G.v.map((p) => rot(p, cyw, syw, cp, sp));
    const pv = tv.map((p) => proj(p, k));

    // soft floor glow
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
    g.addColorStop(0, `rgba(${UV},0.20)`); g.addColorStop(1, `rgba(${UV},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);

    // back faces (wire only) then front faces, sorted far to near
    const faces = G.faces.map((fc) => {
      const a = tv[fc[0]], b = tv[fc[1]], c = tv[fc[2]];
      const nx = (a[0] + b[0] + c[0]) / 3, ny = (a[1] + b[1] + c[1]) / 3, nz = (a[2] + b[2] + c[2]) / 3;
      const l = Math.hypot(nx, ny, nz) || 1;
      return { fc, n: [nx / l, ny / l, nz / l], z: nz };
    }).sort((a, b) => a.z - b.z);

    ctx.lineWidth = 1; ctx.lineJoin = "round";
    for (const { fc, n } of faces) {
      if (n[2] > 0) continue;
      ctx.beginPath();
      ctx.moveTo(pv[fc[0]][0], pv[fc[0]][1]); ctx.lineTo(pv[fc[1]][0], pv[fc[1]][1]); ctx.lineTo(pv[fc[2]][0], pv[fc[2]][1]); ctx.closePath();
      ctx.strokeStyle = `rgba(${UV},0.16)`; ctx.stroke();
    }

    // inner wireframe (drawn between back and front so the shell reads as glass)
    drawOcta(cyw, syw, cp, sp, k);

    const L = [-0.45, 0.62, 0.65];
    for (const { fc, n } of faces) {
      if (n[2] <= 0) continue;
      const d = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const rim = 1 - n[2];
      const v = 10 + 70 * Math.pow(d, 1.4) + 26 * Math.pow(rim, 3);
      ctx.beginPath();
      ctx.moveTo(pv[fc[0]][0], pv[fc[0]][1]); ctx.lineTo(pv[fc[1]][0], pv[fc[1]][1]); ctx.lineTo(pv[fc[2]][0], pv[fc[2]][1]); ctx.closePath();
      ctx.fillStyle = `rgba(${v | 0},${(v + 4) | 0},${(v + 14) | 0},0.78)`; ctx.fill();
      if (d > 0.9) { ctx.fillStyle = `rgba(${LIME},${(d - 0.9) * 3.2})`; ctx.fill(); }
      ctx.strokeStyle = `rgba(${LIME},${0.14 + 0.3 * d})`; ctx.stroke();
    }

    drawRing(cyw, syw, cp, sp, k);
    drawParticles(dt, pv, tv);
    ctx.globalAlpha = 1;
    cy = prevCy;
  }

  function drawOcta(cyw, syw, cp, sp, k) {
    const a = -time * 0.5, ca = Math.cos(a), sa = Math.sin(a);
    const pts = OCTA.v.map((p) => {
      const q = [p[0] * ca + p[2] * sa, p[1], -p[0] * sa + p[2] * ca];
      const r = rot(q.map((c) => c * 0.5), cyw, syw, cp, sp);
      return proj(r, k);
    });
    ctx.strokeStyle = `rgba(${UV},0.8)`; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [i, j] of OCTA.e) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); }
    ctx.stroke(); ctx.lineWidth = 1;
  }

  const NODES = 7;
  function drawRing(cyw, syw, cp, sp, k) {
    const tilt = 1.05, ct = Math.cos(tilt), st = Math.sin(tilt);
    const RR = 1.62;
    const active = Math.floor(time * 1.1) % NODES;
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + time * 0.25;
      const p = [Math.cos(a) * RR, Math.sin(a) * RR * ct, Math.sin(a) * RR * st];
      pts.push(proj(rot(p, cyw, syw, cp, sp), k));
    }
    ctx.strokeStyle = `rgba(${UV},0.35)`;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    for (let n = 0; n < NODES; n++) {
      const i = Math.round((n / NODES) * 48) % 48;
      const [x, y, s] = pts[i];
      const on = n === active;
      ctx.fillStyle = on ? `rgb(${LIME})` : `rgba(${LIME},0.55)`;
      const sz = (on ? 5 : 3.2) * Math.min(1.4, s);
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      if (on) { ctx.strokeStyle = `rgba(${LIME},0.5)`; ctx.strokeRect(x - sz, y - sz, sz * 2, sz * 2); }
    }
  }

  function drawParticles(dt, pv, tv) {
    ctx.fillStyle = `rgb(${LIME})`;
    for (const p of parts) {
      p.t += dt * p.s * p.d;
      if (p.t > 1 || p.t < 0) { p.e = (Math.random() * G.edges.length) | 0; p.d = Math.random() < 0.5 ? 1 : -1; p.t = p.d > 0 ? 0 : 1; }
      const [a, b] = G.edges[p.e];
      if (tv[a][2] + tv[b][2] < -0.3) continue; // hide on the far side
      const x = pv[a][0] + (pv[b][0] - pv[a][0]) * p.t, y = pv[a][1] + (pv[b][1] - pv[a][1]) * p.t;
      ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    draw(dt);
    // adaptive quality: a persistently slow device gets fewer particles and a lower resolution
    if (!low && ++frames > 40) { if (dt > 0.034) slow++; if (frames > 120) { if (slow > 40) { parts.length = Math.min(parts.length, 16); dpr = 1; resize(); } frames = -9999; } }
  }
  function start() { if (running || still) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // drag to spin (horizontal swipes only; vertical swipes still scroll the page)
  canvas.addEventListener("pointerdown", (e) => { if (still) return; dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    vyaw = dx * 0.006; vpitch = dy * 0.003; yaw += dx * 0.01; pitch = Math.max(-1, Math.min(0.6, pitch + dy * 0.006));
  });
  const up = () => { dragging = false; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    start, stop,
    setPointer(x, y) { tx = x; ty = y; },
    setScroll(p) { scroll = p; if (!running) draw(0); },
    get running() { return running; },
  };
}
