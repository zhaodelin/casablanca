/* ==========================================================
   罗小黑战记 · 设定集与年表
   app.js — 渲染全部内容
   ========================================================== */
(() => {
  "use strict";

  const D = window.LXH || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad2 = (n) => String(n).padStart(2, "0");
  const chars = D.characters || [];
  const byKey = Object.fromEntries(chars.map((c) => [c.key, c]));
  const rels = D.relations || [];
  const WB2 = "https://weibo.com/3175924975/";
  const WBC = "https://weibo.com/2019071187/";

  /* ---------------- 头像兜底 ---------------- */
  const avatarHTML = (c, cls = "") => {
    const initial = esc((c.name || "?").slice(0, 1));
    return `<img class="${cls}" src="${c.avatar}" alt="${esc(c.name)}" loading="lazy"
      data-fallback="${initial}" data-color="${c.color || "#1F3864"}"
      onerror="window.__avatarFallback&&window.__avatarFallback(this)">`;
  };
  window.__avatarFallback = (img) => {
    const box = document.createElement("div");
    box.className = "avatar-fallback " + img.className;
    box.style.background = img.dataset.color || "#1F3864";
    box.textContent = img.dataset.fallback || "?";
    img.replaceWith(box);
  };

  /* ==========================================================
     HERO
     ========================================================== */
  function renderHero() {
    const intro = $("#heroIntro");
    if (intro) intro.textContent = (D.meta && D.meta.intro) || "";
    const box = $("#heroStats");
    if (box) {
      box.innerHTML = (D.stats || [])
        .map((s) => `<div class="s"><div class="n">${esc(s.n)}<small>${esc(s.unit || "")}</small></div><div class="l">${esc(s.l)}</div><div class="s2">${esc(s.s || "")}</div></div>`)
        .join("");
    }
  }

  /* ==========================================================
     WORKS（作品线小卡）
     ========================================================== */
  const WORK_ANCHOR = { tv: "#timeline", film1: "#film1", film2: "#film2", comic: "#comic", extra: "#extras" };
  function renderWorks() {
    const box = $("#workGrid");
    if (!box) return;
    box.innerHTML = (D.works || [])
      .map(
        (w, i) => `<a class="wk reveal" href="${WORK_ANCHOR[w.key] || "#timeline"}" style="--i:${i}">
        <span class="wk__tag">${esc(w.tag)}</span>
        <h3>${esc(w.title)}</h3>
        <p class="wk__sub">${esc(w.sub)}</p>
        <p class="wk__text">${esc(w.text)}</p>
        <span class="wk__go">继续看 →</span>
      </a>`
      )
      .join("");
  }

  /* ==========================================================
     TIMELINE
     ========================================================== */
  const WORK_LABEL = { film1: "战记 1", film2: "战记 2", tv: "TV", comic: "蓝溪镇", extra: "番外" };
  function tlItem(e, isStory) {
    const cls = isStory ? "" : ` tl__item--${e.work || "tv"}`;
    const tag = !isStory && e.work ? `<span class="tl__tag">${esc(WORK_LABEL[e.work] || e.work)}</span>` : "";
    return `<article class="tl__item${cls}">
      <div class="tl__date">${esc(e.date)}</div>
      <h3 class="tl__title">${esc(e.title)}${tag}</h3>
      <p class="tl__text">${esc(e.text)}</p>
    </article>`;
  }
  function renderTimelines() {
    const tw = $("#tlWork");
    const ts = $("#tlStory");
    if (tw) tw.innerHTML = (D.timeline || []).map((e) => tlItem(e, false)).join("");
    if (ts) ts.innerHTML = `<p class="tl__mark">— 剧情线 · 小黑走过的路 —</p>` + (D.story || []).map((e) => tlItem(e, true)).join("");
  }

  /* ==========================================================
     CHARACTERS
     ========================================================== */
  const GROUPS = [
    { key: "all", label: "全部" },
    { key: "main", label: "主角与家人", keys: ["xiaohei", "infin", "luye", "xiaobai", "agen"] },
    { key: "guild", label: "妖灵会馆", keys: ["laojun", "dishing", "qingning", "nezha"] },
    { key: "film2", label: "战记 2 新面孔", keys: ["lingyao", "chinan"] },
    { key: "old", label: "旧日同路", keys: ["fengxi", "luozhu", "xuhuai", "tianhu"] },
    { key: "pal", label: "小妖怪与伙伴", keys: ["bidiu", "heixiu", "dongdong"] },
    { key: "crew", label: "主创", keys: ["shanxin", "mtjj"] },
  ];
  let groupNow = "all";
  function renderCharFilter() {
    const box = $("#charFilter");
    if (!box) return;
    box.innerHTML = GROUPS.map((g) => `<button class="chip ${g.key === "all" ? "is-on" : ""}" data-g="${g.key}">${g.label}</button>`).join("");
  }
  function charCard(c, i) {
    return `<button class="char reveal" data-key="${c.key}" style="--i:${i}">
      <span class="char__pic">${avatarHTML(c)}</span>
      <span class="char__role">${esc(c.role)}</span>
      <span class="char__body">
        <span class="char__name">${esc(c.name)}</span>
        <span class="char__en">${esc(c.en || "")}</span>
        <span class="char__one">${esc(c.desc)}</span>
        <span class="char__foot"><span>${esc(c.faction || "")}</span><b>${c.posts ? esc(c.posts) + " 次提及" : ""}</b></span>
      </span>
    </button>`;
  }
  function renderChars() {
    const box = $("#charGrid");
    if (!box) return;
    const g = GROUPS.find((x) => x.key === groupNow) || GROUPS[0];
    const list = groupNow === "all" ? chars : chars.filter((c) => (g.keys || []).includes(c.key));
    box.innerHTML = list.map(charCard).join("");
    observeReveal(box);
    $$(".char", box).forEach((b) => b.addEventListener("click", () => openChar(b.dataset.key)));
  }

  /* ---------------- 人物弹窗 ---------------- */
  function openChar(key) {
    const c = byKey[key];
    if (!c) return;
    const rs = rels.filter((r) => r[0] === key || r[1] === key);
    const relHTML = rs
      .map(([a, b, label]) => {
        const other = byKey[a === key ? b : a];
        if (!other) return "";
        return `<button class="r" data-go="${other.key}">${avatarHTML(other)}<span>${esc(other.name)}</span><em>${esc(label)}</em></button>`;
      })
      .join("");
    const body = `<div class="mc__hero">
        <div class="mc__pic">${avatarHTML(c)}</div>
        <div class="mc__main">
          <p class="mc__role">${esc(c.role)}</p>
          <h3 class="mc__name">${esc(c.name)}</h3>
          <p class="mc__en">${esc(c.en || "")}</p>
          <p class="mc__desc">${esc(c.desc)}</p>
          <div class="mc__tags">${(c.tags || []).map((t) => `<span>#${esc(t)}</span>`).join("")}</div>
          <table class="mc__meta">
            <tr><th>阵营</th><td>${esc(c.faction || "—")}</td></tr>
            ${c.species ? `<tr><th>种族</th><td>${esc(c.species)}</td></tr>` : ""}
            ${c.age ? `<tr><th>年龄</th><td>${esc(c.age)}</td></tr>` : ""}
            ${c.height && c.height !== "—" ? `<tr><th>身高</th><td>${esc(c.height)}</td></tr>` : ""}
            ${c.power ? `<tr><th>能力</th><td>${esc(c.power)}</td></tr>` : ""}
            <tr><th>配音</th><td>${esc(c.cv || "—（官微未公布）")}</td></tr>
            <tr><th>首次登场</th><td>${esc(c.debut || "—")}</td></tr>
            <tr><th>官微提及</th><td>${c.posts ? esc(c.posts) + " 条" : "—"}</td></tr>
          </table>
          ${c.official ? `<p class="mc__official">设定集原文：${esc(c.official)}${c.source ? `（${esc(c.source)}）` : ""}</p>` : ""}
          ${c.quote ? `<blockquote class="mc__quote">「${esc(c.quote)}」</blockquote>` : ""}
        </div>
      </div>
      <div class="mc__rels"><h4>关系</h4>${relHTML || "<p>暂无</p>"}</div>`;
    openModal(body);
    $$("[data-go]", $("#modalBody")).forEach((b) =>
      b.addEventListener("click", () => openChar(b.dataset.go))
    );
  }

  /* ==========================================================
     NETWORK
     ========================================================== */
  const POS = {
    xiaohei: [500, 330], infin: [330, 232], luye: [468, 512], xiaobai: [640, 470],
    laojun: [700, 220], dishing: [818, 300], qingning: [760, 120], nezha: [600, 330],
    fengxi: [300, 420], luozhu: [196, 350], xuhuai: [214, 470], tianhu: [300, 540],
    bidiu: [420, 600], heixiu: [560, 620], agen: [672, 560], lingyao: [880, 470],
    chinan: [880, 570], dongdong: [770, 650], shanxin: [150, 200], mtjj: [500, 90],
    panjing: [118, 628], guanxuan: [228, 700], yuxi: [72, 512],
    jiulao: [604, 168], ruoshui: [700, 392], yifeng: [906, 678],
  };
  const REL_KIND = {
    师徒: "strong", 师姐弟: "strong", 主人: "strong", 创造者: "strong", 同镇伙伴: "strong",
    同伴: "normal", 朋友: "normal", 同学: "normal", 伙伴: "normal", 同僚: "normal",
    主从: "normal", 旧识牵挂: "normal", 长老同僚: "normal", 追查: "normal", "TV 新篇": "normal",
    弟子: "strong", 暗卫: "strong", 崇拜: "normal", 会馆同僚: "normal",
    对手: "foe", 立场对立: "foe",
  };
  function renderNet() {
    const svg = $("#netSvg");
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const defs = `<defs>
      ${chars
        .map((c) => {
          const r = nodeR(c);
          return `<clipPath id="cp-${c.key}" clipPathUnits="userSpaceOnUse"><circle cx="0" cy="0" r="${r - 3}"/></clipPath>`;
        })
        .join("")}
    </defs>`;
    const edgeLayer = document.createElementNS(NS, "g");
    const nodeLayer = document.createElementNS(NS, "g");
    rels.forEach(([a, b, label]) => {
      if (!POS[a] || !POS[b]) return;
      const [x1, y1] = POS[a];
      const [x2, y2] = POS[b];
      const ln = document.createElementNS(NS, "line");
      const kind = REL_KIND[label] || "normal";
      ln.setAttribute("class", "edge" + (kind === "strong" ? " edge--strong" : ""));
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
      ln.dataset.a = a; ln.dataset.b = b;
      edgeLayer.appendChild(ln);

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const t = document.createElementNS(NS, "text");
      t.setAttribute("class", "edge__label");
      t.setAttribute("x", mx); t.setAttribute("y", my - 4);
      t.dataset.a = a; t.dataset.b = b;
      t.textContent = label;
      edgeLayer.appendChild(t);
    });


    chars.forEach((c) => {
      const p = POS[c.key];
      if (!p) return;
      const [x, y] = p;
      const r = nodeR(c);
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-key", c.key);
      g.setAttribute("transform", `translate(${x} ${y})`);

      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("r", r);
      ring.setAttribute("class", "node__ring");
      g.appendChild(ring);

      const im = document.createElementNS(NS, "image");
      im.setAttribute("href", c.avatar);
      im.setAttribute("x", -r + 3); im.setAttribute("y", -r + 3);
      im.setAttribute("width", (r - 3) * 2); im.setAttribute("height", (r - 3) * 2);
      im.setAttribute("clip-path", `url(#cp-${c.key})`);
      im.setAttribute("preserveAspectRatio", "xMidYMid slice");
      im.setAttribute("class", "node__img");
      g.appendChild(im);

      const nm = document.createElementNS(NS, "text");
      nm.setAttribute("class", "node__name");
      nm.setAttribute("y", r + 20);
      nm.textContent = c.name;
      g.appendChild(nm);

      const rl = document.createElementNS(NS, "text");
      rl.setAttribute("class", "node__role");
      rl.setAttribute("y", r + 34);
      rl.textContent = (c.role || "").split("·").pop().trim();
      g.appendChild(rl);

      nodeLayer.appendChild(g);
    });
    svg.innerHTML = defs;
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    // 图例
    const lg = $("#netLegend");
    if (lg) {
      lg.innerHTML = [
        ["strong", "亲密：师徒 / 家人 / 来历"],
        ["normal", "同行：同伴 / 同僚 / 朋友"],
        ["foe", "对立：对手 / 立场冲突"],
      ]
        .map(([k, t]) => `<li><i class="${k === "strong" ? "s" : ""}" style="${k === "foe" ? "background:#b4452f" : k === "strong" ? "" : "background:rgba(27,32,41,.3)"}"></i>${t}</li>`)
        .join("");
    }

    // 交互
    const stage = $(".net");
    const tip = $("#netTip");
    const fullName = (c) => c.name;
    $$(".node", svg).forEach((g) => {
      const key = g.dataset.key;
      const c = byKey[key];
      g.addEventListener("mouseenter", () => {
        stage.classList.add("is-focus");
        $$(".node", svg).forEach((n) => n.classList.toggle("is-on", n.dataset.key === key));
        $$(".edge", svg).forEach((e) => e.classList.toggle("is-on", e.dataset.a === key || e.dataset.b === key));
        $$(".edge__label", svg).forEach((e) => e.classList.toggle("is-on", e.dataset.a === key || e.dataset.b === key));
        if (tip) {
          const rs = rels.filter((r) => r[0] === key || r[1] === key);
          tip.innerHTML = `<h5>${esc(fullName(c))}</h5><p>${esc(c.role)} · ${esc(c.faction || "")}${
            c.posts ? ` · 官微 ${c.posts} 次` : ""
          }</p>${rs
            .map(([a, b, l]) => {
              const o = byKey[a === key ? b : a];
              return o ? `<span class="rel">${esc(o.name)} · ${esc(l)}</span>` : "";
            })
            .join("")}`;
        }
      });
      g.addEventListener("mouseleave", () => {
        stage.classList.remove("is-focus");
        $$(".node", svg).forEach((n) => n.classList.remove("is-on"));
        $$(".edge", svg).forEach((e) => e.classList.remove("is-on"));
        $$(".edge__label", svg).forEach((e) => e.classList.remove("is-on"));
        if (tip) tip.innerHTML = `<p class="net__lt">关系图例</p><p>把鼠标放到人物上试试；点一下打开设定卡。</p>`;
      });
      g.addEventListener("click", () => openChar(key));
    });
  }
  const nodeR = (c) => 20 + Math.sqrt(Math.max(1, c.posts || 1)) * 0.72;

  /* ==========================================================
     FILMS
     ========================================================== */
  function filmMeta(f) {
    const rows = [
      ["上映", f.date],
      ["票房", f.box],
      ["片长", f.runtime],
      ["导演", f.director],
      ["出品", f.studio],
    ];
    return rows.filter(([, v]) => v && v !== "—").map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join("");
  }
  function renderFilms() {
    const F = D.films || {};
    [["film1", "f1"], ["film2", "f2"]].forEach(([fk, p]) => {
      const f = F[fk];
      if (!f) return;
      const meta = $(`#${p}meta`); if (meta) meta.innerHTML = filmMeta(f);
      const syn = $(`#${p}syn`); if (syn) syn.textContent = f.synopsis || "";
      const q = $(`#${p}quote`); if (q) q.textContent = f.quote ? `「${f.quote}」` : "";
      if (q && !f.quote) q.style.display = "none";
      const ms = $(`#${p}ms`);
      if (ms) ms.innerHTML = (f.milestones || []).map(([d, t]) => `<div class="m"><span class="d">${esc(d)}</span><span class="t">${esc(t)}</span></div>`).join("");
      const st = $(`#${p}strip`);
      if (st) {
        st.innerHTML = (f.stills || [])
          .map((src, i) => `<img src="${src}" alt="${esc(f.title)} 剧照 ${i + 1}" loading="lazy" data-zoom="${src}">`)
          .join("");
      }
      // 演职员
      const info = $(`#${p}meta`);
      if (info && f.cast) {
        const span = document.createElement("span");
        span.innerHTML = `配音 <b>${esc(f.cast)}</b>`;
        info.appendChild(span);
      }
    });

    const dg = $("#designGrid");
    if (dg) {
      dg.innerHTML = (D.designs || [])
        .map(
          ([key, title, date, text, link], i) => `<a class="dcard reveal" href="${link}" target="_blank" rel="noopener" style="--i:${i}">
          <img src="assets/img/${key}.jpg" alt="${esc(title)}" loading="lazy">
          <div><h4>${esc(title)}</h4><p>${esc(text)}</p><span>${esc(date)} · 官方设定稿 →</span></div>
        </a>`
        )
        .join("");
    }
  }

  /* ==========================================================
     EXTRAS + EPISODES
     ========================================================== */
  function renderExtras() {
    const g = $("#extraGrid");
    if (g) {
      g.innerHTML = (D.extras || [])
        .map(
          (e, i) => `<button class="ex reveal" data-link="${esc(e.link || "")}" data-title="${esc(e.title)}" style="--i:${i}">
          <span class="ex__img${e.img ? "" : " ex__img--none"}">${
            e.img
              ? `<img src="${e.img}" alt="${esc(e.title)}" loading="lazy">`
              : `<b>${esc(e.kind)}</b><i>${esc((e.date || "").slice(0, 4))}</i>`
          }</span>
          <span class="ex__body">
            <span class="ex__meta"><span class="ex__kind">${esc(e.kind)}</span>${esc(e.date)}</span>
            <h4>${esc(e.title)}</h4>
            <p>${esc(e.text)}</p>
          </span>
        </button>`
        )
        .join("");
      $$(".ex", g).forEach((b) =>
        b.addEventListener("click", () =>
          openModal(
            `<div class="mc__main" style="padding:34px">
              <p class="mc__role">${esc(b.querySelector(".ex__kind").textContent)} · 番外</p>
              <h3 class="mc__name" style="font-size:30px">${esc(b.dataset.title)}</h3>
              <p class="mc__desc">${esc(b.querySelector("p").textContent)}</p>
              ${b.dataset.link ? `<p style="margin-top:22px"><a class="btn btn--solid" style="padding:11px 20px" href="${esc(b.dataset.link)}" target="_blank" rel="noopener">在微博看原帖 →</a></p>` : ""}
            </div>`
          )
        )
      );
    }

    const eg = $("#epGrid");
    if (eg) {
      eg.innerHTML = (D.episodes || [])
        .map(
          (e, i) => `<button class="ep reveal" data-i="${i}" title="${esc(e.title || "")}" style="--i:${i}">
          <b>${pad2(e.no)}</b><span>${esc(e.title || "—")}</span><em>${esc(e.date)}</em>
        </button>`
        )
        .join("");
      $$(".ep", eg).forEach((b) =>
        b.addEventListener("click", () => {
          const e = D.episodes[+b.dataset.i];
          openModal(
            `<div class="mc__main" style="padding:34px">
              <p class="mc__role">TV · 第 ${e.no} 集</p>
              <h3 class="mc__name" style="font-size:30px">${esc(e.title || "未命名")}</h3>
              <p class="mc__desc">首播 ${esc(e.date)}${e.likes ? ` · 官微 ${e.likes} 赞` : ""}。罗小黑 TV 系列自 2011 年 4 月起不定期更新，这一集是第 ${e.no} 集。</p>
            </div>`
          );
        })
      );
    }
  }

  /* ==========================================================
     COMIC
     ========================================================== */
  let arcNow = "all";
  function renderComic() {
    const C = D.comic || {};
    const facts = $("#comicFacts");
    if (facts) {
      const items = [
        ["139", "话 · 已完结", "2018-09-27 开更，2026-02-28 第 139 话「再会」收官。"],
        ["8", "年连载", "从半月更到月更，跨过《战记 1》与《战记 2》两个电影周期。"],
        ["4", "幕结构", "蓝溪镇 → 君清 → 离别 → 再会。"],
        ["前史", "时间定位", "发生在电影之前很久，主角是老君与被捡回的人类女孩清凝。"],
      ];
      facts.innerHTML = items.map(([n, l, p]) => `<div class="fact"><b>${n}</b><span>${l}</span><p>${p}</p></div>`).join("");
    }
    const arcs = $("#arcs");
    if (arcs) {
      arcs.innerHTML = (C.arcs || [])
        .map(([name, a, b, text]) => `<div class="arc"><h4>${esc(name)}</h4><em>第 ${a} — ${b} 话</em><p>${esc(text)}</p></div>`)
        .join("");
    }
    const tabs = $("#chapTabs");
    if (tabs) {
      tabs.innerHTML =
        `<button class="tab is-on" data-arc="all">全部 139</button>` +
        (C.arcs || []).map(([name, a, b], i) => `<button class="tab" data-arc="${i}">${esc(name.split("·").pop().trim())} ${a}-${b}</button>`).join("");
      $$(".tab", tabs).forEach((t) =>
        t.addEventListener("click", () => {
          $$(".tab", tabs).forEach((x) => x.classList.toggle("is-on", x === t));
          arcNow = t.dataset.arc;
          renderChapters();
        })
      );
    }
    renderChapters();
  }
  function renderChapters() {
    const box = $("#chapGrid");
    if (!box) return;
    const C = D.comic || {};
    let list = C.chapters || [];
    if (arcNow !== "all") {
      const [, a, b] = C.arcs[+arcNow];
      list = list.filter((c) => c.no >= a && c.no <= b);
    }
    box.innerHTML = list
      .map(
        (c) => `<button class="ch" data-no="${c.no}" title="${esc(c.title || "")}">
        <b>第 ${c.no} 话</b>
        <span>${esc(c.title || "—")}</span>
        <em>${esc(c.date)}${c.likes ? " · " + Math.round(c.likes / 1000) + "k" : ""}</em>
      </button>`
      )
      .join("");
    $$(".ch", box).forEach((b) =>
      b.addEventListener("click", () => {
        const c = C.chapters.find((x) => x.no === +b.dataset.no);
        $$(".ch", box).forEach((x) => x.classList.toggle("is-hi", x === b));
        openModal(
          `<div class="mc__main" style="padding:34px">
            <p class="mc__role">漫画 · 蓝溪镇</p>
            <h3 class="mc__name" style="font-size:30px">第 ${c.no} 话${c.title ? ` · ${esc(c.title)}` : ""}</h3>
            <p class="mc__desc">更新于 ${esc(c.date)}${c.likes ? `，官微原帖 ${c.likes} 赞` : ""}。</p>
            <p style="margin-top:22px"><a class="btn btn--solid" style="padding:11px 20px" href="${WBC}${esc(c.mblogid)}" target="_blank" rel="noopener">在微博看这一话 →</a></p>
          </div>`
        );
      })
    );
  }

  /* ==========================================================
     SOLAR TERMS
     ========================================================== */
  function renderSolar() {
    const g = $("#solarGrid");
    if (!g) return;
    g.innerHTML = (D.solar || [])
      .map(
        (s, i) => `<button class="sol reveal" style="--i:${i}" data-zoom="${s.img}"
          data-title="${esc(s.name)}" data-date="${esc(s.date)}" data-note="${esc(s.note)}" data-link="${esc(s.link || "")}">
          <span class="sol__img"><img src="${s.img}" alt="${esc(s.name)}" loading="lazy"></span>
          <span class="sol__body">
            <span class="sol__no">${String(s.no).padStart(2, "0")}</span>
            <span class="sol__name">${esc(s.name)}</span>
            <span class="sol__note">${esc(s.note)}</span>
            <span class="sol__date">${esc(s.date)}</span>
          </span>
        </button>`
      )
      .join("");

    $$(".sol", g).forEach((b) => {
      const img = b.querySelector("img");
      b.addEventListener("click", () => {
        openModal(
          `<div class="mc__main" style="padding:30px">
            <p class="mc__role">二十四节气 · ${esc(b.dataset.date)}</p>
            <h3 class="mc__name" style="font-size:30px">${esc(b.dataset.title)}</h3>
            <p class="mc__desc">${esc(b.dataset.note)}</p>
            <img src="${esc(b.dataset.zoom)}" alt="${esc(b.dataset.title)}" style="width:100%;margin-top:18px;border-radius:6px" data-zoom="${esc(b.dataset.zoom)}">
            ${b.dataset.link ? `<p style="margin-top:16px"><a class="btn btn--solid" style="padding:10px 18px" href="${esc(b.dataset.link)}" target="_blank" rel="noopener">在微博看原图 →</a></p>` : ""}
          </div>`
        );
      });
      if (img) img.addEventListener("error", () => b.classList.add("is-broken"));
    });
  }

  /* ==========================================================
     MODAL / LIGHTBOX
     ========================================================== */
  const modal = $("#modal");
  const modalBody = $("#modalBody");
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  function openModal(html) {
    if (!modal) return;
    modalBody.innerHTML = html;
    modal.classList.add("is-on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeAll() {
    [modal, lightbox].forEach((n) => n && n.classList.remove("is-on"));
    [modal, lightbox].forEach((n) => n && n.setAttribute("aria-hidden", "true"));
    document.body.style.overflow = "";
  }
  function openLightbox(src) {
    if (!lightbox || !src) return;
    lightboxImg.src = src;
    lightbox.classList.add("is-on");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeAll();
    const z = e.target.closest("[data-zoom]");
    if (z) openLightbox(z.dataset.zoom);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  /* ==========================================================
     NAV / REVEAL
     ========================================================== */
  function initNav() {
    const nav = $("#nav");
    const links = $$(".nav__links a");
    const menuBtn = $("#menuBtn");
    const onScroll = () => nav && nav.classList.toggle("is-solid", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    if (menuBtn) {
      menuBtn.addEventListener("click", () => $(".nav__links").classList.toggle("is-open"));
      $$(".nav__links a").forEach((a) => a.addEventListener("click", () => $(".nav__links").classList.remove("is-open")));
    }
    const secs = $$("section[id]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.id;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    secs.forEach((s) => io.observe(s));
  }

  let revealIO;
  function observeReveal(root = document) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", root).forEach((n) => n.classList.add("is-in"));
      return;
    }
    revealIO = revealIO || new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    $$(".reveal", root).forEach((n) => revealIO.observe(n));
  }

  /* ==========================================================
     POWERS / 六大系
     ========================================================== */
  function renderPowers() {
    const host = $("#powGrid");
    if (!host || !D.powers) return;
    const pw = D.powers;
    const byName = {};
    (D.characters || []).forEach((c) => (byName[c.name] = c.key));

    host.innerHTML = (pw.series || [])
      .map((s, i) => {
        const subs = (s.subs || [])
          .map((sub) => {
            const who = (sub.who || [])
              .map((n) =>
                byName[n]
                  ? `<button class="pow__who" type="button" data-char="${byName[n]}">${esc(n)}</button>`
                  : `<span class="pow__who pow__who--off">${esc(n)}</span>`
              )
              .join("");
            return `<li class="pow__sub">
                <span class="pow__sn">${esc(sub.name)}</span>
                <span class="pow__sd">${esc(sub.desc)}</span>
                ${who ? `<span class="pow__whos">${who}</span>` : ""}
              </li>`;
          })
          .join("");
        return `<article class="pow__card" style="--i:${i}">
            <header class="pow__head">
              <span class="pow__no">${String(i + 1).padStart(2, "0")}</span>
              <h3 class="pow__name">${esc(s.name)}</h3>
              <span class="pow__en">${esc(s.en || "")}</span>
              <span class="pow__role">${esc(s.role || "")}</span>
            </header>
            <p class="pow__desc">${esc(s.desc)}</p>
            <ul class="pow__subs">${subs}</ul>
            <p class="pow__count">${(s.subs || []).length} 条附属系</p>
          </article>`;
      })
      .join("");

    const note = $("#powNote");
    if (note) note.textContent = pw.note || "";

    $$(".pow__who[data-char]", host).forEach((b) => {
      b.addEventListener("click", () => openChar(b.dataset.char));
    });
  }

  /* ==========================================================
     ABILITY TABLE / 人物能力表
     ========================================================== */
  function renderAbilities() {
    const body = $("#abBody");
    if (!body || !D.abilities) return;
    const rows = D.abilities;
    const byName = {};
    (D.characters || []).forEach((c) => (byName[c.name] = c.key));

    const seriesList = [];
    rows.forEach((r) => {
      if (r.series && seriesList.indexOf(r.series) < 0) seriesList.push(r.series);
    });
    if (rows.some((r) => r.power === "未公开")) seriesList.push("未公开");

    let cur = "全部";

    function paint() {
      const list =
        cur === "全部"
          ? rows
          : cur === "未公开"
          ? rows.filter((r) => r.power === "未公开")
          : rows.filter((r) => r.series === cur);
      body.innerHTML = list
        .map((r) => {
          const key = byName[r.name];
          const name = key
            ? `<button class="ab__name" type="button" data-char="${key}">${esc(r.name)}</button>`
            : `<span class="ab__name ab__name--raw">${esc(r.name)}</span>`;
          const power =
            r.power === "未公开"
              ? `<span class="ab__none">未公开</span>`
              : r.power
                  .split(" / ")
                  .map((p) => `<span class="ab__p">${esc(p)}</span>`)
                  .join("");
          return `<tr>
              <td>${name}</td>
              <td class="ab__sp">${esc(r.species || "—")}</td>
              <td>${power}</td>
              <td class="ab__src">${esc(r.source || "")}</td>
            </tr>`;
        })
        .join("");

      $$(".ab__name[data-char]", body).forEach((b) => {
        b.addEventListener("click", () => openChar(b.dataset.char));
      });

      const foot = $("#abFoot");
      if (foot) {
        const withPower = rows.filter((r) => r.power !== "未公开").length;
        foot.textContent = `共 ${rows.length} 位；有明确能力 ${withPower} 位，未公开 ${rows.length - withPower} 位。`;
      }
    }

    const filter = $("#abFilter");
    if (filter) {
      filter.innerHTML = ["全部"]
        .concat(seriesList)
        .map(
          (s) =>
            `<button class="chip${s === "全部" ? " is-on" : ""}" type="button" data-ab="${esc(s)}">${esc(s)}</button>`
        )
        .join("");
      $$(".chip", filter).forEach((b) => {
        b.addEventListener("click", () => {
          cur = b.dataset.ab;
          $$(".chip", filter).forEach((x) => x.classList.toggle("is-on", x === b));
          paint();
        });
      });
    }
    paint();
  }

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    renderHero();
    renderWorks();
    renderTimelines();
    renderCharFilter();
    renderChars();
    renderPowers();
    renderAbilities();
    renderNet();
    renderFilms();
    renderExtras();
    renderComic();
    renderSolar();
    initNav();

    // 时间线切换
    const tabs = $("#tlTabs");
    $$(".tab", tabs).forEach((t) =>
      t.addEventListener("click", () => {
        $$(".tab", tabs).forEach((x) => x.classList.toggle("is-on", x === t));
        const mode = t.dataset.mode;
        const tw = $("#tlWork");
        const ts = $("#tlStory");
        // 全部：两条都显示；作品：只显示现实线；剧情：只显示剧情线
        tw.hidden = mode === "story";
        ts.hidden = mode === "work";
        if (mode === "story") ts.scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );

    // 人物筛选
    $("#charFilter").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      $$(".chip", $("#charFilter")).forEach((x) => x.classList.toggle("is-on", x === b));
      groupNow = b.dataset.g;
      renderChars();
    });

    observeReveal();
    document.title = (D.meta && `${D.meta.title} · ${D.meta.sub}`) || document.title;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
