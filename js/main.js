(function(d) {
    var config = {
      kitId: 'jiu1ifb',
      scriptTimeout: 3000,
      async: true
    },
    h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
})(document);


function wbPrefersReducedMotion(){
  try{
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }catch(e){
    return false;
  }
}
function wbScrollBehavior(){
  return wbPrefersReducedMotion() ? 'auto' : 'smooth';
}



/* =========================
   Theme system (data-theme)
   ========================= */
(function(){
  const STORAGE_KEY = 'wb-theme';
  const root = document.documentElement;

  function getQueryTheme(){
    try{
      const u = new URL(window.location.href);
      const t = (u.searchParams.get('theme') || '').trim();
      return t || null;
    }catch(e){
      return null;
    }
  }

  function getPreferredTheme(){
    try{
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }catch(e){
      return 'dark';
    }
  }

  function applyTheme(theme){
    const t = theme === 'light' ? 'light' : 'dark';
    root.dataset.theme = t;

    // Back-compat for existing CSS selectors
    if (document.body){
      document.body.classList.toggle('dark-theme', t === 'dark');
      document.body.classList.toggle('light-theme', t === 'light');
    }

    try{ localStorage.setItem(STORAGE_KEY, t); }catch(e){}

    // Let canvases / components refresh
    window.dispatchEvent(new CustomEvent('wb:themechange', { detail: { theme: t }}));
  }

  function initTheme(){
    const queryTheme = getQueryTheme();
    if (queryTheme){
      applyTheme(queryTheme);
      return;
    }
    let saved = null;
    try{ saved = localStorage.getItem(STORAGE_KEY); }catch(e){}
    if (saved === 'dark' || saved === 'light'){
      applyTheme(saved);
    }else{
      applyTheme(getPreferredTheme());
    }
  }

  // public API
  window.WBTheme = {
    get: () => root.dataset.theme || 'dark',
    set: (t) => applyTheme(t),
    toggle: () => applyTheme((root.dataset.theme === 'light') ? 'dark' : 'light')
  };

  // Hook UI if present
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const btns = Array.from(document.querySelectorAll('[data-theme-toggle]'));
    if (btns.length){
      const syncLabel = () => {
        const t = window.WBTheme.get();
        const isDark = (t === 'dark');
        for (const btn of btns){
          btn.setAttribute('aria-checked', isDark ? 'true' : 'false');
          btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
          btn.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        }
      };
      syncLabel();
      for (const btn of btns){
        btn.addEventListener('click', () => { window.WBTheme.toggle(); });
      }
      window.addEventListener('wb:themechange', syncLabel);
    }
  });
})();


function wbCssVar(name, fallback){
  try{
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    if (v && v.trim()) return v.trim();
  }catch(e){}
  return fallback;
}



