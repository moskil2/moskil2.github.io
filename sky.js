// Animated starry-sky background shared by all spotrobotics.app pages.
// Each page needs <canvas id="sky"> with the #sky CSS and a transparent body.
(function () {
  var canvas = document.getElementById('sky');
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var w, h, dpr, stars, band;
  // 3 parallax layers: far (many, dim, slow) to near (few, bright, faster)
  var layers = [
    { density: 0.00045, size: [0.5, 1.2], alpha: [0.25, 0.55], speed: 0.6 },
    { density: 0.00018, size: [0.9, 1.7], alpha: [0.4, 0.8], speed: 1.2 },
    { density: 0.00005, size: [1.4, 2.4], alpha: [0.6, 1.0], speed: 2.0, glow: true }
  ];

  function rand(a, b) { return a + Math.random() * (b - a); }

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
    layers.forEach(function (L) {
      var n = Math.round(w * h * L.density);
      for (var i = 0; i < n; i++) {
        var warm = Math.random();
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          v: L.speed,
          glow: !!L.glow,
          tw: Math.random() < 0.25 ? rand(0.5, 1.6) : 0,
          ph: Math.random() * Math.PI * 2,
          c: warm < 0.05 ? '200,215,255' : warm < 0.15 ? '255,205,140' : warm < 0.45 ? '255,228,160' : '255,246,225'
        });
      }
    });
    buildBand();
  }

  function draw(time) {
    var t = time / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(band, 0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // Very slow drift to the left (px per second), wrapping around
      var x = still ? s.x : ((s.x - t * s.v) % w + w) % w;
      var a = s.tw && !still ? s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph)) : s.a;
      if (s.glow) {
        // Soft halo around the nearest, brightest stars
        ctx.fillStyle = 'rgba(' + s.c + ',' + (a * 0.12) + ')';
        ctx.beginPath();
        ctx.arc(x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + s.c + ',' + a + ')';
      ctx.beginPath();
      ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
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
