/* 页面宠物：一只在视口里溜达的小黑（12 帧团子，可拖拽）。
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
  el.innerHTML = '<span class="pet__sprite" title="可以拖我"></span>' +
                 '<span class="pet__bubble"></span>';
  document.body.appendChild(el);

  var sprite = el.firstChild;
  var bubble = el.lastChild;
  bubble.innerHTML = '<span class="pet__bubble__txt"></span><i class="pet__caret"></i>';
  var bubbleTxt = bubble.firstChild;
  var scale = 1;

  /* 停顿时随机冒一句心里话 */
  var LINES = [
    "我叫小黑",
    "人类唯一厉害的就是做饭",
    "师父做什么就吃什么",
    "师父，我可以和你一起走吗？",
    "师姐你好，我是师傅的锁门弟子"
  ];
  var lastLine = -1;

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
    facing: -1,           /* 素材朝左；-1 朝左、1 朝右（镜像） */
    bubbleIn: 0,          /* 还有多久冒泡（秒） */
    bubbleLeft: 0,        /* 气泡还能待多久（秒） */
    bubbleOn: false
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

  /* 素材朝左：向右走时整只镜像，让头朝行进方向。
     dir: -1 朝左（原图），1 朝右（镜像）。留一点滞回，避免在正上/正下方抖动。 */
  var DIR_EPS = 1.2;

  function face(dir) {
    if (dir === 0) return;
    var next = dir > 0 ? 1 : -1;
    if (next === state.facing) return;
    state.facing = next;
    el.classList.toggle("pet--flip", next > 0);
  }

  function faceToward(dx, dy) {
    if (Math.abs(dx) < DIR_EPS && Math.abs(dy) < DIR_EPS) return;
    if (Math.abs(dx) >= Math.abs(dy) * 0.6) face(dx > 0 ? 1 : -1);
    else if (Math.abs(dx) > 0.4) face(dx > 0 ? 1 : -1);
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
    el.classList.toggle("pet--flip", state.facing > 0);
  }

  /* ---------- 思考框 ---------- */

  function nextLine() {
    var i = Math.floor(Math.random() * LINES.length);
    if (LINES.length > 1 && i === lastLine) i = (i + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length;
    lastLine = i;
    return LINES[i];
  }

  /* 打字机：一个字一个字冒出来，标点处稍作停顿 */
  var typer = { timer: 0, text: "", i: 0, done: true };

  function stopTyping() {
    if (typer.timer) window.clearTimeout(typer.timer);
    typer.timer = 0;
    typer.done = true;
  }

  function typeNext() {
    if (typer.i >= typer.text.length) {
      typer.done = true;
      bubble.classList.add("is-done");
      return;
    }
    typer.i += 1;
    bubbleTxt.textContent = typer.text.slice(0, typer.i);
    var ch = typer.text.charAt(typer.i - 1);
    var pause = "，。？！；、".indexOf(ch) >= 0 ? 120 : 0;
    typer.timer = window.setTimeout(typeNext, 52 + pause);
  }

  function startTyping(text) {
    stopTyping();
    typer.text = text;
    typer.i = 0;
    typer.done = false;
    bubble.classList.remove("is-done");
    bubbleTxt.textContent = "";
    typeNext();
  }

  function showBubble() {
    var text = nextLine();

    /* 先按整句量好宽度，避免逐字生长时气泡抖动 */
    bubble.style.width = "auto";
    bubbleTxt.textContent = text;
    var full = bubble.getBoundingClientRect().width;
    bubble.style.width = Math.ceil(full) + "px";
    bubbleTxt.textContent = "";
    bubble.classList.remove("is-done");

    /* 贴近上沿就翻到猫下方 */
    var below = state.y < 104;
    el.classList.toggle("pet--bubble-below", below);

    /* 左右越界时把气泡拽回来 */
    bubble.style.setProperty("--nudge", "0px");
    var r = bubble.getBoundingClientRect();
    var vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    var pad = 10;
    var shift = 0;
    if (r.left < pad) shift = pad - r.left;
    else if (r.right > vw - pad) shift = (vw - pad) - r.right;
    bubble.style.setProperty("--nudge", shift.toFixed(1) + "px");

    bubble.classList.add("is-on");
    state.bubbleOn = true;
    state.bubbleLeft = 3.4;
    startTyping(text);
    if (state.wait < 1.4) state.wait = 1.4;   /* 别刚冒出来就走 */
  }

  function hideBubble() {
    stopTyping();
    bubbleTxt.textContent = "";
    bubble.classList.remove("is-done");
    bubble.style.width = "";
    if (!state.bubbleOn) return;
    bubble.classList.remove("is-on");
    state.bubbleOn = false;
    state.bubbleLeft = 0;
  }

  function armBubble() {
    hideBubble();
    if (Math.random() < 0.72) {
      state.bubbleIn = 0.3 + Math.random() * 0.25;
    } else {
      state.bubbleIn = -1;                    /* 这轮不说话 */
    }
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

      var sec = dt / 1000;

      if (!state.bubbleOn) {
        if (state.bubbleIn > 0) {
          state.bubbleIn -= sec;
          if (state.bubbleIn <= 0) showBubble();
        }
      } else {
        state.bubbleLeft -= sec;
        if (typer.done) state.bubbleLeft -= sec * 1.4;   /* 打完字后收起快一点 */
        if (state.bubbleLeft <= 0) hideBubble();
      }

      state.wait -= sec;
      if (state.wait <= 0) {
        state.mode = "walk";
        state.acc = MOVE_MS;
        hideBubble();
        pickTarget();
      }
      return;
    }

    var dx = state.tx - state.x;
    var dy = state.ty - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (state.bubbleOn) hideBubble();

    if (dist < 2) {
      state.mode = "idle";
      state.wait = rand(0.9, 2.6);
      state.acc = 0;
      armBubble();
      return;
    }

    var step = Math.min((SPEED * dt) / 1000, dist);
    state.x += (dx / dist) * step;
    state.y += (dy / dist) * step;
    clamp();
    paint();
    faceToward(dx, dy);

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
    hideBubble();
  }

  function onMove(e) {
    if (!drag.active || e.pointerId !== drag.id) return;
    e.preventDefault();
    var prevX = state.x;
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
    if (Math.abs(state.x - prevX) > 0.8) face(state.x > prevX ? 1 : -1);
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
      armBubble();
    } else {
      /* 只是点了一下：翻个身 */
      state.mode = "idle";
      state.wait = 0.9;
      state.acc = 0;
      state.frame = 0;
      frameAt(0);
      armBubble();
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
    armBubble();
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
    paint: paint,
    bubble: function () { return bubble; },
    dims: function () { return { w: FRAME_W, h: FRAME_H, frames: FRAMES, scale: scale }; }
  };
})();