(function(){
  const opening = document.querySelector('.opening');
  const canvas = document.getElementById('opening-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const content = document.querySelector('.container') || document.body;
  let running = true;
  let rafId = 0;

  const prefersReducedMotion = wbPrefersReducedMotion();
  const hideOpening = (immediate=false) => {
    content.classList.add('is-show');
    document.documentElement.classList.add('is-opening-skipped');

    running = false;
    if (rafId) cancelAnimationFrame(rafId);

    opening.classList.add('is-hide');
    opening.style.display = 'none';
  };

  if(opening){
    opening.addEventListener('click', () => hideOpening(true), { once: true });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideOpening(true);
  });


  if(!opening || !canvas || !ctx){
    if(opening) opening.classList.add('is-hide');
    return;
  }


  if(prefersReducedMotion){
    hideOpening(true);
    return;
  }

  const TEXT = "WaffBell";
  const FONT_FAMILY = (getComputedStyle(document.documentElement).getPropertyValue('--wb-font') || '').trim() || "system-ui, -apple-system";
  const FONT_WEIGHT = 800;

  const FORM_DURATION = 900;          // gather duration per letter
  const MAX_STAGGER_SPREAD = 1200;    // max total spread for start delays
  const HOLD_TIME = 1000;            // hold after all letters are completed
  const AFTER_DISPERSE_WAIT = 0;      // no extra wait after particles are offscreen
  const OPENING_FADE = 700;           // overlay fade out (faster)
  const CONTENT_FADE = 900;           // content fade in (faster)

  const SAMPLE_STEP = 3;             // lower = denser (costly)
  const MAX_POINTS_PER_LETTER = 2400;

  const DISPERSE_SPEED_MIN = 6.5;
  const DISPERSE_SPEED_MAX = 14.0;

  function resize(){
    canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
    canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function sampleLetter(char, fontSize, x, y){
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    const pad = 18;
    off.width = Math.ceil(fontSize + pad*2);
    off.height = Math.ceil(fontSize*1.6 + pad*2);
    octx.clearRect(0,0,off.width,off.height);
    octx.fillStyle = '#fff';
    octx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;
    octx.textBaseline = 'alphabetic';
    octx.fillText(char, pad, pad + fontSize);

    const img = octx.getImageData(0,0,off.width,off.height).data;
    const pts=[];
    for(let yy=0; yy<off.height; yy+=SAMPLE_STEP){
      for(let xx=0; xx<off.width; xx+=SAMPLE_STEP){
        const a = img[(yy*off.width+xx)*4+3];
        if(a>40){
          pts.push([x + (xx-pad), y + (yy - (pad + fontSize))]);
        }
      }
    }
    if(pts.length > MAX_POINTS_PER_LETTER){
      const ratio = MAX_POINTS_PER_LETTER / pts.length;
      const keep=[];
      for(let i=0;i<pts.length;i++){
        if(Math.random() < ratio) keep.push(pts[i]);
      }
      return keep;
    }
    return pts;
  }

  function buildLetters(){
    const w = window.innerWidth;
    const fontSize = Math.max(72, Math.min(140, Math.floor(w*0.12)));
    ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;
    const metrics = ctx.measureText(TEXT);
    const startX = (w - metrics.width)/2;
    const baselineY = Math.floor(window.innerHeight*0.54);

    const letters=[];
    for(let i=0;i<TEXT.length;i++){
      const before = TEXT.slice(0,i);
      const curr = TEXT[i];
      const x = startX + ctx.measureText(before).width;
      const pts = sampleLetter(curr, fontSize, x, baselineY);
      letters.push({index:i, char: curr, pts});
    }
    return {letters, fontSize};
  }

  const built = buildLetters();
  const letters = built.letters;

  const order = shuffle(letters.map(l=>l.index).slice());
  const rawStaggers = order.map(()=> 40 + Math.random()*120); // 40..160ms
  let cumulative = [];
  let sum=0;
  for(const s of rawStaggers){ sum += s; cumulative.push(sum); }
  const spread = cumulative.length ? cumulative[cumulative.length-1] : 0;
  const scale = spread > MAX_STAGGER_SPREAD ? (MAX_STAGGER_SPREAD / spread) : 1;
  const startDelayByIndex = {};
  let acc=0;
  for(let i=0;i<order.length;i++){
    acc += rawStaggers[i]*scale;
    startDelayByIndex[order[i]] = acc;
  }

  class Particle{
    constructor(sx,sy,tx,ty,startDelay){
      this.sx=sx; this.sy=sy;
      this.x=sx; this.y=sy;
      this.tx=tx; this.ty=ty;
      this.startDelay=startDelay;
      this.done=false;
      this.alpha=1;
      const ang = Math.random()*Math.PI*2;
      const sp = DISPERSE_SPEED_MIN + Math.random()*(DISPERSE_SPEED_MAX-DISPERSE_SPEED_MIN);
      this.vx = Math.cos(ang)*sp;
      this.vy = Math.sin(ang)*sp;
      this.dispersing=false;
    }
    updateGather(t){
      if(t < this.startDelay) return;
      const p = Math.min(1, (t - this.startDelay)/FORM_DURATION);
      const ease = 1 - Math.pow(1-p,3);
      this.x = this.sx + (this.tx - this.sx)*ease;
      this.y = this.sy + (this.ty - this.sy)*ease;
      if(p>=1) this.done=true;
    }
    startDisperse(){
      this.dispersing=true;
      this.alpha=1;
    }
    updateDisperse(){
      if(!this.dispersing) return;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha = Math.max(0, this.alpha - 0.02);
    }
    isOffscreen(w,h){
      return (this.alpha <= 0.02 || this.x < -20 || this.x > w+20 || this.y < -20 || this.y > h+20);
    }
  }

  function spawnLetterParticles(letter){
    const w = window.innerWidth, h = window.innerHeight;
    const pts = letter.pts;
    const delay = startDelayByIndex[letter.index] || 0;
    const batch=[];
    for(let i=0;i<pts.length;i++){
      const [tx,ty]=pts[i];
      const margin = 90;
      const spreadX = w * 0.35;
      const spreadY = h * 0.35;
      const dir = Math.floor(Math.random()*4);
      let sx, sy;
      if(dir===0){ // left
        sx = -margin - Math.random()*spreadX;
        sy = (Math.random()*h) + (Math.random()-0.5)*40;
      }else if(dir===1){ // right
        sx = w + margin + Math.random()*spreadX;
        sy = (Math.random()*h) + (Math.random()-0.5)*40;
      }else if(dir===2){ // top
        sx = (Math.random()*w) + (Math.random()-0.5)*40;
        sy = -margin - Math.random()*spreadY;
      }else{ // bottom
        sx = (Math.random()*w) + (Math.random()-0.5)*40;
        sy = h + margin + Math.random()*spreadY;
      }
      batch.push(new Particle(sx,sy,tx,ty,delay));
    }
    return batch;
  }

  let particles=[];
  for(const l of letters){
    particles = particles.concat(spawnLetterParticles(l));
  }

  let phase = "gather"; // gather -> hold -> disperse -> fade
  let phaseStart = performance.now();

  // Text bounds for opening glow behavior (used to pull/expand the fog)
  const textBounds = (() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const l of letters){
      // Approximate per-letter bounds around sampled glyph.
      const lx0 = l.x;
      const ly0 = l.y - l.fontSize;
      const lx1 = l.x + l.fontSize * 0.9;
      const ly1 = l.y + l.fontSize * 0.25;
      if (lx0 < minX) minX = lx0;
      if (ly0 < minY) minY = ly0;
      if (lx1 > maxX) maxX = lx1;
      if (ly1 > maxY) maxY = ly1;
    }
    if (!isFinite(minX)){
      minX = window.innerWidth * 0.5;
      minY = window.innerHeight * 0.5;
      maxX = minX + 1;
      maxY = minY + 1;
    }
    return {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX),
      h: Math.max(1, maxY - minY),
      cx: (minX + maxX) * 0.5,
      cy: (minY + maxY) * 0.5,
    };
  })();

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }
  function easeInOut(v){
    const x = clamp01(v);
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }
  function lerp(a,b,t){ return a + (b - a) * t; }

  function allLettersDone(){
    for(const p of particles){ if(!p.done) return false; }
    return true;
  }

  function allOffscreen(){
    const w=window.innerWidth, h=window.innerHeight;
    for(const p of particles){ if(!p.isOffscreen(w,h)) return false; }
    return true;
  }

  function isTransparentColor(v){
    const s = (v || '').trim().toLowerCase();
    if(!s) return true;
    if(s === 'transparent') return true;
    if(s.startsWith('rgba(') && s.endsWith(')')){
      // crude alpha=0 detection
      const parts = s.slice(5,-1).split(',').map(x=>x.trim());
      const a = parts.length >= 4 ? parseFloat(parts[3]) : NaN;
      if(!Number.isNaN(a) && a <= 0.001) return true;
    }
    return false;
  }

  function draw(now, phaseT){
    const w=window.innerWidth, h=window.innerHeight;
    ctx.clearRect(0,0,w,h);

    // Optional opening glow (theme-controlled). This is intentionally *only* for the opening.
    // Behavior request:
    //  - During gather: fog is "pulled" into the text area.
    //  - During disperse: fog expands (like mist) and vanishes.
    const glow = wbCssVar('--wb-fx-opening-glow', 'transparent');
    if(!isTransparentColor(glow)){
      const screenCx = w * 0.5;
      const screenCy = h * 0.54;

      // Progress proxies
      let doneCount = 0;
      for (const p of particles){ if (p.done) doneCount++; }
      const doneRatio = particles.length ? (doneCount / particles.length) : 0;

      let cx = screenCx;
      let cy = screenCy;
      let r = Math.max(w,h) * 0.6;
      let alpha = 0.0;

      const textCx = textBounds.cx;
      const textCy = textBounds.cy;
      const textR = Math.max(textBounds.w, textBounds.h) * 0.85;

      if (phase === 'gather'){
        // "Pull" center towards the text as particles complete.
        const k = easeInOut(doneRatio);
        cx = lerp(screenCx, textCx, k);
        cy = lerp(screenCy, textCy, k);
        // Fog contracts as it gets pulled in.
        r = lerp(Math.max(w,h) * 0.65, Math.max(120, textR), k);
        // Slight density increase as it concentrates.
        alpha = 0.35 + 0.55 * k;
      } else if (phase === 'hold'){
        cx = textCx;
        cy = textCy;
        r = Math.max(110, textR);
        alpha = 0.95;
      } else if (phase === 'disperse'){
        // Expand and fade out quickly.
        const k = clamp01(phaseT / 750);
        cx = textCx;
        cy = textCy;
        r = lerp(Math.max(110, textR), Math.max(w,h) * 0.85, easeInOut(k));
        alpha = 0.95 * (1 - k);
      } else {
        alpha = 0;
      }

      if (alpha > 0.001){
        // Add a very subtle pulse so it feels "alive" while being pulled.
        const pulse = 0.92 + 0.08 * Math.sin(now / 520);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, glow);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha * pulse;
        ctx.fillStyle = g;
        ctx.fillRect(0,0,w,h);
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = wbCssVar('--wb-fx-opening-particle', 'rgba(255,189,49,0.95)');
    for(const p of particles){
      if(phase==="gather"){
        ctx.globalAlpha = 1;
      }else{
        ctx.globalAlpha = p.alpha;
      }
      ctx.fillRect(p.x, p.y, 1.7, 1.7);
    }
    ctx.globalAlpha = 1;
  }

  function tick(now){
    const t = now - phaseStart;

    if(phase === "gather"){
      for(const p of particles) p.updateGather(t);
      if(allLettersDone()){
        phase = "hold";
        phaseStart = now;
      }
    }else if(phase === "hold"){
      if(t >= HOLD_TIME){
        phase = "disperse";
        phaseStart = now;
        for(const p of particles) p.startDisperse();
      }
    }else if(phase === "disperse"){
      for(const p of particles) p.updateDisperse();
      if(allOffscreen()){
        phase="fade";
        phaseStart = now;
        opening.classList.add('is-fadeout');
        content.classList.add('is-show');
        setTimeout(()=>opening.classList.add('is-hide'), Math.max(OPENING_FADE, CONTENT_FADE) + 50);
      }
    }else if(phase === "fade"){
    }

    draw(now, t);
    if(!running) return;
    rafId = requestAnimationFrame(tick);
  }

  content.classList.remove('is-show');
  opening.classList.remove('is-hide');
  opening.classList.remove('is-fadeout');

  rafId = requestAnimationFrame(tick);
})();


