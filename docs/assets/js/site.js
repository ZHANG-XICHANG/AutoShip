/* NewShip showcase — no dependencies, works from file:// and GitHub Pages sub-paths. */
(function () {
  "use strict";

  var root = document.documentElement;
  var redrawers = [];
  function redrawAll() { redrawers.forEach(function (fn) { fn(); }); }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim() || "#000";
  }
  function wrap180(d) { return ((((d + 180) % 360) + 360) % 360) - 180; }

  /* ── theme toggle ───────────────────────────────────── */
  var themeBtn = document.getElementById("theme-btn");
  try {
    var saved = localStorage.getItem("newship-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) { /* storage unavailable: follow the system theme */ }
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function syncThemeBtn() {
    if (!themeBtn) return;
    themeBtn.textContent = isDark() ? "☀" : "☾";
    themeBtn.setAttribute("aria-label", isDark() ? "切換為淺色主題" : "切換為深色主題");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("newship-theme", next); } catch (e) { /* ignore */ }
      syncThemeBtn();
      redrawAll();
    });
  }
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () { syncThemeBtn(); redrawAll(); };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
  }
  syncThemeBtn();

  /* ── current-section highlight ──────────────────────── */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
  if ("IntersectionObserver" in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = byId[en.target.id];
        if (a) {
          a.setAttribute("aria-current", "true");
          if (a.scrollIntoView && window.innerWidth < 760) {
            var nav = a.parentNode;
            nav.scrollLeft = a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2;
          }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ── optional links from site-config.js ─────────────── */
  var cfg = window.SITE_CONFIG || {};
  function show(id) { var el = document.getElementById(id); if (el) el.hidden = false; return el; }
  if (cfg.videoUrl) {
    var box = show("video-block");
    var holder = document.getElementById("video-holder");
    if (holder) {
      var media;
      if (/\.mp4(\?|$)/i.test(cfg.videoUrl)) {
        media = document.createElement("video");
        media.controls = true;
        media.preload = "metadata";
        media.src = cfg.videoUrl;
      } else {
        media = document.createElement("iframe");
        media.src = cfg.videoUrl;
        media.title = "成果影片";
        media.loading = "lazy";
        media.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
        media.setAttribute("allowfullscreen", "");
      }
      media.className = "video-frame";
      holder.appendChild(media);
      // A direct link still works when the owner's settings block the embedded player.
      var ytId = (cfg.videoUrl.match(/(?:embed\/|youtu\.be\/|[?&]v=)([\w-]{11})/) || [])[1];
      var watch = document.createElement("p");
      watch.className = "source";
      watch.style.marginTop = "8px";
      var wa = document.createElement("a");
      wa.href = ytId ? "https://youtu.be/" + ytId : cfg.videoUrl;
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.textContent = ytId ? "在 YouTube 觀看影片 ↗" : "開啟影片檔 ↗";
      watch.appendChild(wa);
      holder.appendChild(watch);
    }
    if (box) document.querySelectorAll("[data-needs='video']").forEach(function (el) { el.hidden = false; });
  }
  [["reportUrl", "link-report"], ["codeUrl", "link-code"]].forEach(function (pair) {
    if (!cfg[pair[0]]) return;
    var li = show(pair[1]);
    var a = li && li.querySelector("a");
    if (a) a.href = cfg[pair[0]];
  });
  if (cfg.email) {
    var mail = show("contact-email");
    var ma = mail && mail.querySelector("a");
    if (ma) { ma.href = "mailto:" + cfg.email; ma.textContent = cfg.email; }
  }

  /* ── canvas helper ──────────────────────────────────── */
  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function observeResize(el, fn) {
    if ("ResizeObserver" in window) new ResizeObserver(fn).observe(el);
    else window.addEventListener("resize", fn);
  }
  function niceStep(range) {
    var steps = [5, 10, 20, 25, 50, 100];
    for (var i = 0; i < steps.length; i++) if (range / steps[i] <= 8) return steps[i];
    return 200;
  }

  /* ── sea-trial replay ───────────────────────────────── */
  var trials = window.SEA_TRIALS;
  var viewer = document.getElementById("trial-viewer");
  if (viewer && trials && trials.length) initTrials();

  function initTrials() {
    var tabs = Array.prototype.slice.call(viewer.querySelectorAll(".tab"));
    var trackCanvas = document.getElementById("track-canvas");
    var headingCanvas = document.getElementById("heading-canvas");
    var pwmCanvas = document.getElementById("pwm-canvas");
    var slider = document.getElementById("trial-slider");
    var playBtn = document.getElementById("trial-play");
    var out = {
      t: document.getElementById("ro-t"), wp: document.getElementById("ro-wp"),
      hdg: document.getElementById("ro-hdg"), tgt: document.getElementById("ro-tgt"),
      err: document.getElementById("ro-err"), pwm: document.getElementById("ro-pwm"),
    };
    var caption = document.getElementById("trial-caption");
    var state = { run: 0, i: 0, playing: false, timer: null };

    function run() { return trials[state.run]; }

    function selectRun(k) {
      state.run = k;
      state.i = 0;
      stop();
      tabs.forEach(function (t, j) {
        t.setAttribute("aria-selected", j === k ? "true" : "false");
        t.tabIndex = j === k ? 0 : -1;
      });
      slider.max = String(run().series.length - 1);
      slider.value = "0";
      var m = run().metrics;
      if (caption) {
        caption.textContent = run().name + "航線：" + m.waypoints + " 個航點、" + m.duration_s +
          " 秒、實際航程 " + m.track_len_m + " m。拖曳滑桿或點選下方圖表可回放任一時刻。";
      }
      draw();
    }

    function setIndex(i) {
      var n = run().series.length;
      state.i = Math.max(0, Math.min(n - 1, i));
      slider.value = String(state.i);
      draw();
    }

    function stop() {
      state.playing = false;
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      playBtn.textContent = "▶ 播放";
      playBtn.setAttribute("aria-pressed", "false");
    }
    function play() {
      if (state.i >= run().series.length - 1) state.i = 0;
      state.playing = true;
      playBtn.textContent = "❚❚ 暫停";
      playBtn.setAttribute("aria-pressed", "true");
      state.timer = setInterval(function () {
        if (state.i >= run().series.length - 1) { stop(); return; }
        setIndex(state.i + 1);
      }, 40);
    }

    tabs.forEach(function (t, j) {
      t.addEventListener("click", function () { selectRun(j); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var k = (j + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[k].focus();
        selectRun(k);
      });
    });
    slider.addEventListener("input", function () { stop(); setIndex(parseInt(slider.value, 10)); });
    playBtn.addEventListener("click", function () { if (state.playing) stop(); else play(); });

    function bindScrub(canvas) {
      function at(e) {
        var r = canvas.getBoundingClientRect();
        var pad = 36;
        var frac = (e.clientX - r.left - pad) / Math.max(1, r.width - pad - 10);
        var s = run().series, dur = s[s.length - 1][0];
        var target = Math.max(0, Math.min(1, frac)) * dur;
        var lo = 0, hi = s.length - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (s[mid][0] < target) lo = mid + 1; else hi = mid; }
        stop();
        setIndex(lo);
      }
      var down = false;
      canvas.addEventListener("pointerdown", function (e) { down = true; canvas.setPointerCapture(e.pointerId); at(e); });
      canvas.addEventListener("pointermove", function (e) { if (down) at(e); });
      canvas.addEventListener("pointerup", function () { down = false; });
      canvas.addEventListener("pointercancel", function () { down = false; });
    }
    bindScrub(headingCanvas);
    bindScrub(pwmCanvas);

    function drawTrack() {
      var c = fitCanvas(trackCanvas);
      if (!c) return;
      var ctx = c.ctx, w = c.w, h = c.h, r = run();
      var pts = r.series.map(function (s) { return [s[1], s[2]]; }).concat(r.planned);
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(function (p) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      });
      var pad = 34;
      var sc = Math.min((w - 2 * pad) / Math.max(1, maxX - minX), (h - 2 * pad) / Math.max(1, maxY - minY));
      var ox = (w - (maxX - minX) * sc) / 2, oy = (h - (maxY - minY) * sc) / 2;
      function X(x) { return ox + (x - minX) * sc; }
      function Y(y) { return h - (oy + (y - minY) * sc); }

      var rule = cssVar("--rule"), soft = cssVar("--soft"), ink = cssVar("--ink");
      var muted = cssVar("--muted"), link = cssVar("--link"), accent = cssVar("--accent");

      // grid in metres
      var step = niceStep(Math.max(maxX - minX, maxY - minY));
      ctx.strokeStyle = rule; ctx.lineWidth = 1;
      ctx.fillStyle = soft; ctx.font = "10px " + cssVar("--font-mono");
      for (var gx = Math.ceil(minX / step) * step; gx <= maxX; gx += step) {
        ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), h); ctx.stroke();
      }
      for (var gy = Math.ceil(minY / step) * step; gy <= maxY; gy += step) {
        ctx.beginPath(); ctx.moveTo(0, Y(gy)); ctx.lineTo(w, Y(gy)); ctx.stroke();
      }
      // scale bar + north arrow
      ctx.strokeStyle = muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, h - 14); ctx.lineTo(12 + step * sc, h - 14); ctx.stroke();
      ctx.fillStyle = muted; ctx.fillText(step + " m", 12, h - 20);
      ctx.beginPath(); ctx.moveTo(w - 18, 30); ctx.lineTo(w - 18, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 23, 17); ctx.lineTo(w - 18, 10); ctx.lineTo(w - 13, 17); ctx.stroke();
      ctx.fillText("N", w - 22, 44);

      // planned path
      ctx.setLineDash([6, 4]); ctx.strokeStyle = muted; ctx.lineWidth = 1.5;
      ctx.beginPath();
      r.planned.forEach(function (p, k) { if (k) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
      ctx.stroke(); ctx.setLineDash([]);

      // actual track: full (faint) then travelled (solid)
      ctx.lineWidth = 2; ctx.globalAlpha = 0.28; ctx.strokeStyle = link;
      ctx.beginPath();
      r.series.forEach(function (s, k) { if (k) ctx.lineTo(X(s[1]), Y(s[2])); else ctx.moveTo(X(s[1]), Y(s[2])); });
      ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath();
      for (var k = 0; k <= state.i; k++) {
        var s = r.series[k];
        if (k) ctx.lineTo(X(s[1]), Y(s[2])); else ctx.moveTo(X(s[1]), Y(s[2]));
      }
      ctx.stroke();

      // waypoints (planned[0] is the start fix)
      var cur = r.series[state.i];
      r.planned.forEach(function (p, k) {
        var active = k === cur[7] + 1;
        ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), active ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = k === 0 ? ink : (active ? accent : muted); ctx.fill();
        if (k > 0) {
          ctx.fillStyle = active ? accent : soft;
          ctx.fillText("W" + k, X(p[0]) + 6, Y(p[1]) - 6);
        }
      });

      // boat, rotated by heading (north-up, clockwise)
      var bx = X(cur[1]), by = Y(cur[2]), a = cur[3] * Math.PI / 180;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
      ctx.fillStyle = accent; ctx.fill();
      ctx.restore();
      // target heading ray
      var ta = cur[4] * Math.PI / 180;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.sin(ta) * 36, by - Math.cos(ta) * 36); ctx.stroke();
      ctx.setLineDash([]);
    }

    function timeAxis(ctx, w, h, dur, padL, padR, padT, padB) {
      return {
        x: function (t) { return padL + (t / dur) * (w - padL - padR); },
        plotH: h - padT - padB,
      };
    }

    function drawHeading() {
      var c = fitCanvas(headingCanvas);
      if (!c) return;
      var ctx = c.ctx, w = c.w, h = c.h, s = run().series, dur = s[s.length - 1][0];
      var padL = 36, padR = 10, padT = 8, padB = 20;
      var ax = timeAxis(ctx, w, h, dur, padL, padR, padT, padB);
      function Y(d) { return padT + (1 - (d + 180) / 360) * ax.plotH; }
      ctx.font = "10px " + cssVar("--font-mono");
      ctx.strokeStyle = cssVar("--rule"); ctx.fillStyle = cssVar("--soft"); ctx.lineWidth = 1;
      [-180, -90, 0, 90, 180].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(padL, Y(d)); ctx.lineTo(w - padR, Y(d)); ctx.stroke();
        ctx.fillText(d + "°", 2, Y(d) + 3);
      });
      var tick = dur > 300 ? 60 : 30;
      for (var t = 0; t <= dur; t += tick) ctx.fillText(t + "s", ax.x(t) - 8, h - 4);
      function line(idx, color, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash || []);
        ctx.beginPath();
        for (var k = 0; k < s.length; k++) {
          var v = s[k][idx];
          if (k && Math.abs(v - s[k - 1][idx]) > 180) ctx.moveTo(ax.x(s[k][0]), Y(v));
          else if (k) ctx.lineTo(ax.x(s[k][0]), Y(v));
          else ctx.moveTo(ax.x(s[k][0]), Y(v));
        }
        ctx.stroke(); ctx.setLineDash([]);
      }
      line(4, cssVar("--muted"), [5, 3]);
      line(3, cssVar("--link"));
      cursor(ctx, ax.x(s[state.i][0]), padT, h - padB);
    }

    function drawPwm() {
      var c = fitCanvas(pwmCanvas);
      if (!c) return;
      var ctx = c.ctx, w = c.w, h = c.h, s = run().series, dur = s[s.length - 1][0];
      var padL = 36, padR = 10, padT = 8, padB = 20;
      var ax = timeAxis(ctx, w, h, dur, padL, padR, padT, padB);
      function Y(v) { return padT + (1 - (v - 1450) / 600) * ax.plotH; }
      ctx.font = "10px " + cssVar("--font-mono");
      ctx.strokeStyle = cssVar("--rule"); ctx.fillStyle = cssVar("--soft"); ctx.lineWidth = 1;
      [1500, 1750, 2000].forEach(function (v) {
        ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(w - padR, Y(v)); ctx.stroke();
        ctx.fillText(String(v), 2, Y(v) + 3);
      });
      var tick = dur > 300 ? 60 : 30;
      for (var t = 0; t <= dur; t += tick) ctx.fillText(t + "s", ax.x(t) - 8, h - 4);
      function step(idx, color) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var k = 0; k < s.length; k++) {
          var x = ax.x(s[k][0]), y = Y(s[k][idx]);
          if (k) { ctx.lineTo(x, Y(s[k - 1][idx])); ctx.lineTo(x, y); } else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      step(5, cssVar("--link"));
      step(6, cssVar("--sage"));
      cursor(ctx, ax.x(s[state.i][0]), padT, h - padB);
    }

    function cursor(ctx, x, top, bottom) {
      ctx.strokeStyle = cssVar("--accent"); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    }

    function drawReadout() {
      var r = run(), s = r.series[state.i];
      out.t.textContent = s[0].toFixed(1) + " s";
      out.wp.textContent = "W" + (s[7] + 1) + " / " + r.metrics.waypoints;
      out.hdg.textContent = s[3].toFixed(1) + "°";
      out.tgt.textContent = s[4].toFixed(1) + "°";
      out.err.textContent = (wrap180(s[4] - s[3]) >= 0 ? "+" : "") + wrap180(s[4] - s[3]).toFixed(1) + "°";
      out.pwm.textContent = s[5] + " / " + s[6];
    }

    function draw() { drawTrack(); drawHeading(); drawPwm(); drawReadout(); }
    redrawers.push(draw);
    observeResize(trackCanvas, drawTrack);
    observeResize(headingCanvas, drawHeading);
    observeResize(pwmCanvas, drawPwm);
    selectRun(0);
  }

  /* ── LOS look-ahead demo (same rule as AutoShip/navigation.py) ── */
  var losCanvas = document.getElementById("los-canvas");
  if (losCanvas) initLos();

  function initLos() {
    var slider = document.getElementById("los-look");
    var lookOut = document.getElementById("los-look-out");
    var text = document.getElementById("los-readout");
    var A = [0, 0], B = [40, 12];          // previous waypoint → current waypoint (m)
    var boat = [12, -6];
    var view = { minX: -6, maxX: 50, minY: -16, maxY: 22 };
    var geo = null;

    function compute() {
      var look = parseFloat(slider.value);
      var dx = B[0] - A[0], dy = B[1] - A[1];
      var segLen = Math.hypot(dx, dy);
      var t = ((boat[0] - A[0]) * dx + (boat[1] - A[1]) * dy) / (segLen * segLen);
      var la = Math.min(look, segLen * 0.5);
      var tLook = Math.min(Math.max(t, 0) + la / segLen, 1);
      var aim = [A[0] + tLook * dx, A[1] + tLook * dy];
      var foot = [A[0] + Math.max(0, Math.min(1, t)) * dx, A[1] + Math.max(0, Math.min(1, t)) * dy];
      var bearing = function (p, q) { return (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI + 360) % 360; };
      return {
        look: look, la: la, aim: aim, foot: foot,
        xte: Math.hypot(boat[0] - foot[0], boat[1] - foot[1]),
        psiLos: bearing(boat, aim), psiDirect: bearing(boat, B),
      };
    }

    function draw() {
      var c = fitCanvas(losCanvas);
      if (!c) return;
      var ctx = c.ctx, w = c.w, h = c.h;
      var sc = Math.min(w / (view.maxX - view.minX), h / (view.maxY - view.minY));
      var ox = (w - (view.maxX - view.minX) * sc) / 2, oy = (h - (view.maxY - view.minY) * sc) / 2;
      function X(x) { return ox + (x - view.minX) * sc; }
      function Y(y) { return h - (oy + (y - view.minY) * sc); }
      geo = { sc: sc, ox: ox, oy: oy, h: h };
      var r = compute();
      var ink = cssVar("--ink"), muted = cssVar("--muted"), accent = cssVar("--accent"), soft = cssVar("--soft");
      ctx.font = "12px " + cssVar("--font-sans");

      ctx.strokeStyle = cssVar("--rule"); ctx.lineWidth = 1;
      for (var gx = -5; gx <= 50; gx += 5) { ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), h); ctx.stroke(); }
      for (var gy = -15; gy <= 20; gy += 5) { ctx.beginPath(); ctx.moveTo(0, Y(gy)); ctx.lineTo(w, Y(gy)); ctx.stroke(); }

      // planned segment
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(A[0]), Y(A[1])); ctx.lineTo(X(B[0]), Y(B[1])); ctx.stroke();
      // look-ahead span along the segment
      ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(X(r.foot[0]), Y(r.foot[1])); ctx.lineTo(X(r.aim[0]), Y(r.aim[1])); ctx.stroke();
      ctx.globalAlpha = 1;
      // cross-track
      ctx.setLineDash([3, 3]); ctx.strokeStyle = muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(boat[0]), Y(boat[1])); ctx.lineTo(X(r.foot[0]), Y(r.foot[1])); ctx.stroke();
      // direct-to-waypoint comparison
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(X(boat[0]), Y(boat[1])); ctx.lineTo(X(B[0]), Y(B[1])); ctx.stroke();
      ctx.setLineDash([]);
      // LOS aim line
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(boat[0]), Y(boat[1])); ctx.lineTo(X(r.aim[0]), Y(r.aim[1])); ctx.stroke();

      [[A, "前一航點"], [B, "目前航點"]].forEach(function (p) {
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(p[0][0]), Y(p[0][1]), 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = soft; ctx.fillText(p[1], X(p[0][0]) - 20, Y(p[0][1]) + 20);
      });
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(X(r.aim[0]), Y(r.aim[1]), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillText("瞄準點", X(r.aim[0]) + 8, Y(r.aim[1]) - 8);
      ctx.fillStyle = muted; ctx.beginPath(); ctx.arc(X(r.foot[0]), Y(r.foot[1]), 3, 0, Math.PI * 2); ctx.fill();

      // boat pointing at the LOS heading
      var a = r.psiLos * Math.PI / 180;
      ctx.save(); ctx.translate(X(boat[0]), Y(boat[1])); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(8, 9); ctx.lineTo(0, 5); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fillStyle = accent; ctx.fill();
      ctx.restore();
      ctx.fillStyle = soft; ctx.fillText("拖曳船位", X(boat[0]) + 12, Y(boat[1]) + 18);

      lookOut.textContent = r.look.toFixed(0) + " m";
      text.textContent =
        "有效前視距離 L = min(" + r.look.toFixed(0) + ", 航段長/2) = " + r.la.toFixed(1) + " m\n" +
        "橫向偏差 e = " + r.xte.toFixed(1) + " m\n" +
        "LOS 期望航向 ψd = " + r.psiLos.toFixed(1) + "°\n" +
        "若直接指向航點 = " + r.psiDirect.toFixed(1) + "°";
    }

    function toWorld(e) {
      var rect = losCanvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      return [
        Math.max(view.minX, Math.min(view.maxX, (px - geo.ox) / geo.sc + view.minX)),
        Math.max(view.minY, Math.min(view.maxY, (geo.h - py - geo.oy) / geo.sc + view.minY)),
      ];
    }
    var dragging = false;
    losCanvas.addEventListener("pointerdown", function (e) {
      dragging = true; losCanvas.setPointerCapture(e.pointerId); boat = toWorld(e); draw();
    });
    losCanvas.addEventListener("pointermove", function (e) { if (dragging) { boat = toWorld(e); draw(); } });
    losCanvas.addEventListener("pointerup", function () { dragging = false; });
    losCanvas.addEventListener("pointercancel", function () { dragging = false; });
    losCanvas.addEventListener("keydown", function (e) {
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!d) return;
      e.preventDefault();
      boat = [boat[0] + d[0], boat[1] + d[1]];
      draw();
    });
    slider.addEventListener("input", draw);
    redrawers.push(draw);
    observeResize(losCanvas, draw);
    draw();
  }
})();
