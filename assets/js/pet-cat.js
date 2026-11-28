/* 页面宠物：一只在视口里自己溜达的团子小黑猫。
   素材是 12 帧翻滚循环；移动时同一套帧跑快一点，看起来像滚过页面。
   约束：fixed + pointer-events:none，不参与布局、不拦点击、始终留一部分在视口内。 */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var FRAMES = 12;
  var FRAME_CSS = 100;     /* 素材单帧的 CSS 尺寸，随断点会变，运行时再测 */
  var SPEED = 46;          /* px / s */
  var IDLE_MS = 100;       /* 原地翻滚的节奏＝素材原速 */
  var MOVE_MS = 78;        /* 移动时略快一点 */
  var MARGIN = 14;

  var el = document.createElement("div");
  el.className = "pet";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="pet__sprite"></span>';
  document.body.appendChild(el);

  var sprite = el.firstChild;

  var dims = { w: FRAME_CSS, h: FRAME_CSS, frame: FRAME_CSS };

  function measure() {
    var r = sprite.getBoundingClientRect();
    dims.w = r.width || FRAME_CSS;
    dims.h = r.height || FRAME_CSS;
    dims.frame = dims.w;                     /* 单帧在条上的步长＝显示宽 */
  }

  function bounds() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    return {
      minX: MARGIN,
      minY: MARGIN,
      maxX: Math.max(MARGIN, w - dims.w - MARGIN),
      maxY: Math.max(MARGIN, h - dims.h - MARGIN)
    };
  }

  var st = {
    x: 0, y: 0, tx: 0, ty: 0,
    mode: "idle", wait: 1.2,
    frame: 0, acc: 0,
    facing: -1
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function clamp() {
    var b = bounds();
    st.x = Math.min(b.maxX, Math.max(b.minX, st.x));
    st.y = Math.min(b.maxY, Math.max(b.minY, st.y));
  }

  function paint() {
    el.style.transform = "translate3d(" + st.x.toFixed(1) + "px," + st.y.toFixed(1) + "px,0)";
  }

  function setFrame(i) {
    st.frame = i % FRAMES;
    sprite.style.backgroundPosition = -(st.frame * dims.frame) + "px 0";
  }

  function face(dir) {
    if (dir === st.facing) return;
    st.facing = dir;
    el.classList.toggle("pet--flip", dir > 0);   /* 素材朝左，向右走时翻转 */
  }

  function pickTarget() {
    var b = bounds();
    var x, y, guard = 0;
    do {
      x = rand(b.minX, b.maxX);
      y = rand(b.minY, b.maxY);
      guard += 1;
    } while (Math.abs(x - st.x) < 90 && guard < 24);
    st.tx = x;
    st.ty = y;
  }

  function start() {
    measure();
    var b = bounds();
    st.x = rand(b.minX, b.maxX);
    st.y = rand(b.minY, b.maxY);
    pickTarget();
    paint();
    setFrame(0);
    el.classList.add("is-ready");
    raf = window.requestAnimationFrame(loop);
  }

  function step(dt) {
    var interval = st.mode === "walk" ? MOVE_MS : IDLE_MS;
    st.acc += dt;
    if (st.acc >= interval) {
      st.acc = st.acc % interval;
      setFrame(st.frame + 1);
    }

    if (st.mode === "idle") {
      st.wait -= dt / 1000;
      if (st.wait <= 0) {
        st.mode = "walk";
        pickTarget();
      }
      return;
    }

    var dx = st.tx - st.x;
    var dy = st.ty - st.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var move = (SPEED * dt) / 1000;

    if (dist <= move || dist < 2) {
      st.x = st.tx; st.y = st.ty;
      clamp(); paint();
      st.mode = "idle";
      st.wait = rand(2.0, 5.0);
      return;
    }

    st.x += (dx / dist) * move;
    st.y += (dy / dist) * move;
    face(dx > 0 ? 1 : -1);
    clamp();
    paint();
  }

  var raf = 0;
  var last = 0;

  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(64, ts - last);
    last = ts;
    step(dt);
    raf = window.requestAnimationFrame(loop);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else if (!raf) {
      raf = window.requestAnimationFrame(loop);
    }
  });

  var rt = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () {
      measure();
      clamp();
      paint();
    }, 120);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  /* 自动化测试探针 */
  window.__pet = { state: st, bounds: bounds, step: step, dims: dims };
})();
