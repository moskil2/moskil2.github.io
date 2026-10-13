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
    '@media (max-width: 1260px) { .topbar { padding-right: 64px !important; } }'
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

  // ---------- Navigation without reloads ----------
  // Internal links fetch the next page and swap its head and body content in place.
  // The sky canvas, the music player and the speaker controls stay untouched.
  // Any failure falls back to a normal page load.
  if (!window.fetch || !window.DOMParser || !history.pushState || location.protocol === 'file:') return;

  var KEEP_IDS = { sky: 1, 'bg-music': 1, 'sound-ctl': 1, 'sr-site-style': 1 };
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
