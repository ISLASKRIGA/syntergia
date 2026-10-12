(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* ─────────────────────────────────────────────────────────────
     The Syntergia mark
     An S-spine built from two cubic béziers. Several strands run
     along it, offset by a twisting sine so they converge at the
     ends and cross at the centre — a ribbon of connections.
     ───────────────────────────────────────────────────────────── */

  const SPINE = [
    [[142, 46], [72, 18], [28, 100], [98, 148]],
    [[98, 148], [168, 196], [138, 278], [58, 254]],
  ];

  const bez = (p, u) => {
    const m = 1 - u;
    const a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
    return [
      a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
      a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
    ];
  };

  const spine = (t) => (t < 0.5 ? bez(SPINE[0], t * 2) : bez(SPINE[1], (t - 0.5) * 2));

  const normalAt = (t) => {
    const e = 0.002;
    const a = spine(Math.max(0, t - e));
    const b = spine(Math.min(1, t + e));
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return { tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len };
  };

  // Deterministic PRNG so the mark is identical on every load.
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  const VARIANTS = {
    hero:      { strands: 6, gap: 9.2, dots: 6, stroke: 0.75, rMin: 1.4, rMax: 3.4, big: 4.6, seed: 7,  animate: true },
    construct: { strands: 6, gap: 9.2, dots: 6, stroke: 0.75, rMin: 1.4, rMax: 3.4, big: 4.6, seed: 7,  animate: true, guides: true },
    card:      { strands: 5, gap: 8.4, dots: 5, stroke: 0.9,  rMin: 1.6, rMax: 3.4, big: 4.8, seed: 21, hot: 0.18 },
    nav:       { strands: 3, gap: 16,  dots: 3, stroke: 6,    rMin: 10,  rMax: 13,  big: 15,  seed: 5 },
    foot:      { strands: 3, gap: 16,  dots: 3, stroke: 6,    rMin: 10,  rMax: 13,  big: 15,  seed: 5 },
    app:       { strands: 4, gap: 11,  dots: 4, stroke: 2.6,  rMin: 5,   rMax: 8,   big: 10,  seed: 11 },
  };

  const el = (name, attrs) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };

  function buildMark(svg, v) {
    const rand = rng(v.seed);
    const frag = document.createDocumentFragment();
    const T0 = 0.035, T1 = 0.965, STEPS = 90;
    const mid = (v.strands - 1) / 2;

    const offsetAt = (k, t) => (k - mid) * v.gap * Math.sin(Math.PI * 2 * t + (k - mid) * 0.06);
    const pointOn = (k, t) => {
      const [x, y] = spine(t);
      const n = normalAt(t);
      const o = offsetAt(k, t);
      return [x + n.nx * o, y + n.ny * o];
    };

    if (v.guides) {
      const g = el("g", {});
      [
        ["circle", { cx: 92, cy: 98, r: 60 }],
        ["circle", { cx: 106, cy: 204, r: 60 }],
        ["circle", { cx: 100, cy: 150, r: 128 }],
        ["line", { x1: 100, y1: -10, x2: 100, y2: 310 }],
        ["line", { x1: -20, y1: 46, x2: 220, y2: 46 }],
        ["line", { x1: -20, y1: 148, x2: 220, y2: 148 }],
        ["line", { x1: -20, y1: 254, x2: 220, y2: 254 }],
        ["line", { x1: 10, y1: 290, x2: 190, y2: 10 }],
      ].forEach(([tag, a]) => g.appendChild(el(tag, { ...a, class: "guide" })));
      frag.appendChild(g);
    }

    // Strands
    for (let k = 0; k < v.strands; k++) {
      let d = "";
      for (let i = 0; i <= STEPS; i++) {
        const t = T0 + (T1 - T0) * (i / STEPS);
        const [x, y] = pointOn(k, t);
        d += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
      }
      const path = el("path", { d, class: "strand", pathLength: 1, "stroke-width": v.stroke });
      path.style.setProperty("--d", k);
      frag.appendChild(path);
    }

    // Nodes along each strand
    const dot = (x, y, r, t, hot) => {
      const c = el("circle", { cx: x.toFixed(2), cy: y.toFixed(2), r: r.toFixed(2), class: hot ? "dot dot--hot" : "dot" });
      c.style.setProperty("--d", Math.round(t * 1500));
      frag.appendChild(c);
    };

    for (let k = 0; k < v.strands; k++) {
      for (let j = 0; j < v.dots; j++) {
        const t = T0 + 0.04 + ((j + rand() * 0.8) / v.dots) * (T1 - T0 - 0.08);
        const [x, y] = pointOn(k, t);
        const isBig = rand() < 0.14;
        const r = isBig ? v.big : v.rMin + rand() * (v.rMax - v.rMin);
        dot(x, y, r, t, v.hot && rand() < v.hot);
      }
    }

    // Trailing nodes beyond each end — the mark "emerging"
    const tail = (t, dir) => {
      const [x, y] = spine(t);
      const n = normalAt(t);
      const s = v.big / 4.6;
      dot(x + n.tx * dir * 16 * s, y + n.ty * dir * 16 * s, v.rMax * 0.95, dir < 0 ? 0 : 1);
      dot(x + n.tx * dir * 34 * s + n.nx * 4, y + n.ty * dir * 34 * s + n.ny * 4, v.big * 0.92, dir < 0 ? 0 : 1);
    };
    tail(T0, -1);
    tail(T1, 1);

    svg.appendChild(frag);
    if (v.animate) svg.setAttribute("data-animate", "");
    else svg.setAttribute("data-static", "");
  }

  document.querySelectorAll("[data-mark]").forEach((svg) => {
    const v = VARIANTS[svg.dataset.mark];
    if (v) buildMark(svg, v);
  });

  /* ───────────────────────── Intro choreography ───────────────────────── */

  document.querySelectorAll(".wordmark--hero span").forEach((s, i) => s.style.setProperty("--d", i));

  const heroMark = document.querySelector(".mark--hero");
  const start = () => {
    root.classList.add("is-loaded");
    requestAnimationFrame(() => heroMark && heroMark.classList.add("is-drawn"));
    document.querySelectorAll(".hero .reveal").forEach((n) => n.classList.add("is-in"));
  };
  // Wait for fonts so the wordmark doesn't reflow mid-animation, but never block for long.
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))])
    .then(() => requestAnimationFrame(start));

  /* ───────────────────────── Scroll reveals ───────────────────────── */

  const revealIO = new IntersectionObserver(
    (entries) => {
      let n = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty("--stagger", n++);
        e.target.classList.add("is-in");
        revealIO.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  document.querySelectorAll(".reveal:not(.hero .reveal)").forEach((n) => revealIO.observe(n));

  const construct = document.querySelector(".mark--construct");
  if (construct) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { construct.classList.add("is-drawn"); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(construct);
  }

  /* ───────────────────────── Nav: tone over dark sections ───────────────────────── */

  const nav = document.querySelector("[data-nav]");
  const darkSections = new Set();
  const navIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? darkSections.add(e.target) : darkSections.delete(e.target)));
      nav.classList.toggle("is-dark", darkSections.size > 0);
    },
    { rootMargin: "-40px 0px -92% 0px" }
  );
  document.querySelectorAll(".manifesto, .contact").forEach((s) => navIO.observe(s));

  /* ───────────────────────── Mobile menu ───────────────────────── */

  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ───────────────────────── Hero parallax (spring) ─────────────────────────
     Decorative only, so it gets momentum instead of tracking the cursor 1:1. */

  const wrap = document.querySelector("[data-parallax]");
  if (wrap && finePointer && !reduceMotion) {
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const STIFF = 0.045, DAMP = 0.82;
    let raf = 0;

    const tick = () => {
      for (const k of ["x", "y"]) {
        vel[k] = (vel[k] + (target[k] - pos[k]) * STIFF) * DAMP;
        pos[k] += vel[k];
      }
      wrap.style.transform =
        `translate3d(${(pos.x * 14).toFixed(2)}px, ${(pos.y * 10).toFixed(2)}px, 0) rotate(${(pos.x * 4).toFixed(2)}deg)`;
      const settled = Math.abs(vel.x) + Math.abs(vel.y) < 0.0004 && Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) < 0.001;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    window.addEventListener("pointermove", (e) => {
      if (window.scrollY > window.innerHeight) return;
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    }, { passive: true });
    document.addEventListener("pointerleave", () => { target.x = 0; target.y = 0; kick(); });
  }

  /* ───────────────────────── Manifesto field (canvas) ─────────────────────────
     Flowing filaments in spectral violet with nodes riding them. */

  const canvas = document.querySelector("[data-field]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, raf = 0, visible = false, t0 = performance.now();
    const LINES = 28;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!raf) draw(performance.now());
    };

    const yAt = (i, x, t) => {
      const c = i - LINES / 2;
      const spread = h * 0.012 * (0.55 + 0.45 * Math.sin(x * 0.0016 + t * 0.22));
      return (
        h * 0.58 +
        c * spread * 1.6 +
        Math.sin(x * 0.0022 + t * 0.35 + i * 0.11) * h * 0.11 +
        Math.sin(x * 0.0057 - t * 0.21 + i * 0.27) * h * 0.035 -
        (x / w) * h * 0.12
      );
    };

    function draw(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const step = 8;

      for (let i = 0; i < LINES; i++) {
        const fall = 1 - Math.abs(i - LINES / 2) / (LINES / 2);
        ctx.strokeStyle = `rgba(124, 98, 255, ${(0.05 + fall * 0.22).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const y = yAt(i, x, t);
          x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (i % 3 === 1) {
          const gapX = 150 + (i % 5) * 22;
          const drift = ((t * (14 + i)) % gapX);
          for (let x = (i * 37) % gapX + drift - gapX; x < w + gapX; x += gapX) {
            const y = yAt(i, x, t);
            const a = 0.35 + fall * 0.65;
            ctx.fillStyle = `rgba(107, 76, 255, ${(a * 0.16).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(176, 160, 255, ${a.toFixed(3)})`;
            ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      raf = visible && !reduceMotion ? requestAnimationFrame(draw) : 0;
    }

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (visible && !raf) raf = requestAnimationFrame(draw);
    });
  }

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
