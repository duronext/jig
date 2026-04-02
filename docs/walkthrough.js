(function () {
  'use strict';

  // ── State Machine ─────────────────────────────────────────
  const IDLE = 'IDLE';
  const PLAYING = 'PLAYING';
  const PAUSED = 'PAUSED';
  const SECTION_TRANSITION = 'SECTION_TRANSITION';
  const COMPLETE = 'COMPLETE';

  let state = IDLE;
  let savedScrollY = 0;

  // DOM references (set after createModal)
  let backdrop = null;
  let modal = null;
  let terminalBody = null;
  let terminalPre = null;
  let navBar = null;
  let tabsContainer = null;
  let controlsBar = null;

  // ── Animation Engine ──────────────────────────────────────
  const engine = {
    clock: 0,
    lastFrame: 0,
    rafId: null,
    sectionIndex: 0,
    frameIndex: 0,
    paused: false,
    resumeAfterTransition: true,

    start() {
      this.lastFrame = performance.now();
      this.paused = false;
      this.tick(this.lastFrame);
    },

    stop() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    pause() {
      this.paused = true;
    },

    resume() {
      this.paused = false;
      this.lastFrame = performance.now();
    },

    reset() {
      this.stop();
      this.clock = 0;
      this.sectionIndex = 0;
      this.frameIndex = 0;
      this.paused = false;
      this.resumeAfterTransition = true;
      // Clear active typing elements
      activeTyping = null;
    },

    tick(now) {
      if (state !== PLAYING && state !== PAUSED) return;

      if (!this.paused) {
        const dt = now - this.lastFrame;
        this.lastFrame = now;
        this.clock += dt;

        // Process typing animation
        processTyping();

        // Fire frames whose timestamp <= clock
        if (SECTIONS.length > 0) {
          const section = SECTIONS[this.sectionIndex];
          while (this.frameIndex < section.frames.length &&
                 section.frames[this.frameIndex].t <= this.clock) {
            renderFrame(section.frames[this.frameIndex]);
            this.frameIndex++;
          }

          updateControls();

          // Check if section is done
          if (this.frameIndex >= section.frames.length && this.clock >= section.duration) {
            if (this.sectionIndex < SECTIONS.length - 1) {
              transition('section_end');
              return;
            } else {
              transition('complete');
              return;
            }
          }
        }
      } else {
        this.lastFrame = now;
      }

      this.rafId = requestAnimationFrame((t) => this.tick(t));
    }
  };

  // ── Active typing tracking ────────────────────────────────
  let activeTyping = null; // { chars: NodeList, start: number, count: number, duration: number, cursorEl: Element }

  function processTyping() {
    if (!activeTyping) return;
    const elapsed = engine.clock - activeTyping.start;
    const reveal = Math.min(
      Math.floor((elapsed / activeTyping.duration) * activeTyping.count),
      activeTyping.count
    );
    for (let i = 0; i < reveal; i++) {
      activeTyping.chars[i].classList.add('visible');
    }
    if (reveal >= activeTyping.count) {
      // Typing complete — remove typing cursor
      if (activeTyping.cursorEl) activeTyping.cursorEl.remove();
      activeTyping = null;
    }
  }

  // ── Frame Renderers ───────────────────────────────────────
  function renderFrame(frame) {
    switch (frame.type) {
      case 'line': renderLine(frame); break;
      case 'break': renderBreak(); break;
      case 'cursor': renderCursor(); break;
      case 'progress': renderProgress(frame); break;
      case 'split-line': renderSplitLine(frame); break;
      case 'clear-pane': clearPane(frame); break;
    }
  }

  function renderLine(frame) {
    const div = document.createElement('div');
    div.className = 'wt-line';

    if (frame.typing) {
      // Extract the command text to type character by character
      // The html has structure: <span class="wt-prompt">$</span> <span class="wt-cmd">/jig:kickoff</span>
      // We type only the command part (content of .wt-cmd)
      const temp = document.createElement('div');
      temp.innerHTML = frame.html;
      const cmdSpan = temp.querySelector('.wt-cmd');

      if (cmdSpan) {
        const cmdText = cmdSpan.textContent;
        // Wrap each character in a wt-char span
        cmdSpan.textContent = '';
        for (let i = 0; i < cmdText.length; i++) {
          const charSpan = document.createElement('span');
          charSpan.className = 'wt-char';
          charSpan.textContent = cmdText[i];
          cmdSpan.appendChild(charSpan);
        }
        // Add typing cursor after command
        const typeCursor = document.createElement('span');
        typeCursor.className = 'wt-typing-cursor';
        typeCursor.textContent = '\u258C';
        cmdSpan.appendChild(typeCursor);

        div.innerHTML = '';
        while (temp.firstChild) {
          div.appendChild(temp.firstChild);
        }

        // Set up typing tracking
        const chars = div.querySelectorAll('.wt-char');
        activeTyping = {
          chars: chars,
          start: engine.clock,
          count: chars.length,
          duration: 600,
          cursorEl: typeCursor
        };
      } else {
        div.innerHTML = frame.html;
      }
    } else {
      div.innerHTML = frame.html;
    }

    if (terminalPre) terminalPre.appendChild(div);

    // Auto-scroll to bottom
    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  function renderBreak() {
    const div = document.createElement('div');
    div.className = 'wt-break';
    if (terminalPre) terminalPre.appendChild(div);
  }

  function renderCursor() {
    // Remove any existing cursor first
    const existing = terminalPre ? terminalPre.querySelector('.wt-cursor') : null;
    if (existing) existing.remove();

    const span = document.createElement('span');
    span.className = 'wt-cursor';
    span.textContent = '\u258C';
    if (terminalPre) terminalPre.appendChild(span);
  }

  function renderProgress(frame) {
    const div = document.createElement('div');
    div.className = 'wt-line';

    const bar = document.createElement('span');
    bar.className = 'wt-progress';
    const fill = document.createElement('span');
    fill.className = 'wt-progress-fill';
    fill.style.setProperty('--wt-dur', (frame.duration || 2000) + 'ms');
    bar.appendChild(fill);

    if (frame.label) {
      const label = document.createElement('span');
      label.className = 'wt-label';
      label.textContent = frame.label;
      div.appendChild(label);
    }
    div.appendChild(bar);
    if (frame.suffix) {
      const suf = document.createElement('span');
      suf.innerHTML = ' ' + frame.suffix;
      div.appendChild(suf);
    }

    if (terminalPre) terminalPre.appendChild(div);

    // Trigger animation on next frame
    requestAnimationFrame(() => fill.classList.add('active'));

    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  function renderSplitLine(frame) {
    // Implemented in Task 6
  }

  function clearPane(frame) {
    // Implemented in Task 6
  }

  // ── Content Data ──────────────────────────────────────────
  const SECTIONS = [
    {
      id: 'kickoff',
      label: 'Kickoff',
      duration: 5000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:kickoff</span>', typing: true },
        { t: 800, type: 'line', html: '<span class="wt-label">  \u25B8 Work type:</span> <span class="wt-value">feature</span>' },
        { t: 1100, type: 'line', html: '<span class="wt-label">  \u25B8 Summary:</span>  <span class="wt-value">Add commenting system to articles</span>' },
        { t: 1400, type: 'line', html: '<span class="wt-label">  \u25B8 Stack:</span>    <span class="wt-muted">GraphQL API \u00B7 Postgres \u00B7 React \u00B7 Design System</span>' },
        { t: 1800, type: 'line', html: '<span class="wt-label">  \u25B8 Pipeline:</span> <span class="wt-muted">discover \u2192 brainstorm \u2192 prd \u2192 plan \u2192 build \u2192 review \u2192 ship \u2192 learn</span>' },
        { t: 2400, type: 'line', html: '<span class="wt-label">  \u25B8 Branch:</span>   <span class="wt-value">eng/comments-42-article-commenting</span>' },
        { t: 2800, type: 'line', html: '<span class="wt-label">  \u25B8 Ticket:</span>   <span class="wt-success">COMMENTS-42 created \u2713</span>' },
        { t: 3200, type: 'cursor' },
      ]
    },
    // Sections 2-8 added in Task 4
  ];

  // ── Modal DOM Builder ─────────────────────────────────────
  function createModal() {
    backdrop = document.createElement('div');
    backdrop.className = 'wt-backdrop';
    backdrop.id = 'wt-backdrop';

    modal = document.createElement('div');
    modal.className = 'wt-modal';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'wt-close';
    closeBtn.setAttribute('aria-label', 'Close walkthrough');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => transition('close'));
    modal.appendChild(closeBtn);

    // Nav bar
    navBar = document.createElement('nav');
    navBar.className = 'wt-nav';
    const sectionLabels = ['Kickoff', 'Brainstorm', 'PRD', 'Plan', 'Execute', 'Review', 'Ship', 'Learn'];
    sectionLabels.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'wt-nav-item' + (i === 0 ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => handleNavClick(i));
      navBar.appendChild(btn);
    });
    modal.appendChild(navBar);

    // Terminal
    const terminal = document.createElement('div');
    terminal.className = 'wt-terminal';

    // Title bar
    const titlebar = document.createElement('div');
    titlebar.className = 'wt-titlebar';

    const dots = document.createElement('div');
    dots.className = 'wt-dots';
    ['red', 'yellow', 'green'].forEach(color => {
      const dot = document.createElement('span');
      dot.className = 'wt-dot wt-dot-' + color;
      dots.appendChild(dot);
    });
    titlebar.appendChild(dots);

    tabsContainer = document.createElement('div');
    tabsContainer.className = 'wt-tabs';
    const tab = document.createElement('span');
    tab.className = 'wt-tab active';
    tab.textContent = '\u2217 Claude Code: Jig \u2318\u0031';
    tabsContainer.appendChild(tab);
    titlebar.appendChild(tabsContainer);

    terminal.appendChild(titlebar);

    // Body
    terminalBody = document.createElement('div');
    terminalBody.className = 'wt-body';
    terminalPre = document.createElement('pre');
    terminalBody.appendChild(terminalPre);
    terminal.appendChild(terminalBody);

    modal.appendChild(terminal);

    // Controls bar
    controlsBar = document.createElement('div');
    controlsBar.className = 'wt-controls';

    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'wt-ctrl-btn wt-ctrl-playpause';
    playPauseBtn.setAttribute('aria-label', 'Pause');
    playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    controlsBar.appendChild(playPauseBtn);

    const progressWrap = document.createElement('div');
    progressWrap.className = 'wt-overall-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'wt-overall-fill';
    progressWrap.appendChild(progressFill);
    controlsBar.appendChild(progressWrap);

    const sectionLabel = document.createElement('span');
    sectionLabel.className = 'wt-section-label';
    sectionLabel.textContent = '1 / 8 \u2014 Kickoff';
    controlsBar.appendChild(sectionLabel);

    modal.appendChild(controlsBar);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  }

  // ── Modal Open / Close ────────────────────────────────────
  function openModal() {
    if (!backdrop) createModal();
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = -savedScrollY + 'px';
    backdrop.classList.add('open');

    // Hide ToC FAB
    const tocToggle = document.querySelector('.toc-toggle');
    const tocMobile = document.querySelector('.toc-mobile');
    if (tocToggle) tocToggle.style.display = 'none';
    if (tocMobile) tocMobile.style.display = 'none';
  }

  function closeModal() {
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);

    // Restore ToC FAB
    const tocToggle = document.querySelector('.toc-toggle');
    const tocMobile = document.querySelector('.toc-mobile');
    if (tocToggle) tocToggle.style.display = '';
    if (tocMobile) tocMobile.style.display = '';

    // Clear terminal
    if (terminalPre) terminalPre.innerHTML = '';
  }

  // ── State Transitions ─────────────────────────────────────
  function transition(event, payload) {
    switch (state) {
      case IDLE:
        if (event === 'play') {
          state = PLAYING;
          openModal();
          engine.reset();
          engine.start();
        }
        break;

      case PLAYING:
        if (event === 'pause') {
          state = PAUSED;
          engine.pause();
        } else if (event === 'close') {
          state = IDLE;
          engine.stop();
          engine.reset();
          closeModal();
        } else if (event === 'section_end') {
          state = SECTION_TRANSITION;
          engine.resumeAfterTransition = true;
          performTransition(engine.sectionIndex + 1);
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
          engine.resumeAfterTransition = true;
          performTransition(payload);
        } else if (event === 'complete') {
          state = COMPLETE;
          engine.stop();
        }
        break;

      case PAUSED:
        if (event === 'play') {
          state = PLAYING;
          engine.resume();
        } else if (event === 'close') {
          state = IDLE;
          engine.stop();
          engine.reset();
          closeModal();
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
          engine.resumeAfterTransition = false;
          performTransition(payload);
        }
        break;

      case SECTION_TRANSITION:
        if (event === 'close') {
          state = IDLE;
          engine.stop();
          engine.reset();
          closeModal();
        }
        break;

      case COMPLETE:
        if (event === 'replay') {
          state = PLAYING;
          if (terminalPre) terminalPre.innerHTML = '';
          engine.reset();
          engine.start();
        } else if (event === 'close') {
          state = IDLE;
          closeModal();
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
          engine.resumeAfterTransition = true;
          performTransition(payload);
        }
        break;
    }
  }

  // ── Section Transition ────────────────────────────────────
  function performTransition(targetIndex) {
    engine.stop();

    // Phase 1: Fade out (200ms)
    if (terminalBody) terminalBody.classList.add('wt-fade-out');

    setTimeout(() => {
      // Phase 2: Clear and set up new section
      if (terminalPre) terminalPre.innerHTML = '';

      // Remove any cursor
      const cursor = terminalBody ? terminalBody.querySelector('.wt-cursor') : null;
      if (cursor) cursor.remove();

      // Advance to target section
      engine.sectionIndex = targetIndex;
      engine.clock = 0;
      engine.frameIndex = 0;
      activeTyping = null;

      // Update tabs for new section
      updateTabs(targetIndex);

      // Update nav bar
      updateNav(targetIndex);

      // Phase 3: Fade in (200ms)
      if (terminalBody) terminalBody.classList.remove('wt-fade-out');

      setTimeout(() => {
        // Phase 4: Resume or stay paused
        if (engine.resumeAfterTransition) {
          state = PLAYING;
          engine.start();
        } else {
          state = PAUSED;
          engine.paused = true;
        }
      }, 200);
    }, 200);
  }

  function updateTabs(sectionIndex) {
    if (!tabsContainer || SECTIONS.length === 0) return;
    const section = SECTIONS[sectionIndex];
    if (!section) return;

    tabsContainer.innerHTML = '';
    const tabs = section.tabs || ['\u2217 Claude Code: Jig \u2318\u0031'];
    tabs.forEach((text, i) => {
      const tab = document.createElement('span');
      tab.className = 'wt-tab' + (i === 0 ? ' active' : '');
      tab.textContent = text;
      tabsContainer.appendChild(tab);
    });
  }

  function updateNav(sectionIndex) {
    if (!navBar) return;
    const items = navBar.querySelectorAll('.wt-nav-item');
    items.forEach((item, i) => {
      item.classList.remove('active', 'completed');
      if (i === sectionIndex) {
        item.classList.add('active');
      } else if (i < sectionIndex) {
        item.classList.add('completed');
      }
    });
  }

  function updateControls() {
    if (!controlsBar) return;

    const label = controlsBar.querySelector('.wt-section-label');
    if (label && SECTIONS.length > 0) {
      const section = SECTIONS[engine.sectionIndex];
      label.textContent = (engine.sectionIndex + 1) + ' / ' + SECTIONS.length + ' \u2014 ' + (section ? section.label : '');
    }

    const fill = controlsBar.querySelector('.wt-overall-fill');
    if (fill && SECTIONS.length > 0) {
      // Calculate total elapsed across all sections
      let elapsed = 0;
      for (let i = 0; i < engine.sectionIndex; i++) {
        elapsed += SECTIONS[i].duration;
      }
      elapsed += Math.min(engine.clock, SECTIONS[engine.sectionIndex].duration);

      const total = SECTIONS.reduce((sum, s) => sum + s.duration, 0);
      fill.style.width = ((elapsed / total) * 100) + '%';
    }
  }

  // ── Nav handler (placeholder — wired fully in Task 7) ─────
  function handleNavClick(i) {
    // Will be implemented in Task 7
  }

  // ── Keyboard Listener ─────────────────────────────────────
  function handleKeydown(e) {
    if (state === IDLE) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      transition('close');
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const playBtn = document.querySelector('.wt-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => transition('play'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
