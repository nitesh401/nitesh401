/* Interaction layer. Everything on the page is readable without this file;
   this only adds motion and the interactive map. */

/* Editable copy for the "Trace a failure" walkthrough (bottom layer first).
   Generic debugging steps, not a description of any particular system. */
const TRACE_CLUES = [
  "An alert fires. Logs and metrics narrow down when and where.",
  "Is the cluster healthy? Check resource limits and recent events.",
  "Inspect the container: restarts, configuration, image version.",
  "Look at queries, connections and transaction behaviour.",
  "Check for consumer lag, retries or a problematic message.",
  "Follow the request through service logs using a correlation ID.",
  "Compare the observed behaviour with the API contract.",
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const root = document.documentElement;

/* ---------- scroll-in reveals ---------- */
(function reveals() {
  const sel = ".kicker,.big,.lede,.uni__map,.uni__panel,.pipe,.trace,.caps li,.sub,.repos li,.status,.links li,.more,.foot";
  const els = $$(sel);
  if (reduce || !("IntersectionObserver" in window)) return;
  els.forEach((el) => {
    el.classList.add("rv");
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("rv")) : [];
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6));
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
})();

/* ---------- engineering universe ---------- */
(function universe() {
  const nodes = $$(".node");
  const groups = $$(".group");
  const panel = $("#uni-panel");
  if (!nodes.length || !panel) return;
  function select(id, userInitiated) {
    nodes.forEach((n) => n.setAttribute("aria-pressed", String(n.dataset.group === id)));
    groups.forEach((g) => g.classList.toggle("is-active", g.dataset.group === id));
    if (userInitiated && panel.getBoundingClientRect().top > innerHeight * 0.7) panel.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
  nodes.forEach((n) => n.addEventListener("click", () => select(n.dataset.group, true)));
  $("#uni-map")?.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    const i = nodes.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = nodes[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : nodes.length - 1)) % nodes.length];
    next.focus(); select(next.dataset.group, false);
  });
})();

/* ---------- pipeline: scroll fill + failure trace ---------- */
const pipe = $("#pipe");
const stages = $$(".stage");
function updatePipe() {
  if (!pipe) return;
  const r = pipe.getBoundingClientRect();
  const line = innerHeight * 0.62;
  pipe.style.setProperty("--fill", clamp((line - r.top) / r.height).toFixed(3));
  const tops = stages.map((s) => s.getBoundingClientRect().top);
  stages.forEach((s, i) => s.classList.toggle("is-lit", tops[i] < line));
}

(function trace() {
  const btn = $("#trace-btn"), note = $("#trace-note");
  if (!btn || !pipe) return;
  const idleText = note.textContent;
  let busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  stages.forEach((s, i) => {
    const c = document.createElement("span");
    c.className = "stage__clue"; c.hidden = true;
    c.textContent = TRACE_CLUES[stages.length - 1 - i];
    s.appendChild(c);
  });
  btn.addEventListener("click", async () => {
    if (busy) return;
    busy = true; btn.disabled = true; btn.setAttribute("aria-disabled", "true");
    $$(".stage__clue").forEach((c) => (c.hidden = true));
    pipe.classList.add("is-tracing");
    note.textContent = "Tracing from production back to the contract…";
    for (let i = stages.length - 1; i >= 0; i--) {
      stages.forEach((s) => s.classList.remove("is-hot"));
      stages[i].classList.add("is-hot");
      stages[i].classList.add("is-lit");
      const clue = $(".stage__clue", stages[i]); clue.hidden = false;
      if (!reduce) stages[i].scrollIntoView({ block: "center", behavior: "smooth" });
      await wait(1100);
    }
    pipe.classList.remove("is-tracing");
    stages.forEach((s) => s.classList.remove("is-hot"));
    note.textContent = "Every layer leaves evidence. Knowing where to look is the skill.";
    btn.disabled = false; btn.removeAttribute("aria-disabled");
    btn.firstChild.textContent = "Trace again ";
    busy = false;
    if (!reduce) btn.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => { if (!busy) note.textContent = idleText; }, 9000);
  });
})();

/* ---------- hero: sculpture, pointer + scroll depth ---------- */
const hero = $(".hero");
const canvas = $(".hero__canvas");
const plate = $(".plate");
const rows = $$(".name__row");
let scene = null, heroVisible = true;

async function bootScene() {
  if (!canvas) return;
  try {
    const { createScene } = await import("./scene.js");
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
    scene = createScene(canvas, { low: lowPower, still: reduce });
    if (!scene) return;
    root.classList.add("has-canvas");
    if (!reduce) { if (heroVisible && !document.hidden) scene.start(); }
  } catch (err) {
    // The inline SVG fallback stays visible.
  }
}
// Load after first paint so the headline is never blocked by the 3D module.
(window.requestIdleCallback || ((f) => setTimeout(f, 200)))(bootScene, { timeout: 800 });

if (hero && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    onScroll(); // re-sync depth values the moment the hero returns to view
    if (!scene || reduce) return;
    heroVisible && !document.hidden ? scene.start() : scene.stop();
  }, { threshold: 0 }).observe(hero);
}
document.addEventListener("visibilitychange", () => {
  if (!scene || reduce) return;
  document.hidden || !heroVisible ? scene.stop() : scene.start();
});

if (hero && !reduce) {
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !heroVisible) return;
    const x = (e.clientX / innerWidth) * 2 - 1, y = (e.clientY / innerHeight) * 2 - 1;
    scene?.setPointer(x, y);
    plate?.style.setProperty("--px", x.toFixed(3));
    plate?.style.setProperty("--py", y.toFixed(3));
  }, { passive: true });
}

/* ---------- single rAF-throttled scroll handler ---------- */
const bar = $(".progress i");
let ticking = false, pipeVisible = false;
if (pipe && "IntersectionObserver" in window) new IntersectionObserver(([e]) => { pipeVisible = e.isIntersecting; if (pipeVisible) onScroll(); }, { rootMargin: "20% 0px" }).observe(pipe);
else pipeVisible = true;

function frame() {
  ticking = false;
  const y = scrollY, max = root.scrollHeight - innerHeight;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
  if (heroVisible && hero) {
    const p = clamp(y / hero.offsetHeight);
    scene?.setScroll(p);
    plate?.style.setProperty("--sp", p.toFixed(3));
    if (!reduce && rows.length) {
      rows[0].style.transform = `translate3d(${(-p * 60).toFixed(1)}px,0,0)`;
      if (rows[1]) rows[1].style.transform = `translate3d(${(p * 60).toFixed(1)}px,0,0)`;
    }
  }
  if (pipeVisible) updatePipe();
}
function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll, { passive: true });
onScroll();

/* ---------- cursor ring (fine pointers only) ---------- */
(function cursor() {
  const el = $(".cursor");
  if (!el || reduce || !matchMedia("(pointer:fine)").matches) return;
  let x = 0, y = 0, tx = 0, ty = 0, on = false;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!on) { on = true; x = tx; y = ty; el.classList.add("is-on"); loop(); }
    el.classList.toggle("is-hot", !!e.target.closest?.("a,button"));
  }, { passive: true });
  document.addEventListener("pointerleave", () => { on = false; el.classList.remove("is-on"); });
  function loop() {
    if (!on) return;
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    requestAnimationFrame(loop);
  }
})();
