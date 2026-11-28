/* 页面宠物：一只在视口里自己溜达的小黑猫（12 帧团子，可拖拽）。
   约束：fixed，不参与布局；只有猫本体接收指针事件，其余区域不拦截点击。 */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var FRAMES = 12;
  var FRAME_W = 100;       /* 与 pet.css 的显示尺寸一致 */
  var FRAME_H = 100;
  var SPEED = 46;          /* px / s */
  var IDLE_MS = 100;       /* 原地翻滚的换帧节奏 */
  var MOVE_MS = 78;        /* 走路时换帧稍快 */
  var MARGIN = 14;
  var DRAG_THRESHOLD = 6;  /* 超过这么多像素才算拖拽，否则算点一下 */

  var el = document.createElement("div");
  el.className = "pet";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="pet__sprite" title="可以拖我"></span>';
  document.body.appendChild(el);

  var sprite = el.firstChild;
  var scale = 1;

  function measure() {
    var r = sprite.getBoundingClientRect();
    if (r.width > 0) scale = r.width / FRAME_W;
  }

  function bounds() {
    var vv = window.visualViewport;
    var w = vv ? vv.width : window.innerWidth;
    var h = vv ? vv.height : window.innerHeight;
    var bw = FRAME_W * scale;
    var bh = FRAME_H * scale;
    return {
      minX: MARGIN, minY: MARGIN,
      maxX: Math.max(MARGIN, w - bw - MARGIN),
      maxY: Math.max(MARGIN, h - bh - MARGIN)
    };
  }

  var state = {
    x: 0, y: 0, tx: 0, ty: 0,
    mode: "idle", wait: 0.8,
    frame: 0, acc: 0,
    facing: 1
  };

  var drag = { active: false, id: null, offX: 0, offY: 0, moved: false, sx: 0, sy: 0 };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function clamp() {
    var b = bounds();
    state.x = Math.min(b.maxX, Math.max(b.minX, state.x));
    state.y = Math.min(b.maxY, Math.max(b.minY, state.y));
  }

  function paint() {
    el.style.transform =
      "translate3d(" + state.x.toFixed(1) + "px," + state.y.toFixed(1) + "px,0)";
  }

  function frameAt(i) {
    sprite.style.backgroundPosition = -(i % FRAMES) * FRAME_W * scale + "px 0";
  }

  function pickTarget() {
    var b = bounds(), guard = 0, x, y;
    do {
      x = rand(b.minX, b.maxX);
      y = rand(b.minY, b.maxY);
      guard += 1;
    } while (guard < 24 && Math.abs(x - state.x) < 130 && Math.abs(y - state.y) < 90);
    state.tx = x; state.ty = y;
  }

  function place() {
    var b = bounds();
    state.x = rand(b.minX, b.maxX);
    state.y = rand(b.minY, b.maxY);
    clamp();
    pickTarget();
    paint();
    frameAt(0);
  }

  function tick(dt) {
    if (drag.active) return;          /* 拖拽时不自动走 */

    state.acc += dt;

    if (state.mode === "idle") {
      if (state.acc >= IDLE_MS) {
        state.acc = 0;
        state.frame = (state.frame + 1) % FRAMES;
        frameAt(state.frame);
      }
      state.wait -= dt / 1000;
      if (state.wait <= 0) {
        state.mode = "walk";
        state.acc = MOVE_MS;
        pickTarget();
      }
      return;
    }

    var dx = state.tx - state.x;
    var dy = state.ty - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      state.mode = "idle";
      state.wait = rand(0.9, 2.6);
      state.acc = 0;
      return;
    }

    var step = Math.min((SPEED * dt) / 1000, dist);
    state.x += (dx / dist) * step;
    state.y += (dy / dist) * step;
    clamp();
    paint();

    if (state.acc >= MOVE_MS) {
      state.acc = 0;
      state.frame = (state.frame + 1) % FRAMES;
      frameAt(state.frame);
    }
  }

  /* ---------- 拖拽 ---------- */

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    drag.active = true;
    drag.id = e.pointerId;
    drag.moved = false;
    drag.offX = e.clientX - state.x;
    drag.offY = e.clientY - state.y;
    drag.sx = e.clientX;
    drag.sy = e.clientY;
    try { sprite.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件没有捕获 */ }
    el.classList.add("is-dragging");
    state.mode = "idle";
  }

  function onMove(e) {
    if (!drag.active || e.pointerId !== drag.id) return;
    e.preventDefault();
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.sx) <= DRAG_THRESHOLD &&
          Math.abs(e.clientY - drag.sy) <= DRAG_THRESHOLD) return;
      drag.moved = true;
      pickTarget();
    }
    state.x = e.clientX - drag.offX;
    state.y = e.clientY - drag.offY;
    clamp();
    paint();
  }

  function onUp(e) {
    if (!drag.active) return;
    drag.active = false;
    drag.id = null;
    el.classList.remove("is-dragging");
    try { sprite.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }

    if (drag.moved) {
      state.mode = "idle";
      state.wait = 0.5;
      state.acc = 0;
      pickTarget();
    } else {
      /* 只是点了一下：翻个身 */
      state.mode = "idle";
      state.wait = 0.4;
      state.acc = 0;
      state.frame = 0;
      frameAt(0);
    }
  }

  sprite.addEventListener("pointerdown", onDown);
  sprite.addEventListener("pointermove", onMove);
  sprite.addEventListener("pointerup", onUp);
  sprite.addEventListener("pointercancel", onUp);
  sprite.addEventListener("dragstart", function (e) { e.preventDefault(); });

  /* ---------- 主循环 ---------- */

  var last = 0;
  var raf = 0;

  function loop(ts) {
    if (!last) last = ts;
    var dt = Math.min(64, ts - last);
    last = ts;
    tick(dt);
    raf = window.requestAnimationFrame(loop);
  }

  function start() {
    measure();
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
      measure();
      clamp();
      paint();
    }, 140);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  /* 自动化测试探针 */
  window.__pet = {
    state: state,
    drag: drag,
    bounds: bounds,
    step: tick,
    dims: function () { return { w: FRAME_W, h: FRAME_H, frames: FRAMES, scale: scale }; }
  };
})();
