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

    // Trigger animation on next frame
    requestAnimationFrame(() => fill.classList.add('active'));

    if (frame.pane !== undefined) {
      const paneEl = terminalBody ? terminalBody.querySelector('[data-pane="' + frame.pane + '"]') : null;
      const pre = paneEl ? paneEl.querySelector('pre') : null;
      if (pre) {
        pre.appendChild(div);
        paneEl.scrollTop = paneEl.scrollHeight;
      }
    } else {
      if (terminalPre) terminalPre.appendChild(div);
      if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
    }
  }

  function renderSplitLine(frame) {
    if (!terminalBody) return;

    const paneEl = terminalBody.querySelector('[data-pane="' + frame.pane + '"]');
    if (!paneEl) return;

    const pre = paneEl.querySelector('pre');
    if (!pre) return;

    const div = document.createElement('div');
    div.className = 'wt-line';
    div.innerHTML = frame.html;
    pre.appendChild(div);

    // Auto-scroll pane
    paneEl.scrollTop = paneEl.scrollHeight;
  }

  function clearPane(frame) {
    if (!terminalBody) return;
    const paneEl = terminalBody.querySelector('[data-pane="' + frame.pane + '"]');
    if (!paneEl) return;
    const pre = paneEl.querySelector('pre');
    if (pre) pre.innerHTML = '';
  }

  function switchLayout(layout) {
    if (!terminalBody) return;

    if (layout === 'split') {
      terminalBody.classList.add('wt-split');
      terminalBody.innerHTML = '';

      // Left pane (team lead)
      const leftPane = document.createElement('div');
      leftPane.className = 'wt-pane wt-pane-lead';
      leftPane.dataset.pane = '0';

      const leftHeader = document.createElement('div');
      leftHeader.className = 'wt-pane-header';
      leftHeader.textContent = 'Team Lead';
      leftPane.appendChild(leftHeader);

      const leftPre = document.createElement('pre');
      leftPane.appendChild(leftPre);
      terminalBody.appendChild(leftPane);

      // Right column (3 agent panes)
      const rightCol = document.createElement('div');
      rightCol.className = 'wt-pane-right';

      const agents = [
        { name: 'frontend-agent', label: 'Frontend' },
        { name: 'backend-agent', label: 'Backend' },
        { name: 'test-writer', label: 'Tests' }
      ];

      agents.forEach((agent, i) => {
        const pane = document.createElement('div');
        pane.className = 'wt-pane wt-pane-agent';
        pane.dataset.pane = String(i + 1);

        const header = document.createElement('div');
        header.className = 'wt-pane-header';
        header.textContent = agent.label;
        pane.appendChild(header);

        const pre = document.createElement('pre');
        pane.appendChild(pre);
        rightCol.appendChild(pane);
      });

      terminalBody.appendChild(rightCol);

      // Update the terminalPre reference to null (no single pre in split mode)
      terminalPre = null;
    } else {
      // Single pane
      terminalBody.classList.remove('wt-split');
      terminalBody.innerHTML = '';
      terminalPre = document.createElement('pre');
      terminalBody.appendChild(terminalPre);
    }
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
    {
      id: 'brainstorm',
      label: 'Brainstorm',
      duration: 12000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:brainstorm</span>', typing: true },
        { t: 800, type: 'line', html: '<span class="wt-label">  \u25B8 What problem does this solve?</span>' },
        { t: 1200, type: 'line', html: '<span class="wt-muted">  \u25B8 &ldquo;Users want to discuss articles in context&rdquo;</span>' },
        { t: 1800, type: 'break' },
        { t: 1900, type: 'line', html: '<span class="wt-label">  \u25B8 Approach A:</span> <span class="wt-value">Threaded comments with real-time updates</span>' },
        { t: 2300, type: 'line', html: '<span class="wt-label">  \u25B8 Approach B:</span> <span class="wt-value">Linear comments with pagination</span>' },
        { t: 2700, type: 'line', html: '<span class="wt-label">  \u25B8 Approach C:</span> <span class="wt-value">Inline annotations (Medium-style)</span>' },
        { t: 3300, type: 'break' },
        { t: 3400, type: 'line', html: '<span class="wt-label">  \u25B8 Recommendation:</span> <span class="wt-value">Approach A (threaded + real-time)</span>' },
        { t: 4000, type: 'line', html: '<span class="wt-label">  \u25B8 Concerns checklist:</span>' },
        { t: 4600, type: 'line', html: '<span class="wt-muted">    \u25B8 security:</span> <span class="wt-value">input sanitization, rate limiting</span> <span class="wt-success">\u2713</span>' },
        { t: 5200, type: 'line', html: '<span class="wt-muted">    \u25B8 error-handling:</span> <span class="wt-value">optimistic updates with retry</span> <span class="wt-success">\u2713</span>' },
        { t: 5800, type: 'line', html: '<span class="wt-muted">    \u25B8 test-strategy:</span> <span class="wt-value">unit + integration</span> <span class="wt-success">\u2713</span>' },
        { t: 6600, type: 'break' },
        { t: 6700, type: 'line', html: '<span class="wt-success">  \u25B8 Design approved \u2713</span>' },
        { t: 7200, type: 'cursor' },
      ]
    },
    {
      id: 'prd',
      label: 'PRD',
      duration: 10000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:prd</span>', typing: true },
        { t: 700, type: 'line', html: '<span class="wt-label">  \u25B8 PRD:</span> <span class="wt-value">Article Commenting System</span>' },
        { t: 1100, type: 'line', html: '<span class="wt-label">  \u25B8 Tier:</span> <span class="wt-muted">Full (12 sections)</span>' },
        { t: 1700, type: 'break' },
        { t: 1800, type: 'line', html: '<span class="wt-label">  Acceptance criteria:</span>' },
        { t: 2300, type: 'line', html: '<span class="wt-muted">  \u25B8 [API]</span>  <span class="wt-value">createComment mutation with threadId support</span>' },
        { t: 2700, type: 'line', html: '<span class="wt-muted">  \u25B8 [API]</span>  <span class="wt-value">commentsByArticle query with cursor pagination</span>' },
        { t: 3100, type: 'line', html: '<span class="wt-muted">  \u25B8 [DATA]</span> <span class="wt-value">Comment entity: id, body, authorId, articleId, parentId</span>' },
        { t: 3500, type: 'line', html: '<span class="wt-muted">  \u25B8 [DATA]</span> <span class="wt-value">Indexes on articleId and parentId</span>' },
        { t: 3900, type: 'line', html: '<span class="wt-muted">  \u25B8 [LOGIC]</span> <span class="wt-value">Max nesting depth: 3 levels</span>' },
        { t: 4300, type: 'line', html: '<span class="wt-muted">  \u25B8 [LOGIC]</span> <span class="wt-value">Rate limit: 10 comments/minute/user</span>' },
        { t: 4700, type: 'line', html: '<span class="wt-muted">  \u25B8 [UI]</span>   <span class="wt-value">Threaded reply UI with collapse/expand</span>' },
        { t: 5100, type: 'line', html: '<span class="wt-muted">  \u25B8 [UI]</span>   <span class="wt-value">Real-time updates via subscription</span>' },
        { t: 5700, type: 'break' },
        { t: 5800, type: 'line', html: '<span class="wt-success">  \u25B8 Saved to docs/plans/ \u2713</span>' },
        { t: 6300, type: 'cursor' },
      ]
    },
    {
      id: 'plan',
      label: 'Plan',
      duration: 10000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:plan</span>', typing: true },
        { t: 700, type: 'line', html: '<span class="wt-label">  \u25B8 Strategy:</span> <span class="wt-value">parallel (5 tasks, 3 agents)</span>' },
        { t: 1400, type: 'break' },
        { t: 1500, type: 'line', html: '<span class="wt-label">  Task 1:</span> <span class="wt-value">Comment data model + migration</span>' },
        { t: 1800, type: 'line', html: '<span class="wt-muted">    Files: db/migrations/001_comments.sql, src/models/comment.ts</span>' },
        { t: 2300, type: 'break' },
        { t: 2400, type: 'line', html: '<span class="wt-label">  Task 2:</span> <span class="wt-value">GraphQL resolvers + subscriptions</span>' },
        { t: 2700, type: 'line', html: '<span class="wt-muted">    Files: src/graphql/comments.ts, src/graphql/schema.graphql</span>' },
        { t: 3200, type: 'break' },
        { t: 3300, type: 'line', html: '<span class="wt-label">  Task 3:</span> <span class="wt-value">Comment thread component</span>' },
        { t: 3600, type: 'line', html: '<span class="wt-muted">    Files: src/components/CommentThread.tsx, CommentForm.tsx</span>' },
        { t: 4100, type: 'break' },
        { t: 4200, type: 'line', html: '<span class="wt-label">  Task 4:</span> <span class="wt-value">Real-time subscription hook</span>' },
        { t: 4500, type: 'line', html: '<span class="wt-muted">    Files: src/hooks/useComments.ts</span>' },
        { t: 5000, type: 'break' },
        { t: 5100, type: 'line', html: '<span class="wt-label">  Task 5:</span> <span class="wt-value">Integration tests</span>' },
        { t: 5400, type: 'line', html: '<span class="wt-muted">    Files: tests/comments.test.ts</span>' },
        { t: 6000, type: 'break' },
        { t: 6100, type: 'line', html: '<span class="wt-success">  \u25B8 Plan approved \u2713</span>' },
        { t: 6600, type: 'cursor' },
      ]
    },
    {
      id: 'execute',
      label: 'Execute',
      duration: 20000,
      layout: 'split',
      tabs: ['\u2217 Team Lead \u2318\u0031', '\u2192 frontend \u2318\u0032', '\u2192 backend \u2318\u0033', '\u2192 tests \u2318\u0034'],
      frames: [
        // Pane 0: Team Lead
        { t: 0,    type: 'split-line', pane: 0, html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:build</span>', typing: true },
        { t: 800,  type: 'split-line', pane: 0, html: '<span class="wt-label">  \u25B8 Strategy:</span> <span class="wt-value">team-dev (parallel)</span>' },
        { t: 1200, type: 'split-line', pane: 0, html: '<span class="wt-label">  \u25B8 Dispatching 3 agents...</span>' },
        { t: 1700, type: 'split-line', pane: 0, html: '<span class="wt-break"> </span>' },
        { t: 1900, type: 'split-line', pane: 0, html: '<span class="wt-muted">  \u25B8 frontend-agent \u2192</span> <span class="wt-value">Task 3, Task 4</span>' },
        { t: 2100, type: 'split-line', pane: 0, html: '<span class="wt-muted">  \u25B8 backend-agent \u2192</span>  <span class="wt-value">Task 1, Task 2</span>' },
        { t: 2300, type: 'split-line', pane: 0, html: '<span class="wt-muted">  \u25B8 test-writer \u2192</span>    <span class="wt-value">Task 5</span>' },
        { t: 2700, type: 'split-line', pane: 0, html: '<span class="wt-break"> </span>' },
        { t: 2800, type: 'split-line', pane: 0, html: '<span class="wt-label">  Waiting for agents...</span>' },

        // Pane 2: backend-agent starts
        { t: 2500, type: 'split-line', pane: 2, html: '<span class="wt-label">Task 1:</span> <span class="wt-value">Comment data model</span>' },
        { t: 3000, type: 'split-line', pane: 2, html: '<span class="wt-muted">  \u25B8 Creating migration: 001_comments.sql</span>' },
        { t: 3800, type: 'split-line', pane: 2, html: '<span class="wt-muted">  \u25B8 Creating model: comment.ts</span>' },
        { t: 4600, type: 'split-line', pane: 2, html: '<span class="wt-success">  \u25B8 Tests passing \u2713</span>' },

        // Pane 1: frontend-agent starts
        { t: 2600, type: 'split-line', pane: 1, html: '<span class="wt-label">Task 3:</span> <span class="wt-value">CommentThread component</span>' },
        { t: 3100, type: 'split-line', pane: 1, html: '<span class="wt-muted">  \u25B8 Writing test: renders nested replies</span>' },
        { t: 3900, type: 'split-line', pane: 1, html: '<span class="wt-muted">  \u25B8 Test fails (red) \u2713</span>' },
        { t: 4700, type: 'split-line', pane: 1, html: '<span class="wt-muted">  \u25B8 Implementing CommentThread.tsx</span>' },

        // Pane 2: backend Task 2
        { t: 5200, type: 'split-line', pane: 2, html: '<span class="wt-break"> </span>' },
        { t: 5300, type: 'split-line', pane: 2, html: '<span class="wt-label">Task 2:</span> <span class="wt-value">GraphQL resolvers</span>' },
        { t: 5800, type: 'split-line', pane: 2, html: '<span class="wt-muted">  \u25B8 Writing test: createComment resolver</span>' },
        { t: 6600, type: 'split-line', pane: 2, html: '<span class="wt-muted">  \u25B8 Implementing resolvers + subscriptions</span>' },
        { t: 7800, type: 'split-line', pane: 2, html: '<span class="wt-success">  \u25B8 All tests pass \u2713</span>' },

        // Pane 1: frontend Task 3 done, Task 4
        { t: 6000, type: 'split-line', pane: 1, html: '<span class="wt-success">  \u25B8 Test passes (green) \u2713</span>' },
        { t: 6500, type: 'split-line', pane: 1, html: '<span class="wt-success">  \u25B8 Committed \u2713</span>' },
        { t: 7000, type: 'split-line', pane: 1, html: '<span class="wt-break"> </span>' },
        { t: 7100, type: 'split-line', pane: 1, html: '<span class="wt-label">Task 4:</span> <span class="wt-value">useComments hook</span>' },
        { t: 7600, type: 'split-line', pane: 1, html: '<span class="wt-muted">  \u25B8 Writing test: subscribes on mount</span>' },
        { t: 8400, type: 'split-line', pane: 1, html: '<span class="wt-muted">  \u25B8 Implementing useComments.ts</span>' },
        { t: 9400, type: 'split-line', pane: 1, html: '<span class="wt-success">  \u25B8 All tests pass \u2713</span>' },

        // Team Lead: backend done
        { t: 8200, type: 'split-line', pane: 0, html: '<span class="wt-success">  \u25B8 backend-agent:  Task 1 complete \u2713</span>' },
        { t: 8600, type: 'split-line', pane: 0, html: '<span class="wt-success">  \u25B8 backend-agent:  Task 2 complete \u2713</span>' },

        // Pane 3: test-writer (waits for tasks 1-4)
        { t: 8000, type: 'split-line', pane: 3, html: '<span class="wt-label">Task 5:</span> <span class="wt-value">Integration tests</span>' },
        { t: 8500, type: 'split-line', pane: 3, html: '<span class="wt-muted">  \u25B8 Waiting for Tasks 1\u20134...</span>' },
        { t: 10000, type: 'split-line', pane: 3, html: '<span class="wt-success">  \u25B8 Dependencies resolved \u2713</span>' },
        { t: 10600, type: 'split-line', pane: 3, html: '<span class="wt-muted">  \u25B8 Writing: full comment lifecycle</span>' },
        { t: 11400, type: 'split-line', pane: 3, html: '<span class="wt-muted">  \u25B8 Writing: thread nesting depth</span>' },
        { t: 12200, type: 'split-line', pane: 3, html: '<span class="wt-muted">  \u25B8 Writing: rate limit enforcement</span>' },
        { t: 13400, type: 'split-line', pane: 3, html: '<span class="wt-success">  \u25B8 12 tests, all passing \u2713</span>' },

        // Team Lead: frontend done, test-writer done
        { t: 10200, type: 'split-line', pane: 0, html: '<span class="wt-success">  \u25B8 frontend-agent: Task 3 complete \u2713</span>' },
        { t: 10600, type: 'split-line', pane: 0, html: '<span class="wt-success">  \u25B8 frontend-agent: Task 4 complete \u2713</span>' },
        { t: 14200, type: 'split-line', pane: 0, html: '<span class="wt-success">  \u25B8 test-writer:    Task 5 complete \u2713</span>' },
        { t: 15000, type: 'split-line', pane: 0, html: '<span class="wt-break"> </span>' },
        { t: 15100, type: 'split-line', pane: 0, html: '<span class="wt-label">  Quality gate:</span>' },
        { t: 15800, type: 'split-line', pane: 0, html: '<span class="wt-muted">  \u25B8 Spec compliance:</span> <span class="wt-success">passed \u2713</span>' },
        { t: 16500, type: 'split-line', pane: 0, html: '<span class="wt-muted">  \u25B8 Code quality:</span>    <span class="wt-success">passed \u2713</span>' },
        { t: 17200, type: 'cursor' },
      ]
    },
    {
      id: 'review',
      label: 'Review',
      duration: 12000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:review</span>', typing: true },
        { t: 700, type: 'line', html: '<span class="wt-label">  \u25B8 Dispatching 7 specialists...</span>' },
        { t: 1400, type: 'break' },
        { t: 1600, type: 'line', html: '<span class="wt-muted">  \u25B8 security:</span>       <span class="wt-success">passed \u2713</span>' },
        { t: 2000, type: 'line', html: '<span class="wt-muted">  \u25B8 dead-code:</span>      <span class="wt-success">passed \u2713</span>' },
        { t: 2400, type: 'line', html: '<span class="wt-muted">  \u25B8 error-handling:</span>  <span class="wt-value">1 suggestion</span> <span class="wt-muted">(minor)</span>' },
        { t: 2800, type: 'line', html: '<span class="wt-muted">  \u25B8 async-safety:</span>   <span class="wt-success">passed \u2713</span>' },
        { t: 3200, type: 'line', html: '<span class="wt-muted">  \u25B8 performance:</span>    <span class="wt-success">passed \u2713</span>' },
        { t: 3600, type: 'line', html: '<span class="wt-muted">  \u25B8 test-coverage:</span>  <span class="wt-success">passed \u2713</span>' },
        { t: 4200, type: 'break' },
        { t: 4300, type: 'line', html: '<span class="wt-label">  Logic reviewer (opus):</span>' },
        { t: 4900, type: 'line', html: '<span class="wt-muted">  \u25B8 Tracing:</span> <span class="wt-value">createComment \u2192 Comment entity \u2192 CommentThread</span>' },
        { t: 5600, type: 'line', html: '<span class="wt-muted">  \u25B8 Checking:</span> <span class="wt-value">parentId nesting depth enforcement</span>' },
        { t: 6400, type: 'line', html: '<span class="wt-muted">  \u25B8 Finding:</span> <span class="wt-value">depth check at resolver only, not DB level</span>' },
        { t: 7200, type: 'line', html: '<span class="wt-muted">  \u25B8 Severity:</span> <span class="wt-value">minor \u2014 add CHECK constraint</span>' },
        { t: 7900, type: 'line', html: '<span class="wt-success">  \u25B8 Fix applied \u2713</span>' },
        { t: 8600, type: 'break' },
        { t: 8700, type: 'line', html: '<span class="wt-label">  \u25B8 Confidence:</span> <span class="wt-success">92%</span> <span class="wt-muted">\u2014 ready to ship</span>' },
        { t: 9400, type: 'cursor' },
      ]
    },
    {
      id: 'ship',
      label: 'Ship',
      duration: 12000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:pr-create</span>', typing: true },
        { t: 800, type: 'line', html: '<span class="wt-label">  \u25B8 Branch:</span>  <span class="wt-value">eng/comments-42-article-commenting</span>' },
        { t: 1200, type: 'line', html: '<span class="wt-label">  \u25B8 Commits:</span> <span class="wt-muted">8 (5 tasks + 3 review fixes)</span>' },
        { t: 1600, type: 'line', html: '<span class="wt-label">  \u25B8 PR #42:</span>  <span class="wt-value">Add article commenting system</span>' },
        { t: 2200, type: 'line', html: '<span class="wt-muted">  \u25B8 CI:</span> <span class="wt-success">all checks passing \u2713</span>' },
        { t: 2900, type: 'break' },
        { t: 3000, type: 'line', html: '<span class="wt-label">  Review feedback:</span>' },
        { t: 3500, type: 'line', html: '<span class="wt-muted">  \u25B8 @sarah:</span> <span class="wt-value">&ldquo;Can we add a loading skeleton?&rdquo;</span>' },
        { t: 4300, type: 'break' },
        { t: 4400, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:pr-respond</span>', typing: true },
        { t: 5200, type: 'line', html: '<span class="wt-label">  \u25B8 Analyzing comment...</span>' },
        { t: 5700, type: 'line', html: '<span class="wt-value">  \u25B8 Valid suggestion \u2014 implementing</span>' },
        { t: 6300, type: 'line', html: '<span class="wt-muted">  \u25B8 Added CommentSkeleton.tsx</span>' },
        { t: 7000, type: 'line', html: '<span class="wt-success">  \u25B8 Test passing \u2713</span>' },
        { t: 7500, type: 'line', html: '<span class="wt-success">  \u25B8 Committed + pushed \u2713</span>' },
        { t: 8000, type: 'line', html: '<span class="wt-success">  \u25B8 Replied + resolved \u2713</span>' },
        { t: 8700, type: 'break' },
        { t: 8800, type: 'line', html: '<span class="wt-success">  \u25B8 PR approved \u2713</span>' },
        { t: 9300, type: 'line', html: '<span class="wt-success">  \u25B8 Merged to main \u2713</span>' },
        { t: 9900, type: 'cursor' },
      ]
    },
    {
      id: 'learn',
      label: 'Learn',
      duration: 8000,
      layout: 'single',
      tabs: ['\u2217 Claude Code: Jig \u2318\u0031'],
      frames: [
        { t: 0, type: 'line', html: '<span class="wt-prompt">$</span> <span class="wt-cmd">/jig:postmortem</span>', typing: true },
        { t: 800, type: 'line', html: '<span class="wt-label">  \u25B8 Analyzing review feedback...</span>' },
        { t: 1500, type: 'break' },
        { t: 1600, type: 'line', html: '<span class="wt-label">  Patterns found:</span>' },
        { t: 2100, type: 'line', html: '<span class="wt-muted">  \u25B8 Loading states:</span> <span class="wt-value">reviewer caught missing skeleton</span>' },
        { t: 2600, type: 'line', html: '<span class="wt-muted">    \u2192 Gap:</span> <span class="wt-value">no loading-state specialist</span>' },
        { t: 3100, type: 'line', html: '<span class="wt-muted">    \u2192 Action:</span> <span class="wt-value">creating team/specialists/loading-states.md</span>' },
        { t: 3800, type: 'break' },
        { t: 3900, type: 'line', html: '<span class="wt-muted">  \u25B8 Defense in depth:</span> <span class="wt-value">logic reviewer caught DB constraint</span>' },
        { t: 4400, type: 'line', html: '<span class="wt-muted">    \u2192 Gap:</span> <span class="wt-value">resolver-only validation</span>' },
        { t: 4900, type: 'line', html: '<span class="wt-muted">    \u2192 Action:</span> <span class="wt-value">updating eng-testing skill</span>' },
        { t: 5600, type: 'break' },
        { t: 5700, type: 'line', html: '<span class="wt-success">  \u25B8 2 skills updated \u2713</span>' },
        { t: 6200, type: 'line', html: '<span class="wt-success">  \u25B8 Feedback loop closed \u2713</span>' },
        { t: 6800, type: 'cursor' },
      ]
    },
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
    playPauseBtn.addEventListener('click', () => {
      if (state === PLAYING) {
        transition('pause');
      } else if (state === PAUSED) {
        transition('play');
      }
    });
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

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        transition('close');
      }
    });
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
          // Set initial layout
          if (SECTIONS.length > 0 && SECTIONS[0].layout === 'split') {
            switchLayout('split');
          } else {
            switchLayout('single');
          }
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
          showReplayButton();
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
          switchLayout('single'); // S1 is always single
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
    updatePlayPauseIcon();
  }

  // ── Play/Pause Icon ───────────────────────────────────────
  function updatePlayPauseIcon() {
    const btn = controlsBar ? controlsBar.querySelector('.wt-ctrl-playpause') : null;
    if (!btn) return;

    if (state === PLAYING) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      btn.setAttribute('aria-label', 'Pause');
    } else {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
      btn.setAttribute('aria-label', 'Play');
    }
  }

  // ── Replay Button ─────────────────────────────────────────
  function showReplayButton() {
    if (!controlsBar) return;

    // Hide play/pause, show replay
    const ppBtn = controlsBar.querySelector('.wt-ctrl-playpause');
    if (ppBtn) ppBtn.style.display = 'none';

    const replayBtn = document.createElement('button');
    replayBtn.className = 'wt-ctrl-btn wt-ctrl-replay';
    replayBtn.setAttribute('aria-label', 'Replay walkthrough');
    replayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
    replayBtn.addEventListener('click', () => {
      // Remove replay button, restore play/pause
      replayBtn.remove();
      if (ppBtn) ppBtn.style.display = '';
      transition('replay');
    });

    controlsBar.insertBefore(replayBtn, controlsBar.firstChild);
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

      // Switch layout if needed
      const targetSection = SECTIONS[targetIndex];
      if (targetSection && targetSection.layout === 'split') {
        switchLayout('split');
      } else {
        switchLayout('single');
      }

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

    if (state === COMPLETE) {
      const label = controlsBar.querySelector('.wt-section-label');
      if (label) label.textContent = 'Complete \u2014 replay?';
      const fill = controlsBar.querySelector('.wt-overall-fill');
      if (fill) fill.style.width = '100%';
      return;
    }

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

  // ── Nav handler ───────────────────────────────────────────
  function handleNavClick(i) {
    if (i === engine.sectionIndex && state !== COMPLETE) return;
    if (state === SECTION_TRANSITION) return; // debounce during transitions

    if (state === PLAYING || state === PAUSED || state === COMPLETE) {
      transition('nav_to', i);
    }
  }

  // ── Keyboard Listener ─────────────────────────────────────
  function handleKeydown(e) {
    if (state === IDLE) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      transition('close');
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (state === PLAYING) {
        transition('pause');
      } else if (state === PAUSED) {
        transition('play');
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(engine.sectionIndex + 1, SECTIONS.length - 1);
      if (next !== engine.sectionIndex) {
        transition('nav_to', next);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(engine.sectionIndex - 1, 0);
      if (prev !== engine.sectionIndex) {
        transition('nav_to', prev);
      }
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const playBtn = document.querySelector('.wt-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => transition('play'));
    }

    // Auto-open on ?walkthrough query param
    if (window.location.search.indexOf('walkthrough') !== -1) {
      setTimeout(() => transition('play'), 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
