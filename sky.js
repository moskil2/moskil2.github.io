// Animated starry-sky background shared by all spotrobotics.app pages.
// Each page needs <canvas id="sky"> with the #sky CSS and a transparent body.
(function () {
  var canvas = document.getElementById('sky');
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, dpr, stars, band, meteor = null, nextMeteor = 0;
  // 3 parallax layers: far (many, dim, slow) to near (few, bright, faster)
  var layers = [
    // glow: halo radius (x star radius) and halo strength
    { density: 0.00045, size: [0.5, 1.2], alpha: [0.25, 0.55], speed: 1.8 },
    { density: 0.00018, size: [0.9, 1.7], alpha: [0.4, 0.8], speed: 3.6, glow: { r: 4, a: 0.35 } },
    { density: 0.00005, size: [1.4, 2.4], alpha: [0.6, 1.0], speed: 6.0, glow: { r: 5.5, a: 0.55 }, cross: true }
  ];

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Soft round halo, pre-rendered once per star colour and stamped with drawImage
  var halos = {};
  function halo(c) {
    if (halos[c]) return halos[c];
    var s = document.createElement('canvas');
    s.width = s.height = 64;
    var g2 = s.getContext('2d');
    var g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(' + c + ',1)');
    g.addColorStop(0.25, 'rgba(' + c + ',0.4)');
    g.addColorStop(0.6, 'rgba(' + c + ',0.08)');
    g.addColorStop(1, 'rgba(' + c + ',0)');
    g2.fillStyle = g;
    g2.fillRect(0, 0, 64, 64);
    return (halos[c] = s);
  }

  // Faint Milky Way band, pre-rendered once into an offscreen canvas
  function buildBand() {
    band = document.createElement('canvas');
    band.width = w * dpr;
    band.height = h * dpr;
    var b = band.getContext('2d');
    b.scale(dpr, dpr);
    var x0 = -w * 0.1, y0 = h * 0.85, x1 = w * 1.1, y1 = h * 0.15;
    for (var i = 0; i < 90; i++) {
      var t = Math.random();
      var x = x0 + (x1 - x0) * t + rand(-60, 60);
      var y = y0 + (y1 - y0) * t + rand(-60, 60);
      var r = rand(80, 220);
      var g = b.createRadialGradient(x, y, 0, x, y, r);
      var hue = Math.random() < 0.7 ? '255,215,160' : '255,190,150';
      g.addColorStop(0, 'rgba(' + hue + ',0.018)');
      g.addColorStop(1, 'rgba(' + hue + ',0)');
      b.fillStyle = g;
      b.beginPath();
      b.arc(x, y, r, 0, Math.PI * 2);
      b.fill();
    }
    // Dense dust of tiny stars along the band
    for (var j = 0; j < 500; j++) {
      var s = Math.random();
      var off = (Math.random() + Math.random() + Math.random() - 1.5) * 110;
      b.fillStyle = 'rgba(255,238,210,' + rand(0.08, 0.35) + ')';
      b.fillRect(x0 + (x1 - x0) * s + off * 0.5, y0 + (y1 - y0) * s + off, 0.7, 0.7);
    }
  }

  function init() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    layers.forEach(function (L, li) {
      var n = Math.round(w * h * L.density);
      for (var i = 0; i < n; i++) {
        var warm = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          v: L.speed,
          glow: L.glow || null,
          L: li,
          gf: rand(0.3, 0.9),
          tw: Math.random() < 0.25 ? rand(0.5, 1.6) : 0,
          ph: Math.random() * Math.PI * 2,
          c: warm < 0.05 ? '200,215,255' : warm < 0.15 ? '255,205,140' : warm < 0.45 ? '255,228,160' : '255,246,225'
        });
        var st = stars[stars.length - 1];
        if (L.cross && Math.random() < 0.3) {
          // Cross glint with its own slow shimmer, so glints flare up and fade independently
          st.cross = { f: rand(0.4, 1.1), ph: rand(0, 6.28), len: rand(5, 8) };
        }
      }
    });
    buildBand();
    buildHalos();
  }

  // Halos of the steady (non-twinkling) stars, drawn once per layer into a half-resolution
  // canvas that just slides along with its layer - the halos are soft, so half resolution
  // looks the same and costs far less than stamping hundreds of halos every frame.
  function buildHalos() {
    layers.forEach(function (L) {
      L.haloCanvas = null;
      if (!L.glow) return;
      var hc = document.createElement('canvas');
      hc.width = Math.ceil(w / 2);
      hc.height = Math.ceil(h / 2);
      var g = hc.getContext('2d');
      g.scale(0.5, 0.5);
      L.haloCanvas = hc;
    });
    stars.forEach(function (s) {
      if (!s.glow || s.tw) return;
      var hc = layers[s.L].haloCanvas, g = hc.getContext('2d');
      var R = s.r * s.glow.r;
      g.globalAlpha = s.a * s.glow.a * 0.85;
      // Halos near an edge are drawn on both sides so the slide wraps seamlessly
      for (var k = -1; k <= 1; k++) {
        var x = s.x + k * w;
        if (x + R < 0 || x - R > w) continue;
        g.drawImage(halo(s.c), x - R, s.y - R, R * 2, R * 2);
      }
      s.baked = true;
    });
  }

  function drawCross(x, y, s, a, t) {
    var k = still ? 0.7 : 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * s.cross.f + s.cross.ph), 2);
    var len = s.r * s.cross.len * (0.6 + 0.4 * k);
    ctx.lineWidth = 0.7;
    for (var q = 0; q < 2; q++) {
      var g = q === 0 ? ctx.createLinearGradient(x - len, y, x + len, y) : ctx.createLinearGradient(x, y - len, x, y + len);
      g.addColorStop(0, 'rgba(' + s.c + ',0)');
      g.addColorStop(0.5, 'rgba(' + s.c + ',' + (a * 0.75 * k) + ')');
      g.addColorStop(1, 'rgba(' + s.c + ',0)');
      ctx.strokeStyle = g;
      ctx.beginPath();
      if (q === 0) { ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); }
      else { ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); }
      ctx.stroke();
    }
  }

  // Shooting star: mostly downward, either side, fades in and out over its short life
  function spawnMeteor(t) {
    var ang = rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2;
    meteor = {
      x: rand(0.1, 0.9) * w, y: rand(0.02, 0.45) * h, vx: Math.cos(ang), vy: Math.sin(ang),
      sp: rand(500, 900), len: rand(90, 170), t0: t, life: rand(0.55, 0.95)
    };
  }

  function drawMeteor(t) {
    var m = meteor, p = (t - m.t0) / m.life;
    if (p >= 1) { meteor = null; return; }
    var d = (t - m.t0) * m.sp, hx = m.x + m.vx * d, hy = m.y + m.vy * d;
    var L = Math.min(m.len, d), tx = hx - m.vx * L, ty = hy - m.vy * L;
    var g = ctx.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, 'rgba(255,246,225,0)');
    g.addColorStop(1, 'rgba(255,248,232,' + (0.85 * Math.sin(Math.PI * p)) + ')');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }

  function draw(time) {
    var t = time / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(band, 0, 0, w, h);
    for (var j = 0; j < layers.length; j++) {
      var hc = layers[j].haloCanvas;
      if (!hc) continue;
      var off = still ? 0 : (t * layers[j].speed) % w;
      ctx.drawImage(hc, -off, 0, w, h);
      ctx.drawImage(hc, w - off, 0, w, h);
    }
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // Slow drift to the left (px per second), wrapping around
      var x = still ? s.x : ((s.x - t * s.v) % w + w) % w;
      var a = s.tw && !still ? s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph)) : s.a;
      if (s.glow && !s.baked) {
        // Twinkling stars keep a live halo, gently breathing on its own rhythm
        var R = s.r * s.glow.r;
        ctx.globalAlpha = a * s.glow.a * (still ? 0.85 : 0.7 + 0.3 * Math.sin(t * s.gf + s.ph * 2));
        ctx.drawImage(halo(s.c), x - R, s.y - R, R * 2, R * 2);
        ctx.globalAlpha = 1;
      }
      if (s.cross) drawCross(x, s.y, s, a, t);
      ctx.fillStyle = 'rgba(' + s.c + ',' + a + ')';
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!still) {
      if (!nextMeteor) nextMeteor = t + rand(4, 10);
      if (!meteor && t > nextMeteor) { spawnMeteor(t); nextMeteor = t + rand(10, 30); }
      if (meteor) drawMeteor(t);
    }
  }

  function loop(time) {
    draw(time);
    requestAnimationFrame(loop);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    // Mobile address bar show/hide only changes the height - keep the same sky
    if (window.innerWidth === w) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { init(); if (still) draw(0); }, 150);
  });

  init();
  if (still) draw(0); else requestAnimationFrame(loop);
})();
