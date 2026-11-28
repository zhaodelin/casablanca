/* 页面宠物：一只在视口里自己溜达的小黑猫。
   约束：fixed + pointer-events:none，不参与布局、不拦截点击；活动范围始终在视口内。 */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var WALK_FRAMES = 8;
  var IDLE_FRAMES = 2;
  var FRAME_W = 112;      /* 与 pet.css 里的显示尺寸一致 */
  var FRAME_H = 84;
  var SPEED = 54;         /* px / s */
  var WALK_MS = 110;
  var IDLE_MS = 520;
  var MARGIN = 12;

  var el = document.createElement("div");
  el.className = "pet";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="pet__sprite"></span>';
  document.body.appendChild(el);

  var sprite = el.firstChild;
  var scale = 1;

  function measureScale() {
    var w = sprite.getBoundingClientRect().width;
    scale = w / FRAME_W || 1;
  }

  function bounds() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    return {
      minX: MARGIN,
      minY: MARGIN,
      maxX: Math.max(MARGIN, w - FRAME_W * scale - MARGIN),
      maxY: Math.max(MARGIN, h - FRAME_H * scale - MARGIN)
    };
  }

  var state = {
    x: 0, y: 0,
    tx: 0, ty: 0,
    dir: 1,               /* 1 向右，-1 向左 */
    mode: "idle",
    wait: 0.6,
    frame: 0,
    acc: 0,
    facing: 1
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function place() {
    var b = bounds();
    state.x = rand(b.minX, b.maxX);
    state.y = rand(b.minY, b.maxY);
    pickTarget();
    render();
  }

  function pickTarget() {
    var b = bounds();
    var far = 120;
    var x, y, guard = 0;
    do {
      x = rand(b.minX, b.maxX);
      y = rand(b.minY, b.maxY);
      guard += 1;
    } while (Math.abs(x - state.x) < far && guard < 24);
    state.tx = x;
    state.ty = y;
  }

  function clamp() {
    var b = bounds();
    state.x = Math.min(b.maxX, Math.max(b.minX, state.x));
    state.y = Math.min(b.maxY, Math.max(b.minY, state.y));
  }

  function face(dir) {
    if (dir === state.facing) return;
    state.facing = dir;
    el.classList.toggle("pet--flip", dir > 0);  /* 素材朝左，向右走时翻转 */
  }

  function render() {
    el.style.transform = "translate3d(" + state.x.toFixed(1) + "px," + state.y.toFixed(1) + "px,0)";
  }

  function tick(dt) {
    state.acc += dt;

    if (state.mode === "idle") {
      if (state.acc >= IDLE_MS) {
        state.acc = 0;
        state.frame = (state.frame + 1) % IDLE_FRAMES;
        sprite.style.backgroundPosition = -(WALK_FRAMES + state.frame) * FRAME_W + "px 0";
      }
      state.wait -= dt / 1000;
      if (state.wait <= 0) {
        state.mode = "walk";
        state.acc = WALK_MS;
        pickTarget();
      }
      return;
    }

    var dx = state.tx - state.x;
    var dy = state.ty - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      state.mode = "idle";
      state.wait = rand(1.0, 3.2);
      state.acc = 0;
      state.frame = 0;
      return;
    }

    var step = (SPEED * dt) / 1000;
    if (step > dist) step = dist;
    state.x += (dx / dist) * step;
    state.y += (dy / dist) * step;
    clamp();
    face(dx > 0 ? 1 : -1);
    render();

    if (state.acc >= WALK_MS) {
      state.acc = 0;
      state.frame = (state.frame + 1) % WALK_FRAMES;
      sprite.style.backgroundPosition = -state.frame * FRAME_W + "px 0";
    }
  }

  var last = 0;
  var raf = 0;

  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(64, ts - last);   /* 切后台回来时不要瞬移 */
    last = ts;
    tick(dt);
    raf = window.requestAnimationFrame(loop);
  }

  function start() {
    measureScale();
    place();
    el.classList.add("is-ready");
    raf = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!raf) raf = window.requestAnimationFrame(loop);
  });

  var rt = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () {
      measureScale();
      clamp();
      render();
      if (state.tx > bounds().maxX || state.ty > bounds().maxY) pickTarget();
    }, 120);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  /* 给自动化测试留一个只读探针 */
  window.__pet = {
    state: state,
    bounds: bounds,
    step: tick
  };
})();