(function(){
  function build(){
    var links = document.querySelectorAll('.mail-link[data-user][data-domain]');
    links.forEach(function(a){
      var user = a.getAttribute('data-user');
      var domain = a.getAttribute('data-domain');
      var addr = user + '@' + domain;
      a.textContent = addr;
      a.setAttribute('href', 'mailto:' + addr);
      a.setAttribute('rel', 'nofollow');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();


(function(){
  const root = document.documentElement;
  const header = document.querySelector('header.header');
  if(!root || !header) return;

  function update(){
    const h = Math.ceil(header.getBoundingClientRect().height);
    root.style.setProperty('--header-offset', `${h}px`);
  }

  function updateSoon(){
    requestAnimationFrame(() => requestAnimationFrame(update));
  }

  updateSoon();
  window.addEventListener('resize', updateSoon);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateSoon).catch(() => {});
  }
})();



{
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const openBtn = document.getElementById('sidebar-open');
  const closeBtn = document.getElementById('sidebar-close');
  const html = document.documentElement;
  const container = document.querySelector('.container');
  const links = Array.from(document.querySelectorAll('.sidebar-link'));

  function setOpen(isOpen) {
    sidebar.classList.toggle('is-open', isOpen);
    backdrop.classList.toggle('is-open', isOpen);
    html.classList.toggle('is-menu-open', isOpen);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function isOpen(){
    return !!(sidebar && sidebar.classList.contains('is-open'));
  }

  function getScrollHost() {
    return window;
  }

  function scrollToAnchor(hash) {
    const id = (hash || '').replace('#','');
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    const header = document.querySelector('header.header');
    const offset = header ? header.offsetHeight : 56;
    const host = getScrollHost();
    const top = target.getBoundingClientRect().top;
    if (host === window) {
      window.scrollTo({ top: window.scrollY + top - offset, behavior: wbScrollBehavior() });
    } else {
      host.scrollTo({ top: host.scrollTop + top - offset, behavior: wbScrollBehavior() });
    }
  }

  function updateActiveLink() {
    const sections = Array.from(document.querySelectorAll('.area'));
    let currentId = sections[0]?.id || 'top';

    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      if (r.top <= 120 && r.bottom >= 120) {
        currentId = sec.id;
        break;
      }
    }

    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + currentId));
  }

  if (openBtn) {
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.addEventListener('click', () => setOpen(!isOpen()));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => setOpen(false));
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => setOpen(false));
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      setOpen(false);
      window.setTimeout(() => scrollToAnchor(href), 120);
    });
  });

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  window.addEventListener('resize', updateActiveLink);
  updateActiveLink();
}



