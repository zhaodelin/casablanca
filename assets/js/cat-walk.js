/* 小黑在页面里散步 —— 纯装饰层，不参与布局，也不拦截鼠标事件 */
(function () {
  "use strict";

  var WALK_FRAMES = 8;
  var IDLE_FRAMES = 4;
  var WALK_MS = 105;
  var IDLE_MS = 420;
  var SPEED = 52;          // px / 秒
  var TURN_MS = 260;       // 转身停顿

  var el = document.createElement("div");
  el.className = "pet";
  el.setAttribute("aria-hidden", "true");
  var sprite = document.createElement("div");
  sprite.className = "pet__sprite";
  el.appendChild(sprite);
  document.body.appendChild(el);

  var W = el.offsetWidth || 96;
  var H = el.offsetHeight || 72;

  var x = Math.min(window.innerWidth * 0.55, window.innerWidth - W - 24);
  var y = Math.min(window.innerHeight * 0.62, window.innerHeight - H - 24);
  var dir = 1;                  // 1 朝右，-1 朝左
  var state = "idle";           // idle | turn | walk
  var frame = 0;
  var frameAt = 0;
  var stateUntil = performance.now() + 800;
  var target = { x: x, y: y };
  var raf = null;
  var last = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickTarget() {
    var padX = 16;
    var topLimit = 76;                       // 不钻到导航下面
    var bottomLimit = window.innerHeight - H - 18;
    target.x = rand(padX, Math.max(padX + 20, window.innerWidth - W - padX));
    target.y = rand(topLimit, Math.max(topLimit + 20, bottomLimit));
  }

  function startIdle(now, ms) {
    state = "idle";
    stateUntil = now + (ms || rand(1200, 3600));
    frame = 0;
    frameAt = now;
  }

  function startWalk(now) {
    pickTarget();
    var dx = target.x - x;
    var dy = target.y - y;
    var want = dx >= 0 ? 1 : -1;
    if (want !== dir) {
      state = "turn";
      stateUntil = now + TURN_MS;
    } else {
      state = "walk";
    }
    frameAt = now;
  }

  function setFrame(f, idle) {
    var cellW = sprite.offsetWidth || 96;
    var col = idle ? WALK_FRAMES + (f % IDLE_FRAMES) : (f % WALK_FRAMES);
    sprite.style.backgroundPosition = (-col * cellW) + "px 0";
  }

  function clamp() {
    var maxX = Math.max(8, window.innerWidth - W - 8);
    var maxY = Math.max(80, window.innerHeight - H - 8);
    x = Math.min(Math.max(8, x), maxX);
    y = Math.min(Math.max(72, y), maxY);
  }

  function draw() {
    el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    sprite.style.transform = dir < 0 ? "scaleX(-1)" : "scaleX(1)";
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) {
      last = now;
      return;
    }
    var dt = Math.min(64, now - (last || now));
    last = now;

    if (state === "idle") {
      if (now - frameAt >= IDLE_MS) {
        frame = (frame + 1) % IDLE_FRAMES;
        frameAt = now;
      }
      setFrame(frame, true);
      if (now >= stateUntil) startWalk(now);
    } else if (state === "turn") {
      setFrame(0, true);
      if (now >= stateUntil) {
        dir *= -1;
        state = "walk";
        frameAt = now;
      }
    } else {
      var dx = target.x - x;
      var dy = target.y - y;
      var dist = Math.hypot(dx, dy);
      if (dist < 6) {
        startIdle(now);
      } else {
        var step = (SPEED * dt) / 1000;
        var k = Math.min(1, step / dist);
        x += dx * k;
        y += dy * k;
        if (Math.abs(dx) > 1.5) {
          var want = dx > 0 ? 1 : -1;
          if (want !== dir) {
            state = "turn";
            stateUntil = now + TURN_MS;
          }
        }
        if (now - frameAt >= WALK_MS) {
          frame = (frame + 1) % WALK_FRAMES;
          frameAt = now;
        }
        setFrame(frame, false);
      }
    }

    // 走的时候轻微上下起伏，像踩在地上
    var bob = state === "walk" ? Math.sin(now / 95) * 1.2 : 0;
    el.style.transform =
      "translate3d(" + x.toFixed(1) + "px," + (y + bob).toFixed(1) + "px,0)";
    sprite.style.transform = dir < 0 ? "scaleX(-1)" : "scaleX(1)";
  }

  function boot() {
    W = el.offsetWidth || 96;
    H = el.offsetHeight || 72;
    clamp();
    draw();
    startIdle(performance.now(), 700);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", function () {
    W = el.offsetWidth || 96;
    H = el.offsetHeight || 72;
    clamp();
    draw();
  });

  // 点一下也会被“无视”，但如果用户正要点某个链接，小黑不挡路
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
