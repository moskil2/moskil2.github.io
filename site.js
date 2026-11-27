// Shared spotrobotics.app script: background music with a speaker button and a
// volume slider, and page-to-page navigation without full reloads so the music keeps playing.
(function () {
  if (window.srSite) return;
  window.srSite = {};

  // ---------- Speaker button and volume slider styles ----------
  var style = document.createElement('style');
  style.id = 'sr-site-style';
  style.textContent = [
    '.sound-ctl { position: fixed; top: 1rem; right: 1rem; width: 40px; height: 40px; z-index: 50; }',
    '.sound-btn { position: relative; z-index: 2; width: 40px; height: 40px; border-radius: 50%;',
    '  border: 1px solid rgba(255,228,160,0.25); background: rgba(10,11,16,0.6); color: rgba(255,228,160,0.85);',
    '  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;',
    '  transition: border-color .15s ease, background .15s ease; }',
    '.sound-btn:hover { border-color: rgba(255,228,160,0.6); background: rgba(255,228,160,0.08); }',
    '.sound-btn svg { width: 20px; height: 20px; }',
    '.sound-btn .on { display: none; }',
    '.sound-btn.playing .on { display: inline; }',
    '.sound-btn.playing .off { display: none; }',
    /* The slider pill slides out to the left from behind the button */
    '.sound-vol { position: absolute; top: 0; right: 20px; z-index: 1; height: 40px; width: 0; box-sizing: border-box;',
    '  display: flex; align-items: center; overflow: hidden; opacity: 0; pointer-events: none;',
    '  padding: 0 28px 0 14px; border-radius: 20px 0 0 20px; background: rgba(10,11,16,0.88);',
    '  border: 1px solid rgba(255,228,160,0.25); border-right: none;',
    '  transition: width .2s ease, opacity .2s ease; }',
    '.sound-ctl.open .sound-vol { width: 160px; opacity: 1; pointer-events: auto; }',
    '@media (hover: hover) { .sound-ctl:hover .sound-vol, .sound-ctl:focus-within .sound-vol { width: 160px; opacity: 1; pointer-events: auto; } }',
    '.sound-vol input { width: 100%; margin: 0; accent-color: #ffe4a0; cursor: pointer; }',
    /* App pages: keep the top bar links clear of the speaker button */
    '@media (max-width: 1260px) { .topbar { padding-right: 64px !important; } }',

    /* Main buttons: lift a little on hover while a band of light sweeps across.
       "html" in front keeps these rules above page styles that load later on in-place navigation. */
    'html .btn-primary, html .btn-github { position: relative; overflow: hidden; isolation: isolate;',
    '  transition: background .15s ease, transform .2s cubic-bezier(.2,.8,.2,1), filter .2s ease; }',
    'html .btn-primary::after, html .btn-github::after { content: ""; position: absolute; top: -20%; bottom: -20%; left: -40%; width: 34%;',
    '  transform: skewX(-22deg) translateX(-150%); pointer-events: none; z-index: -1;',
    '  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); }',
    '@media (hover: hover) {',
    '  html .btn-primary:hover, html .btn-github:hover { transform: translateY(-2px); filter: brightness(1.06); }',
    '  html .btn-primary:hover::after, html .btn-github:hover::after { animation: sr-sheen .9s ease-out; } }',
    'html .btn-primary:active, html .btn-github:active { transform: translateY(1px); }',
    /* Shading laid over each page's own button colour: light top band, darker bottom, edge highlight */
    'html .btn-primary, html .btn-github { background-image: linear-gradient(to bottom, rgba(255,255,255,.30) 0%, rgba(255,255,255,.10) 12%,',
    '  rgba(255,255,255,0) 48%, rgba(0,0,0,.20) 100%); }',
    'html .btn-primary::before, html .btn-github::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;',
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 0 rgba(0,0,0,.16); }',
    'html .btn-primary { text-shadow: 0 1px 0 rgba(0,0,0,.28); }',
    'html .btn-github { text-shadow: 0 1px 0 rgba(255,244,204,.5); }',
    /* Form Send buttons (support page): the same lift + sweeping light, no shading; disabled ones stay still */
    'html button[type="submit"]:not(:disabled) { position: relative; overflow: hidden; isolation: isolate;',
    '  transition: background .15s ease, transform .2s cubic-bezier(.2,.8,.2,1), filter .2s ease; }',
    'html button[type="submit"]:not(:disabled)::after { content: ""; position: absolute; top: -20%; bottom: -20%; left: -40%; width: 34%;',
    '  transform: skewX(-22deg) translateX(-150%); pointer-events: none; z-index: -1;',
    '  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); }',
    '@media (hover: hover) { html button[type="submit"]:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.06); }',
    '  html button[type="submit"]:not(:disabled):hover::after { animation: sr-sheen .9s ease-out; } }',
    'html button[type="submit"]:not(:disabled):active { transform: translateY(1px); }',
    '@media (prefers-reduced-motion: reduce) { html button[type="submit"]:not(:disabled)::after { display: none; } html button[type="submit"]:not(:disabled):hover { transform: none; } }',
    '@keyframes sr-sheen { from { transform: skewX(-22deg) translateX(-150%); } to { transform: skewX(-22deg) translateX(560%); } }',
    '@media (prefers-reduced-motion: reduce) { html .btn-primary::after, html .btn-github::after { display: none; }',
    '  html .btn-primary:hover, html .btn-github:hover { transform: none; } }',

    /* Mini drone that follows the mouse (made by the script below, mouse only) */
    '.sr-drone { position: fixed; left: 0; top: 0; z-index: 90; width: 0; height: 0; pointer-events: none; opacity: 0;',
    '  transition: opacity .4s; will-change: transform; --c: 0,240,255; }',
    '.sr-drone.on { opacity: 1; }',
    '.sr-drone .d-in { position: absolute; left: 0; top: 0; }',
    '.sr-drone.glitch .d-in { animation: sr-glitch .26s steps(2) 1; }',
    '.sr-drone .d-glow { position: absolute; left: -36px; top: -36px; width: 72px; height: 72px; border-radius: 50%; mix-blend-mode: screen;',
    '  background: radial-gradient(circle, rgba(var(--c),.38), rgba(var(--c),.1) 45%, transparent 70%); animation: sr-breathe 1.8s ease-in-out infinite; }',
    '.sr-drone .d-jet { position: absolute; left: -5px; top: 4px; width: 10px; height: 12px; border-radius: 50%;',
    '  background: radial-gradient(ellipse at 50% 20%, rgba(var(--c),.9), rgba(var(--c),.25) 45%, transparent 75%); animation: sr-jet .12s ease-in-out infinite alternate; }',
    '.sr-drone svg { position: absolute; left: -24px; top: -16px; overflow: visible; filter: drop-shadow(0 0 3px rgba(var(--c),.9)); }',
    '.sr-drone .d-line { fill: none; stroke: rgb(var(--c)); stroke-width: 1.4; stroke-linecap: round; }',
    '.sr-drone .d-body { fill: #0b1018; stroke: rgb(var(--c)); stroke-width: 1.3; stroke-linejoin: round; }',
    '.sr-drone .d-visor { fill: rgba(var(--c),.18); stroke: rgba(var(--c),.7); stroke-width: .8; }',
    '.sr-drone .d-eye { fill: #fff; filter: drop-shadow(0 0 2px rgb(var(--c))); animation: sr-scan 4.2s ease-in-out infinite; }',
    '.sr-drone .d-disc { fill: rgba(var(--c),.16); stroke: rgba(var(--c),.45); stroke-width: .6; }',
    '.sr-drone .d-blade { fill: rgba(var(--c),.95); transform-box: fill-box; transform-origin: center; animation: sr-spin .09s linear infinite; }',
    '.sr-drone .d-blade.b2 { animation-delay: -.045s; }',
    '.sr-drone .d-tip { fill: rgb(var(--c)); animation: sr-blink 1.3s steps(1) infinite; }',
    '@keyframes sr-breathe { 50% { transform: scale(1.18); opacity: .7; } }',
    '@keyframes sr-jet { from { opacity: .55; transform: scaleY(.8); } to { opacity: 1; transform: scaleY(1.15); } }',
    '@keyframes sr-spin { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.12); } }',
    '@keyframes sr-scan { 0%, 38% { transform: translateX(0); } 48% { transform: translateX(-3.2px); } 62% { transform: translateX(3.2px); } 72%, 100% { transform: translateX(0); } }',
    '@keyframes sr-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: .2; } }',
    '@keyframes sr-glitch { 0% { transform: translate(2px,-1px); opacity: .6; } 50% { transform: translate(-2px,1px); } 100% { transform: none; opacity: 1; } }',
    '.sr-drone-trail { position: fixed; inset: 0; z-index: 89; pointer-events: none; overflow: hidden; }',
    '.sr-drone-trail i { position: absolute; background: rgb(var(--c)); box-shadow: 0 0 6px 1px rgba(var(--c),.8);',
    '  animation: sr-px var(--t) steps(7) forwards; }',
    '@keyframes sr-px { from { opacity: .95; transform: translate(0,0) scale(1); } to { opacity: 0; transform: translate(var(--dx),var(--dy)) scale(.3); } }',
    /* Target brackets around what the drone has locked on to */
    '.sr-lock { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 89; pointer-events: none; opacity: 0; transition: opacity .18s; }',
    '.sr-lock.on { opacity: 1; }',
    '.sr-lock-in { position: absolute; inset: 0; }',
    '.sr-lock.snap .sr-lock-in { animation: sr-snap .3s cubic-bezier(.2,.8,.2,1); }',
    /* Each corner: two 2px arms, full colour at the corner, fading out to the arm end */
    '.sr-lock i { position: absolute; width: 12px; height: 12px; --lc: rgb(255,90,230);',
    '  filter: blur(.6px) drop-shadow(0 0 2px rgba(255,43,214,1)) drop-shadow(0 0 6px rgba(220,60,255,.9)) drop-shadow(0 0 14px rgba(170,70,255,.7)); }',
    /* Faint violet glow around the whole locked-on target */
    '.sr-lock-in::before { content: ""; position: absolute; inset: 6px; border-radius: 16px;',
    '  box-shadow: 0 0 18px 3px rgba(255,43,214,.22), 0 0 46px 10px rgba(170,70,255,.16); }',
    /* Soft light the drone casts around itself: over the sky, under the page content */
    '.sr-drone-light { position: fixed; left: 0; top: 0; width: 520px; height: 520px; z-index: -1; pointer-events: none;',
    '  opacity: 0; transition: opacity .6s; will-change: transform; }',
    '.sr-drone-light.on { opacity: 1; }',
    '.sr-drone-light i { position: absolute; inset: 0; border-radius: 50%; transition: opacity .35s; }',
    '.sr-drone-light .l1 { background: radial-gradient(circle, rgba(0,240,255,.16), rgba(0,200,255,.06) 38%, transparent 70%); }',
    '.sr-drone-light .l2 { opacity: 0; background: radial-gradient(circle, rgba(255,43,214,.17), rgba(170,70,255,.07) 38%, transparent 70%); }',
    '.sr-drone-light.hot .l1 { opacity: 0; }',
    '.sr-drone-light.hot .l2 { opacity: 1; }',
    '.sr-lock .tl { left: 0; top: 0; background: linear-gradient(to right, var(--lc), transparent) left top / 100% 2px no-repeat, linear-gradient(to bottom, var(--lc), transparent) left top / 2px 100% no-repeat; }',
    '.sr-lock .tr { right: 0; top: 0; background: linear-gradient(to left, var(--lc), transparent) right top / 100% 2px no-repeat, linear-gradient(to bottom, var(--lc), transparent) right top / 2px 100% no-repeat; }',
    '.sr-lock .bl { left: 0; bottom: 0; background: linear-gradient(to right, var(--lc), transparent) left bottom / 100% 2px no-repeat, linear-gradient(to top, var(--lc), transparent) left bottom / 2px 100% no-repeat; }',
    '.sr-lock .br { right: 0; bottom: 0; background: linear-gradient(to left, var(--lc), transparent) right bottom / 100% 2px no-repeat, linear-gradient(to top, var(--lc), transparent) right bottom / 2px 100% no-repeat; }',
    '@keyframes sr-snap { from { transform: scale(1.25); opacity: 0; } to { transform: none; opacity: 1; } }',
    /* White dot cursor with a tapering light tail (replaces the arrow while a mouse is in use) */
    'html.sr-cursor, html.sr-cursor * { cursor: none !important; }',
    '.sr-cursor-tail { position: fixed; left: 0; top: 0; z-index: 91; pointer-events: none; }',
    '.sr-cursor-dot { position: fixed; left: 0; top: 0; z-index: 92; pointer-events: none; opacity: 0; transition: opacity .3s; will-change: transform; }',
    '.sr-cursor-dot.on { opacity: 1; }',
    '.sr-cursor-dot i { position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #fff;',
    '  box-shadow: 0 0 10px 2px rgba(255,255,255,.85); transition: left .3s, top .3s, width .3s, height .3s, background-color .3s, box-shadow .3s; }',
    /* Over a zoomable photo the dot turns into a glowing plus (the arrow's zoom-in cursor is hidden) */
    '.sr-cursor-dot::before, .sr-cursor-dot::after { content: ""; position: absolute; left: -7px; top: -1px; width: 14px; height: 2px; border-radius: 1px; background: #fff;',
    '  box-shadow: 0 0 8px 1px rgba(255,255,255,.85); transform: scale(0); opacity: 0; transition: transform .3s, opacity .3s; }',
    '.sr-cursor-dot::after { transform: rotate(90deg) scale(0); }',
    '.sr-cursor-dot.zoom::before { transform: scale(1); opacity: 1; }',
    '.sr-cursor-dot.zoom::after { transform: rotate(90deg) scale(1); opacity: 1; }',
    '.sr-cursor-dot.zoom i { left: 0; top: 0; width: 0; height: 0; box-shadow: 0 0 0 0 rgba(255,255,255,0); }',
    /* App pages: the top link bar stays at the top of the window, on a full-width dark strip
       with a scroll progress line in the drone's cyan (idea from triforceproject.com, own code) */
    'html .topbar { position: sticky; top: 0; z-index: 40; padding-top: 7px; padding-bottom: 7px; }',
    '.sr-topbar-bg { position: fixed; left: 0; right: 0; top: 0; height: 0; z-index: 39; pointer-events: none; display: none;',
    '  background: linear-gradient(to bottom, rgba(10,11,16,.78), rgba(10,11,16,.58)); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);',
    '  border-bottom: 1px solid rgba(255,255,255,.06); }',
    '.sr-topbar-bg.on { display: block; }',
    '.sr-topbar-bg .p { position: absolute; left: 0; bottom: -1px; height: 2px; width: calc(var(--p, 0) * 100%);',
    '  background: linear-gradient(90deg, rgba(0,240,255,.35), rgb(0,240,255) 60%, #a8fbff); box-shadow: 0 0 14px rgba(0,240,255,.5); }',
    '.sr-topbar-bg .p::after { content: ""; position: absolute; right: -4px; top: -2.5px; width: 7px; height: 7px; background: #e0feff; transform: rotate(45deg);',
    '  box-shadow: 0 0 12px 3px rgba(0,240,255,.75); opacity: calc(var(--p, 0) * 40); }',
    /* No rubber-band bounce past the end of the page on mouse/touchpad computers: in
       Firefox the bounce made the fixed star sky vanish or flicker. Phones keep their
       own overscroll (pull to refresh). */
    '@media (hover: hover) and (pointer: fine) { html { overscroll-behavior: none; } }'
  ].join('\n');
  document.head.appendChild(style);

  // ---------- Background music ----------
  // Browsers block autoplay, so it starts on the first click/tap/key anywhere.
  // The speaker button toggles it; "off" and the volume are remembered per browser.
  // Mouse: hovering the button shows the volume slider. Touch: the first tap on the
  // button opens the slider, a tap while it is open mutes; it hides after 4 s.
  var audio = document.createElement('audio');
  audio.id = 'bg-music';
  audio.src = '/Music/podklad.mp3';
  audio.loop = true;
  audio.preload = 'none';

  var ctl = document.createElement('div');
  ctl.id = 'sound-ctl';
  ctl.className = 'sound-ctl';
  ctl.innerHTML =
    '<button class="sound-btn" id="sound-btn" type="button">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/>' +
    '<path class="on" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' +
    '<path class="off" d="m16 9 6 6M22 9l-6 6"/>' +
    '</svg></button>' +
    '<div class="sound-vol"><input type="range" id="sound-vol" min="0" max="100" step="1" aria-label="Music volume"></div>';
  document.body.appendChild(audio);
  document.body.appendChild(ctl);
  var btn = document.getElementById('sound-btn');
  var slider = document.getElementById('sound-vol');

  var FADE_IN = 2, FADE_OUT = 0.4, CLOSE_AFTER = 4000;
  var DEFAULT_LEVEL = 63; // 0.63^2 = 0.4, the original fixed volume
  var KEY = 'sr-sound', VOL_KEY = 'sr-volume';
  var ctx, gain, playing = false, pauseTimer, closeTimer, lastPointer = 'mouse';

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function getPref() { return load(KEY); }
  function setPref(v) { store(KEY, v); }

  var level = parseInt(load(VOL_KEY), 10);
  if (isNaN(level) || level < 0 || level > 100) level = DEFAULT_LEVEL;
  slider.value = level;
  // Squared curve so the middle of the slider sounds like half volume
  function target() { return Math.pow(level / 100, 2); }

  function setUi(on) {
    playing = on;
    btn.classList.toggle('playing', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Mute background music' : 'Play background music');
  }
  setUi(false);

  // Web Audio gain works on iOS too, where audio.volume is read-only.
  // Skipped on file:// previews, where a media element source would be silent.
  function setupGain() {
    if (ctx || location.protocol === 'file:') return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    } catch (e) { ctx = null; gain = null; }
  }

  var rampId = 0;
  function ramp(to, secs) {
    if (gain) {
      var now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(to, now + secs);
    } else {
      var id = ++rampId, from = audio.volume, start = performance.now();
      (function step(t) {
        if (id !== rampId) return;
        var k = Math.min((t - start) / (secs * 1000), 1);
        audio.volume = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(step);
      })(start);
    }
  }

  function play() {
    clearTimeout(pauseTimer);
    setupGain();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (!gain) audio.volume = 0;
    var p = audio.play();
    // Rejected (e.g. a touchend that ended a scroll): wait for the next interaction
    if (p && p.catch) p.catch(function () { setUi(false); if (getPref() !== 'off') addFirst(); });
    setUi(true);
    ramp(target(), FADE_IN);
  }

  function stop() {
    setUi(false);
    ramp(0, FADE_OUT);
    pauseTimer = setTimeout(function () { audio.pause(); }, FADE_OUT * 1000);
  }

  var events = ['click', 'touchend', 'keydown'];
  function firstInteraction(e) {
    if (ctl.contains(e.target)) return;
    removeFirst();
    if (getPref() !== 'off') play();
  }
  function addFirst() {
    events.forEach(function (ev) { document.addEventListener(ev, firstInteraction, true); });
  }
  function removeFirst() {
    events.forEach(function (ev) { document.removeEventListener(ev, firstInteraction, true); });
  }
  addFirst();

  function openSlider() {
    ctl.classList.add('open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeSlider, CLOSE_AFTER);
  }
  function closeSlider() {
    clearTimeout(closeTimer);
    ctl.classList.remove('open');
  }

  btn.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
  btn.addEventListener('click', function () {
    removeFirst();
    var touch = lastPointer === 'touch' || lastPointer === 'pen';
    lastPointer = 'mouse';
    if (touch && !ctl.classList.contains('open')) {
      openSlider();
      if (!playing) { play(); setPref('on'); }
      return;
    }
    if (playing) { stop(); setPref('off'); }
    else { play(); setPref('on'); }
    if (touch) openSlider();
  });

  slider.addEventListener('input', function () {
    level = parseInt(slider.value, 10);
    store(VOL_KEY, String(level));
    if (ctl.classList.contains('open')) openSlider(); // keep it open while adjusting
    if (playing) ramp(target(), 0.08);
    else if (getPref() !== 'off') { removeFirst(); play(); }
  });

  // A tap anywhere else closes the slider
  document.addEventListener('pointerdown', function (e) {
    if (ctl.classList.contains('open') && !ctl.contains(e.target)) closeSlider();
  }, true);

  // Read-only hook for automated checks
  window.srSite.volume = function () { return gain ? gain.gain.value : audio.volume; };

  // ---------- Mini drone that follows the mouse ----------
  // A small cyberpunk flying robot: two spinning rotors, a scanning eye, a neon glow.
  // It trails the pointer on a spring, flies a figure-eight patrol when the mouse rests,
  // locks on to what can be clicked (turns magenta, target brackets) and sheds pixels as it flies.
  // Mouse only, and off when the visitor asked for reduced motion.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) (function () {
    var CYAN = '0,240,255', MAGENTA = '255,43,214';
    var PRESS = 'a[href], button, summary, label, select, input, textarea, [role="button"]';
    var rotor = function (x, k) {
      return '<g transform="translate(' + x + ' -7)"><ellipse class="d-disc" rx="8" ry="1.9"/>' +
        '<rect class="d-blade' + k + '" x="-8" y="-.65" width="16" height="1.3" rx=".65"/></g>';
    };
    var drone = document.createElement('div');
    drone.id = 'sr-drone';
    drone.className = 'sr-drone';
    drone.setAttribute('aria-hidden', 'true');
    drone.innerHTML = '<div class="d-in"><i class="d-glow"></i><i class="d-jet"></i>' +
      '<svg viewBox="-24 -16 48 32" width="48" height="32">' +
      '<path class="d-line" d="M2 -5 L5 -11.5"/><circle class="d-tip" cx="5.4" cy="-12.6" r="1.4"/>' +
      '<path class="d-line" d="M-6 -2 L-14 -6.5 M6 -2 L14 -6.5"/>' +
      rotor(-14, '') + rotor(14, ' b2') +
      '<path class="d-body" d="M-7 -4.5 L7 -4.5 L9.5 0 L6 5 L-6 5 L-9.5 0 Z"/>' +
      '<rect class="d-visor" x="-6" y="-1.7" width="12" height="3.4" rx="1.7"/><circle class="d-eye" cx="0" cy="0" r="1.3"/>' +
      '</svg></div>';
    var trail = document.createElement('div');
    trail.id = 'sr-drone-trail';
    trail.className = 'sr-drone-trail';
    trail.setAttribute('aria-hidden', 'true');
    var lock = document.createElement('div');
    lock.id = 'sr-lock';
    lock.className = 'sr-lock';
    lock.setAttribute('aria-hidden', 'true');
    lock.innerHTML = '<div class="sr-lock-in"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>';
    var light = document.createElement('div');
    light.id = 'sr-drone-light';
    light.className = 'sr-drone-light';
    light.setAttribute('aria-hidden', 'true');
    light.innerHTML = '<i class="l1"></i><i class="l2"></i>';
    document.body.appendChild(light);
    document.body.appendChild(trail);
    document.body.appendChild(lock);
    document.body.appendChild(drone);

    // White dot cursor + tail: the dot eases after the mouse, the tail is drawn on a
    // see-through canvas from the dot's positions of the last TAIL_MS, widest at the dot.
    var TAIL_MS = 150;
    var tail = document.createElement('canvas');
    tail.id = 'sr-cursor-tail';
    tail.className = 'sr-cursor-tail';
    tail.setAttribute('aria-hidden', 'true');
    var dot = document.createElement('div');
    dot.id = 'sr-cursor-dot';
    dot.className = 'sr-cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = '<i></i>';
    document.body.appendChild(tail);
    document.body.appendChild(dot);
    var tctx = tail.getContext('2d');
    var dpr = 1, cx = 0, cy = 0, pts = [];
    function sizeTail() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      tail.width = Math.round(window.innerWidth * dpr);
      tail.height = Math.round(window.innerHeight * dpr);
      tail.style.width = window.innerWidth + 'px';
      tail.style.height = window.innerHeight + 'px';
    }
    sizeTail();
    window.addEventListener('resize', sizeTail);

    function drawTail(t) {
      var lastPt = pts[pts.length - 1];
      if (!lastPt || Math.abs(cx - lastPt.x) + Math.abs(cy - lastPt.y) >= 1.5) pts.push({ x: cx, y: cy, t: t });
      while (pts.length && t - pts[0].t > TAIL_MS) pts.shift();
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var n = pts.length;
      if (n < 3) return;
      var left = [], right = [];
      for (var i = 0; i < n; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n - 1, i + 1)];
        var dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var fresh = Math.max(0, Math.min(1, 1 - (t - pts[i].t) / TAIL_MS));
        var half = (1.5 + 7.5 * fresh) / 2;          // 9 px wide at the dot, 1.5 px at the end
        left.push(pts[i].x - dy / len * half, pts[i].y + dx / len * half);
        right.push(pts[i].x + dy / len * half, pts[i].y - dx / len * half);
      }
      var g = tctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, '#fff');
      tctx.beginPath();
      tctx.moveTo(left[0], left[1]);
      for (i = 1; i < n; i++) tctx.lineTo(left[i * 2], left[i * 2 + 1]);
      for (i = n - 1; i >= 0; i--) tctx.lineTo(right[i * 2], right[i * 2 + 1]);
      tctx.closePath();
      tctx.fillStyle = g;
      tctx.shadowColor = '#fff';
      tctx.shadowBlur = 10;
      tctx.fill();
      tctx.shadowBlur = 0;
    }

    var px = 0, py = 0, x = 0, y = 0, vx = 0, vy = 0, on = false, running = false, last = 0;
    var movedAt = 0, pixelAt = 0, alive = 0, hot = null, glitchTimer;

    function pixel(sx, sy, burst) {
      if (alive >= 40) return;
      var s = document.createElement('i');
      var d = 2 + Math.random() * 2.5, a = Math.random() * Math.PI * 2;
      var r = burst ? 16 + Math.random() * 26 : 2 + Math.random() * 6;
      var dy = Math.sin(a) * r + (burst ? 0 : 10 + Math.random() * 14);
      s.style.cssText = 'left:' + sx.toFixed(1) + 'px;top:' + sy.toFixed(1) + 'px;width:' + d.toFixed(1) + 'px;height:' + d.toFixed(1) +
        'px;--dx:' + (Math.cos(a) * r).toFixed(1) + 'px;--dy:' + dy.toFixed(1) + 'px;--t:' + (0.45 + Math.random() * 0.5).toFixed(2) +
        's;--c:' + (hot ? MAGENTA : CYAN);
      alive++;
      s.addEventListener('animationend', function () { s.remove(); alive--; });
      trail.appendChild(s);
    }

    function aim(h) {
      if (h === hot) return;
      var wasHot = !!hot;
      hot = h;
      if (!!h !== wasHot) {
        drone.style.setProperty('--c', h ? MAGENTA : CYAN);
        light.classList.toggle('hot', !!h);
        drone.classList.remove('glitch');
        void drone.offsetWidth;
        drone.classList.add('glitch');
        clearTimeout(glitchTimer);
        glitchTimer = setTimeout(function () { drone.classList.remove('glitch'); }, 300);
      }
      lock.classList.remove('on', 'snap');
      if (h) { void lock.offsetWidth; lock.classList.add('snap'); }
    }

    function placeLock(r) {
      var pad = 6;
      if (r.width > window.innerWidth * 0.9 || r.width < 1) { lock.classList.remove('on'); return; }
      lock.style.left = (r.left - pad) + 'px';
      lock.style.top = (r.top - pad) + 'px';
      lock.style.width = (r.width + pad * 2) + 'px';
      lock.style.height = (r.height + pad * 2) + 'px';
      lock.classList.add('on');
    }

    function step(t) {
      if (!on) { running = false; return; }
      var dt = last ? Math.min(0.034, (t - last) / 1000) : 0.016;
      last = t;
      var a = t * 0.0019, gx, gy;
      // dot: closes 60% of the gap per 60 fps frame (frame-rate independent);
      // 28% until 2026-11-26 made the dot lag behind the mouse and clicks hard to aim (owner)
      var k = 1 - Math.pow(0.40, dt * 60);
      cx += (px - cx) * k;
      cy += (py - cy) * k;
      dot.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      drawTail(t);
      if (hot && !hot.isConnected) aim(null);
      if (hot) {
        var r = hot.getBoundingClientRect();
        placeLock(r);
        if (r.height <= 90) {
          // Small target: hover 40 px above it (below it when it sits at the top of the window);
          // 16 px until 2026-11-25 made the drone cover the target (owner)
          gx = Math.max(r.left + 8, Math.min(r.right - 8, cx)) + Math.cos(a * 1.7) * 10;
          gy = (r.top < 68 ? r.bottom + 40 : r.top - 40) + Math.sin(a * 3.4) * 3;
        } else {
          gx = cx + 72 + Math.cos(a * 1.3) * 4;
          gy = cy - 78 + Math.sin(a * 2.3) * 4;
        }
      } else if (t - movedAt > 1000) {
        // Mouse resting: figure-eight patrol around the dot (owner 2026-11-25: 38/14/13 at first, now +/-150 px)
        gx = cx + Math.cos(a) * 150;
        gy = cy - 54 + Math.sin(a * 2) * 52;
      } else {
        // In flight: behind the dot's shoulder, about 105 px away, bobbing a little (24/26 until 2026-11-25)
        gx = cx + 72 + Math.cos(a * 1.3) * 4;
        gy = cy - 78 + Math.sin(a * 2.3) * 4;
      }
      // Spring: stiffness 55, damping 10 (was 95/13 - about 30% slower chase, same slight bounce)
      vx += ((gx - x) * 55 - vx * 10) * dt;
      vy += ((gy - y) * 55 - vy * 10) * dt;
      x += vx * dt;
      y += vy * dt;
      var tilt = Math.max(-20, Math.min(20, vx * 0.03));
      drone.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + tilt.toFixed(1) + 'deg)';
      light.style.transform = 'translate3d(' + (x - 260).toFixed(1) + 'px,' + (y - 260).toFixed(1) + 'px,0)';
      if (Math.sqrt(vx * vx + vy * vy) > 140 && t - pixelAt > 40) {
        pixelAt = t;
        pixel(x + (Math.random() - 0.5) * 6, y + 6 + Math.random() * 4, false);
      }
      requestAnimationFrame(step);
    }

    // Plus instead of the dot while over a photo that opens enlarged (img.zoomable)
    function zoomOver(el) {
      dot.classList.toggle('zoom', !!(el && el.closest && el.closest('img.zoomable')));
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      movedAt = performance.now();
      aim(e.target && e.target.closest ? e.target.closest(PRESS) : null);
      zoomOver(e.target);
      if (!on) {
        // Flies in from up and to the left
        on = true;
        x = px - 90; y = py - 70; vx = vy = 0; last = 0;
        cx = px; cy = py; pts.length = 0;
        drone.classList.add('on');
        light.classList.add('on');
        dot.classList.add('on');
        document.documentElement.classList.add('sr-cursor');
      }
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });

    window.addEventListener('scroll', function () {
      if (!on) return;
      var u = document.elementFromPoint(px, py);
      aim(u && u.closest ? u.closest(PRESS) : null);
      zoomOver(u);
    }, { passive: true });

    window.addEventListener('pointerdown', function (e) {
      if (!on || (e.pointerType && e.pointerType !== 'mouse')) return;
      for (var i = 0; i < 10; i++) pixel(x, y, true);
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function () {
      on = false;
      drone.classList.remove('on');
      light.classList.remove('on');
      dot.classList.remove('on', 'zoom');
      document.documentElement.classList.remove('sr-cursor');
      pts.length = 0;
      tctx.clearRect(0, 0, tail.width, tail.height);
      aim(null);
    });
  })();

  // ---------- Top bar strip + scroll progress (app pages with .topbar) ----------
  // One fixed strip behind the sticky .topbar (fixed, so it never widens the page);
  // its line grows with how far the page is scrolled: 0 at the top, 100% at the bottom.
  var srTopbar = (function () {
    var bg = document.createElement('div');
    bg.id = 'sr-topbar-bg';
    bg.className = 'sr-topbar-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<i class="p"></i>';
    document.body.appendChild(bg);
    var queued = false;
    function update() {
      queued = false;
      var bar = document.querySelector('.topbar');
      bg.classList.toggle('on', !!bar);
      if (!bar) return;
      bg.style.height = bar.offsetHeight + 'px';
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bg.style.setProperty('--p', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : 0);
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    update();
    return queue;
  })();

  // ---------- Navigation without reloads ----------
  // Internal links fetch the next page and swap its head and body content in place.
  // The sky canvas, the music player and the speaker controls stay untouched.
  // Any failure falls back to a normal page load.
  if (!window.fetch || !window.DOMParser || !history.pushState || location.protocol === 'file:') return;

  var KEEP_IDS = { sky: 1, 'bg-music': 1, 'sound-ctl': 1, 'sr-site-style': 1, 'sr-drone': 1, 'sr-drone-trail': 1, 'sr-lock': 1, 'sr-drone-light': 1, 'sr-cursor-tail': 1, 'sr-cursor-dot': 1, 'sr-topbar-bg': 1 };
  var loadedScripts = {};
  [].forEach.call(document.scripts, function (s) { if (s.src) loadedScripts[s.src] = 1; });
  var navToken = 0;
  var currentPage = location.pathname + location.search;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  history.replaceState({ sr: 1, scroll: window.scrollY }, '');

  function isPageUrl(url) {
    if (url.origin !== location.origin) return false;
    var last = url.pathname.split('/').pop();
    return last === '' || /\.html?$/i.test(last);
  }

  function keepInHead(el) {
    if (el.id && KEEP_IDS[el.id]) return true;
    if (el.tagName === 'META' && (el.hasAttribute('charset') || el.getAttribute('name') === 'viewport')) return true;
    if (el.tagName === 'LINK' && /icon/i.test(el.getAttribute('rel') || '')) return true;
    return false;
  }

  function swapHead(newHead) {
    var wanted = [].filter.call(newHead.children, function (el) { return !keepInHead(el); });
    var wantedHtml = wanted.map(function (el) { return el.outerHTML; });
    // Drop old page elements the new page does not have (identical ones, e.g. fonts, stay)
    [].slice.call(document.head.children).forEach(function (el) {
      if (!keepInHead(el) && wantedHtml.indexOf(el.outerHTML) === -1) el.remove();
    });
    var current = [].map.call(document.head.children, function (el) { return el.outerHTML; });
    wanted.forEach(function (el) {
      if (current.indexOf(el.outerHTML) === -1) document.head.appendChild(document.importNode(el, true));
    });
    document.title = newHead.ownerDocument.title;
  }

  function runScript(old) {
    var s = document.createElement('script');
    [].forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
    s.textContent = old.textContent;
    old.replaceWith(s);
  }

  function swapBody(newBody) {
    [].slice.call(document.body.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && (KEEP_IDS[n.id] || (n.tagName === 'SCRIPT' && n.src && loadedScripts[n.src]))) return;
      n.remove();
    });
    var anchor = document.getElementById('bg-music');
    [].slice.call(newBody.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && KEEP_IDS[n.id]) return;
      var node = document.importNode(n, true);
      if (node.nodeType === 1 && node.tagName === 'SCRIPT' && node.src && loadedScripts[node.src]) return;
      document.body.insertBefore(node, anchor);
    });
    // Imported scripts do not run on their own - recreate them in document order
    [].slice.call(document.body.querySelectorAll('script')).forEach(function (s) {
      var type = s.getAttribute('type');
      if (type && type !== 'text/javascript' && type !== 'module') return;
      if (s.src) {
        if (loadedScripts[s.src]) return;
        loadedScripts[s.src] = 1;
      }
      runScript(s);
    });
  }

  function scrollToTarget(url, saved) {
    if (typeof saved === 'number') { window.scrollTo(0, saved); return; }
    var target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  function navigate(url, push, savedScroll) {
    var token = ++navToken;
    return fetch(url.href, { credentials: 'same-origin' }).then(function (res) {
      var type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('text/html') === -1) throw new Error('not a page');
      return res.text();
    }).then(function (html) {
      if (token !== navToken) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      if (push) {
        history.replaceState({ sr: 1, scroll: window.scrollY }, '');
        history.pushState({ sr: 1, scroll: 0 }, '', url.href);
      }
      // URL changes before the swap so relative image paths resolve against the new page
      currentPage = url.pathname + url.search;
      swapHead(doc.head);
      swapBody(doc.body);
      scrollToTarget(url, savedScroll);
      srTopbar();
    }).catch(function () {
      if (token === navToken) location.href = url.href;
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    var target = a.getAttribute('target');
    if (target && target !== '_self') return;
    var url = new URL(a.href, location.href);
    if (!isPageUrl(url)) return;
    // Same page, only the #hash differs: let the browser jump there
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    e.preventDefault();
    navigate(url, true);
  });

  window.addEventListener('popstate', function (e) {
    var url = new URL(location.href);
    var saved = e.state && e.state.sr ? e.state.scroll : undefined;
    // Back/forward between #hash positions of the same page: nothing to load
    if (url.pathname + url.search === currentPage) {
      if (typeof saved === 'number') window.scrollTo(0, saved);
      return;
    }
    navigate(url, false, saved);
  });

  // Remember where the reader was, so Back returns to the same spot
  var scrollTimer;
  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      if (history.state && history.state.sr) history.replaceState({ sr: 1, scroll: window.scrollY }, '');
    }, 150);
  }, { passive: true });
})();