(function(){
  const header = document.querySelector('header.header');
  const links = Array.from(document.querySelectorAll('header.header nav.topnav a[href^="#"]'));
  if(!header || links.length===0) return;

  function scrollToId(id){
    const el = document.querySelector(id);
    if(!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - header.offsetHeight + 1;
    window.scrollTo({ top: y, behavior: wbScrollBehavior() });
  }

  links.forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const id = a.getAttribute('href');
      scrollToId(id);
    });
  });



  const sections = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  function setActive(){
    const scrollPos = window.scrollY + header.offsetHeight + 8;
    let current = sections[0];
    for(const sec of sections){
      const top = sec.offsetTop;
      if(top <= scrollPos) current = sec;
    }
    links.forEach(a=>a.classList.toggle('is-active', current && a.getAttribute('href') === '#'+current.id));
  }
  window.addEventListener('scroll', setActive, { passive: true });
  window.addEventListener('resize', setActive);
  setActive();
})();


(function(){
  const canvas = document.getElementById("bg-constellation");
  if(!canvas) return;
  if(wbPrefersReducedMotion()){
    canvas.style.display = 'none';
    return;
  }
  const ctx = canvas.getContext("2d");
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  let W=0,H=0;
  let points=[];
  const POINTS = 78;
  const MAX_DIST = 160;
  let mouse = {x: -9999, y: -9999};

  function theme(){
    return {
      line: wbCssVar('--wb-fx-constellation-line', "rgba(255,189,49,0.28)"),
      dot: wbCssVar('--wb-fx-constellation-dot', "rgba(255,189,49,0.85)"),
      faint: wbCssVar('--wb-fx-constellation-faint', "rgba(245,247,251,0.10)")
    };
  }

  function resize(){
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W+"px";
    canvas.style.height = H+"px";
    canvas.width = Math.floor(W*dpr);
    canvas.height = Math.floor(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    points = [];
    for(let i=0;i<POINTS;i++){
      points.push({
        x: Math.random()*W,
        y: Math.random()*H,
        vx: (Math.random()*2-1)*0.35,
        vy: (Math.random()*2-1)*0.35,
        r: 1.6 + Math.random()*1.2
      });
    }
  }

  function step(){
    const t = theme();
    ctx.clearRect(0,0,W,H);

    const g = ctx.createRadialGradient(W*0.5,H*0.45,20,W*0.5,H*0.45,Math.max(W,H)*0.9);
    g.addColorStop(0, wbCssVar('--wb-fx-constellation-glow', "rgba(255,189,49,0.06)"));
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    for(const p of points){
      p.x += p.vx;
      p.y += p.vy;
      if(p.x < -10) p.x = W+10;
      if(p.x > W+10) p.x = -10;
      if(p.y < -10) p.y = H+10;
      if(p.y > H+10) p.y = -10;
    }

    for(let i=0;i<points.length;i++){
      for(let j=i+1;j<points.length;j++){
        const a = points[i], b = points[j];
        const dx = a.x-b.x, dy=a.y-b.y;
        const dist = Math.hypot(dx,dy);
        if(dist < MAX_DIST){
          const alpha = 1 - dist/MAX_DIST;
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = t.faint;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;

    if(mouse.x > -1000){
      for(const p of points){
        const dist = Math.hypot(p.x-mouse.x, p.y-mouse.y);
        if(dist < MAX_DIST){
          const alpha = 1 - dist/MAX_DIST;
          ctx.globalAlpha = alpha * 0.95;
          ctx.strokeStyle = t.line;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(mouse.x,mouse.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;

    for(const p of points){
      ctx.fillStyle = t.dot;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }

  function onMove(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }
  window.addEventListener("mousemove", onMove, {passive:true});
  window.addEventListener("touchmove", (e)=>{
    if(e.touches && e.touches[0]){
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }, {passive:true});

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
})();
