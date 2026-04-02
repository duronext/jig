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

  // ── Sections placeholder (filled by later tasks) ──────────
  const SECTIONS = [];

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
          // engine.start() will be wired in Task 2
        }
        break;

      case PLAYING:
        if (event === 'pause') {
          state = PAUSED;
        } else if (event === 'close') {
          state = IDLE;
          closeModal();
        } else if (event === 'section_end') {
          state = SECTION_TRANSITION;
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
        }
        break;

      case PAUSED:
        if (event === 'play') {
          state = PLAYING;
        } else if (event === 'close') {
          state = IDLE;
          closeModal();
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
        }
        break;

      case SECTION_TRANSITION:
        if (event === 'transition_done') {
          state = PLAYING;
        } else if (event === 'close') {
          state = IDLE;
          closeModal();
        }
        break;

      case COMPLETE:
        if (event === 'replay') {
          state = PLAYING;
        } else if (event === 'close') {
          state = IDLE;
          closeModal();
        } else if (event === 'nav_to') {
          state = SECTION_TRANSITION;
        }
        break;
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
