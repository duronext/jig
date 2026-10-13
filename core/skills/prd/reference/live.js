/* Jig live PRD — renders milestones, decisions, sign-offs, trace and log from
   #prd-data, then keeps them in sync with the artifact's shared database.
   Contract: framework/LIVE_PRD.md. Works without a database: the page renders
   from #prd-data and says "Not saving in this view". */
(function () {
  "use strict";
  var DATA = {};
  try { DATA = JSON.parse(document.getElementById("prd-data").textContent); } catch (e) { DATA = {}; }
  var REV = DATA.rev || "A";
  var MS = DATA.milestones || [], DEC = DATA.decisions || [], APPR = DATA.approvers || [], OUT = DATA.outcomes || [];
  var KIND = { milestone: "new", decision: "mk", approval: "ok", note: "ph", rev: "warn", review: "warn",
               spec: "new", plan: "new", build: "new", check: "ok", ship: "ok", learn: "ph", schedule: "mk" };
  var TRACE = { "not-started": ["bad", "not started"], built: ["warn", "built"], verified: ["ok", "verified"], deferred: ["ph", "deferred"] };

  var state = { ms: {}, dec: {}, appr: {}, trace: {}, sched: {}, log: [] };
  var db = null, user = null, meId = null, mode = "connecting", busy = {}, renderToken = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(iso) { var d = new Date(iso); if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function now() { return new Date().toISOString(); }
  function say(where, text) { var m = $('[data-msg="' + where + '"]'); if (m) m.textContent = text || ""; }
  function msTitle(id) { for (var i = 0; i < MS.length; i++) if (MS[i].id === id) return MS[i].title; return id; }
  function apprName(id) { for (var i = 0; i < APPR.length; i++) if (APPR[i].id === id) return APPR[i].name + ", " + APPR[i].role; return id; }
  function stamp(prefix, whoText, at) { var st = el("span", "stamped"); if (prefix) st.appendChild(document.createTextNode(prefix));
    st.appendChild(el("b", null, whoText)); st.appendChild(document.createTextNode(" · " + fmt(at))); return st; }
  function btn(label, cls, onClick) { var b = el("button", cls || "act", label); b.type = "button"; b.disabled = mode !== "live";
    b.addEventListener("click", onClick); return b; }

  function setLive() {
    $$("[data-live]").forEach(function (c) {
      c.classList.toggle("on", mode === "live");
      c.textContent = mode === "live" ? "Live · saves for everyone" : mode === "readonly" ? "Read only for you"
        : mode === "offline" ? "Not saving in this view" : "Connecting";
    });
    var f = $("#log-form"); if (f) $$("input,button", f).forEach(function (x) { x.disabled = mode !== "live"; });
  }

  async function names(ids) {
    var u = ids.filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    if (!user || !u.length) return {};
    try { return await user.profiles(u); } catch (e) { return {}; }
  }
  function who(ps, rec) {
    if (rec && rec.actor === "jig") return "Jig";
    var p = rec && rec.by ? ps[rec.by] : null;
    if (p && p.isMe) return "you";
    return (p && p.name) || "Someone";
  }

  async function render() {
    var token = ++renderToken, ids = [];
    ["ms", "dec", "appr", "trace", "sched"].forEach(function (k) { Object.keys(state[k]).forEach(function (id) { ids.push(state[k][id].by); }); });
    state.log.forEach(function (e) { ids.push(e.by); });
    var ps = await names(ids);
    if (token !== renderToken) return;
    paintMilestones(ps); paintDecisions(ps); paintApprovals(ps); paintTrace(ps); paintSchedule(ps); paintLog(ps);
    try { document.dispatchEvent(new CustomEvent("jig:rendered")); } catch (e) {}
  }

  /* ── milestones ─────────────────────────────────────────── */
  function paintMilestones(ps) {
    var box = $("#milestones"); if (!box) return;
    box.textContent = "";
    var done = 0, t = today();
    var prog = el("div", "progress"); prog.setAttribute("aria-live", "polite");
    var count = el("span"), track = el("span", "track"), fill = el("span", "fill");
    track.appendChild(fill); prog.appendChild(count); prog.appendChild(track); box.appendChild(prog);
    var list = el("div", "ms-list"); box.appendChild(list);
    MS.forEach(function (m) {
      var rec = state.ms[m.id], isDone = !!(rec && rec.done); if (isDone) done++;
      var row = el("div", "ms-row" + (isDone ? " done" : ""));
      var cb = el("input", "check"); cb.type = "checkbox"; cb.id = "ms-" + m.id; cb.checked = isDone;
      cb.disabled = mode !== "live"; cb.setAttribute("aria-label", "Mark " + m.title + " done");
      cb.addEventListener("change", function () { toggleMilestone(m.id, cb.checked); });
      var lab = el("label", "ms-t"); lab.htmlFor = cb.id;
      if (m.kind) lab.appendChild(el("span", "ms-kind", m.kind));
      lab.appendChild(el("b", null, m.title)); if (m.sub) lab.appendChild(el("small", null, m.sub));
      var due = dueOf(m), date = el("span", "ms-date", due || "");
      var cell = el("span", "ms-state");
      if (isDone) { cell.appendChild(el("span", "chip ok", "done")); cell.appendChild(stamp("", who(ps, rec), rec.at));
        if (rec.note) cell.appendChild(el("span", "stamped", rec.note)); }
      else if (due && due < t) cell.appendChild(el("span", "chip bad", "overdue"));
      else cell.appendChild(el("span", "chip ph", due ? "due " + due.slice(5) : "open"));
      row.appendChild(cb); row.appendChild(lab); row.appendChild(date); row.appendChild(cell); list.appendChild(row);
      var dia = $('[data-ms="' + m.id + '"]'); if (dia) dia.classList.toggle("ok", isDone);
    });
    count.textContent = done + " of " + MS.length + " done";
    fill.style.width = (MS.length ? done / MS.length * 100 : 0) + "%";
  }

  /* ── decisions ──────────────────────────────────────────── */
  function allDecisions() {
    var list = DEC.map(function (d) { return d; }), seen = {};
    DEC.forEach(function (d) { seen[d.id] = true; });
    Object.keys(state.dec).sort().forEach(function (id) {
      var r = state.dec[id];
      if (!seen[id] && r.question && r.options) {
        var opts = {}; Object.keys(r.options).forEach(function (k) { var o = r.options[k]; opts[k] = typeof o === "string" ? { label: o } : o; });
        list.push({ id: id, question: r.question, options: opts, recommended: r.recommended, why: r.why,
                    owner: r.owner, due: r.due, blocks: r.blocks, source: r.source });
      }
    });
    return list;
  }
  function paintDecisions(ps) {
    var box = $("#decision-cards"); if (!box) return;
    box.textContent = "";
    allDecisions().forEach(function (d) {
      var rec = state.dec[d.id] || {}, choice = rec.choice || null;
      var card = el("div", "decision" + (choice ? " is-decided" : "")); card.id = "dec-" + d.id; var q = d.question || d.id; card.setAttribute("data-sub", q.length > 34 ? q.slice(0, 32) + "…" : q);
      var h = el("div", "decision-h");
      h.appendChild(el("span", "chip " + (choice ? "ok" : "mk"), choice ? "Decided" : "Decide"));
      h.appendChild(el("h3", null, q)); card.appendChild(h);
      var opts = el("div", "options");
      Object.keys(d.options || {}).forEach(function (k) {
        var o = d.options[k], div = el("div", "opt" + (d.recommended === k ? " rec" : "") + (choice === k ? " chosen" : ""));
        div.appendChild(el("span", "eyebrow" + (d.recommended === k ? " ac" : ""), k + (d.recommended === k ? " · recommended" : "")));
        var body = el("span"); body.appendChild(el("b", null, o.label + ".")); if (o.why) body.appendChild(document.createTextNode(" " + o.why));
        div.appendChild(body);
        if (!choice) div.appendChild(btn("Choose " + k, "act", function () { decide(d, k); }));
        opts.appendChild(div);
      });
      card.appendChild(opts);
      if (choice) {
        var dd = el("div", "decided"), t = el("span"); t.appendChild(el("b", null, choice + " · " + (d.options[choice] ? d.options[choice].label : "")));
        dd.appendChild(t); dd.appendChild(stamp("recorded by ", who(ps, rec), rec.at));
        if (mode === "live") dd.appendChild(btn("Reopen", "act quiet", function () { decide(d, null); }));
        card.appendChild(dd);
      }
      var f = el("div", "decision-f");
      [["Owner", d.owner], ["Due", d.due], ["Blocks", d.blocks]].forEach(function (p) {
        if (!p[1]) return; var s = el("span", null, p[0] + " "); s.appendChild(el("b", null, p[1])); f.appendChild(s); });
      if (d.source) { var s2 = el("span", null, "Opened by "); s2.appendChild(el("b", null, "Jig · " + d.source)); f.appendChild(s2); }
      card.appendChild(f); box.appendChild(card);
    });
  }

  /* ── sign-off ───────────────────────────────────────────── */
  function paintApprovals(ps) {
    var body = $("#approvers"), signed = 0;
    if (body) body.textContent = "";
    APPR.forEach(function (a) {
      var rec = state.appr[a.id], current = !!(rec && rec.state === "approved" && rec.rev === REV);
      if (current) signed++;
      if (!body) return;
      var tr = el("tr"), td1 = el("td"), wc = el("div", "who-cell");
      wc.appendChild(el("span", "av", (a.name || "?").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase()));
      var nm = el("div"); nm.appendChild(el("b", null, a.name)); nm.appendChild(el("small", null, a.role)); wc.appendChild(nm);
      td1.appendChild(wc); tr.appendChild(td1); tr.appendChild(el("td", null, a.checks || ""));
      var td3 = el("td"), cell = el("div", "appr");
      if (current) {
        cell.appendChild(el("span", "chip ok", "signed rev " + REV)); cell.appendChild(stamp("by ", who(ps, rec), rec.at));
        if (mode === "live") cell.appendChild(btn("Withdraw", "act quiet", function () { approve(a.id, false); }));
      } else {
        if (rec && rec.state === "approved") cell.appendChild(el("span", "chip warn", "signed rev " + rec.rev + ", asks again"));
        cell.appendChild(btn("Record sign-off", "act", function () { approve(a.id, true); }));
      }
      td3.appendChild(cell); tr.appendChild(td3); body.appendChild(tr);
    });
    var tb = $("#tb-approved");
    if (tb && APPR.length) { tb.className = "stamp " + (signed === APPR.length ? "approved" : "review");
      tb.textContent = signed === APPR.length ? "Approved for spec" : signed + " of " + APPR.length; }
  }

  /* ── trace ──────────────────────────────────────────────── */
  function paintTrace(ps) {
    var body = $("#trace-rows"); if (!body) return;
    body.textContent = "";
    OUT.forEach(function (o) {
      var r = state.trace[o.id] || {}, st = TRACE[r.status] || TRACE["not-started"];
      var tr = el("tr"), c1 = el("td"); c1.appendChild(el("span", "id", o.id)); tr.appendChild(c1);
      tr.appendChild(el("td", "mono", (r.spec || o.spec || []).join(" · ") || "—"));
      tr.appendChild(el("td", "mono", (r.tasks || o.tasks || []).join(" · ") || "—"));
      var c4 = el("td"); c4.appendChild(el("span", "chip " + st[0], st[1])); tr.appendChild(c4);
      var c5 = el("td", null, r.proof || "—"); if (r.at) { c5.appendChild(el("br")); c5.appendChild(stamp("", who(ps, r), r.at)); }
      tr.appendChild(c5); body.appendChild(tr);
    });
  }

  /* ── schedule ───────────────────────────────────────────── */
  /* Bars in the week-by-week chart that carry data-bar can be changed by
     anyone who can save: drag the middle to move a bar, drag an end to
     stretch it, or use the arrow keys. A change is a draft until the person
     presses Save; then each changed bar saves to schedule/<id> and adds a log
     entry. The markup's own grid-column is the plan as written; a saved
     record overrides it. Weeks are counted from 0 at the first week column. */
  var GANTT = $(".gantt"), BARS = {}, pending = {}, drag = null, lastPs = {};
  var START = GANTT ? GANTT.getAttribute("data-start") : null;   // first day of the first week column, YYYY-MM-DD
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function weeks() { return GANTT ? $$(".wk", GANTT).length : 0; }
  if (GANTT && weeks()) GANTT.style.setProperty("--weeks", weeks());
  if (GANTT) $$("[data-bar]", GANTT).forEach(function (cell) {
    var m = /(\d+)\s*\/\s*(\d+)/.exec(cell.style.gridColumn || ""); if (!m) return;
    var lab = cell.previousElementSibling, id = cell.getAttribute("data-bar");
    if (cell.classList.contains("ms")) return;
    BARS[id] = { cell: cell, bar: $(".bar", cell), start: +m[1] - 2, end: +m[2] - 2,
      label: cell.getAttribute("data-label") || (lab && lab.classList.contains("lab") ? lab.textContent.trim() : id),
      times: $$("time[data-edge]", cell).map(function (t) { return { el: t, edge: t.getAttribute("data-edge"), day: t.getAttribute("datetime") }; }) };
  });
  /* Demo diamonds move a whole week at a time. Moving one moves its
     milestone's due date by the same number of weeks. */
  var DEMO = {};   // milestone id -> bar id
  if (GANTT) $$(".cell.ms", GANTT).forEach(function (cell) {
    var i = $("i[data-ms]", cell), m = /(\d+)\s*\/\s*(\d+)/.exec(cell.style.gridColumn || ""); if (!i || !m) return;
    var msId = i.getAttribute("data-ms"), id = cell.getAttribute("data-bar") || "demo-" + msId;
    cell.setAttribute("data-bar", id); DEMO[msId] = id;
    BARS[id] = { cell: cell, bar: i, start: +m[1] - 2, end: +m[2] - 2, demo: msId, label: msTitle(msId), times: [] };
  });
  function addWeeks(day, n) { if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
    var d = new Date(day + "T00:00:00"); d.setDate(d.getDate() + n * 7); return isoDay(d); }
  function shortDay(day) { var d = new Date(day + "T00:00:00"); return isNaN(d.getTime()) ? day : MON[d.getMonth()] + " " + d.getDate(); }
  function msDue(msId) { for (var i = 0; i < MS.length; i++) if (MS[i].id === msId) return MS[i].due; return null; }
  function dueOf(m) { var id = DEMO[m.id]; if (!id || !m.due) return m.due; return addWeeks(m.due, saved(id).start - BARS[id].start); }
  function demoDue(id, w) { return addWeeks(msDue(BARS[id].demo), w.start - BARS[id].start); }
  function changeText(id, w) { var b = BARS[id];
    if (b.demo) { var d = demoDue(id, w); return d ? "due " + shortDay(d) : "week of " + spanText(w.start, w.end).split(" – ")[0]; }
    return spanText(w.start, w.end); }
  function weekDate(i, plusDays) { var d = new Date(START + "T00:00:00"); d.setDate(d.getDate() + i * 7 + (plusDays || 0)); return d; }
  function isoDay(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function spanText(s, e) {
    if (START && !isNaN(weekDate(0).getTime())) { var a = weekDate(s), b = weekDate(e - 1, 6);
      return MON[a.getMonth()] + " " + a.getDate() + " – " + MON[b.getMonth()] + " " + b.getDate(); }
    var w = $$(".wk", GANTT); return "weeks of " + w[s].textContent.trim() + " – " + w[e - 1].textContent.trim();
  }
  function saved(id) {
    var r = state.sched[id], W = weeks();
    if (r && typeof r.startWeek === "number" && typeof r.endWeek === "number" && r.startWeek >= 0 && r.endWeek <= W && r.startWeek < r.endWeek)
      return { start: r.startWeek, end: r.endWeek };
    return { start: BARS[id].start, end: BARS[id].end };
  }
  function place(id) { return pending[id] || saved(id); }
  function paintSchedule(ps) {
    if (!GANTT || !Object.keys(BARS).length) return;
    lastPs = ps || lastPs;
    var can = mode === "live";
    if (!can) pending = {};
    GANTT.classList.toggle("editable", can);
    Object.keys(BARS).forEach(function (id) {
      var b = BARS[id], w = place(id), r = state.sched[id];
      b.cell.style.gridColumn = (w.start + 2) + " / " + (w.end + 2);
      if (!b.bar) return;
      b.bar.classList.toggle("draft", !!pending[id]);
      b.bar.classList.toggle("moved", !!r && !pending[id]);
      b.bar.title = r ? "Moved by " + who(lastPs, r) + " · " + fmt(r.at) : "";
      b.times.forEach(function (t) { var d = addWeeks(t.day, t.edge === "start" ? w.start - b.start : w.end - b.end);
        if (d && d !== t.el.getAttribute("datetime")) { t.el.setAttribute("datetime", d); t.el.textContent = shortDay(d); } });
      if (can) { b.bar.tabIndex = 0; b.bar.setAttribute("role", "button");
        b.bar.setAttribute("aria-label", (b.demo ? "Demo: " : "") + b.label + ", " + changeText(id, w) + (pending[id] ? ", not saved" : ""));
        b.bar.setAttribute("aria-describedby", "gantt-help"); }
      else { b.bar.removeAttribute("tabindex"); b.bar.removeAttribute("role"); b.bar.removeAttribute("aria-label"); b.bar.removeAttribute("aria-describedby"); }
    });
    var holder = GANTT.closest(".tscroll") || GANTT, tray = $("#gantt-pending");
    if (!tray) {
      var help = el("span", "sr-only", "Drag a bar to move it, or drag an end to change when it starts or finishes. With the keyboard: arrow keys move a week, Shift with an arrow changes the end, Alt with an arrow changes the start, Escape undoes. Then press Save.");
      help.id = "gantt-help"; holder.insertAdjacentElement("afterend", help);
      tray = el("div", "gantt-pending"); tray.id = "gantt-pending"; tray.setAttribute("aria-live", "polite");
      help.insertAdjacentElement("afterend", tray);
      var msg = el("div", "msg-line"); msg.setAttribute("data-msg", "sched"); tray.insertAdjacentElement("afterend", msg);
    }
    tray.textContent = "";
    var ids = Object.keys(pending); tray.hidden = !ids.length;
    if (!ids.length) return;
    tray.appendChild(el("span", "eyebrow mk", ids.length === 1 ? "1 unsaved change" : ids.length + " unsaved changes"));
    var list = el("ul");
    ids.forEach(function (id) { var p = pending[id], li = el("li");
      li.appendChild(el("b", null, (BARS[id].demo ? "Demo: " : "") + BARS[id].label)); li.appendChild(document.createTextNode(" " + changeText(id, p.base) + " → "));
      li.appendChild(el("span", "to", changeText(id, p))); list.appendChild(li); });
    tray.appendChild(list);
    var acts = el("div", "acts");
    acts.appendChild(btn("Save " + (ids.length === 1 ? "change" : "changes"), "act solid", saveSchedule));
    acts.appendChild(btn("Discard", "act quiet", function () { pending = {}; say("sched", ""); paintSchedule(); }));
    tray.appendChild(acts);
  }
  function setDraft(id, s, e, base, seenAt) {
    if (s === base.start && e === base.end) delete pending[id];
    else pending[id] = { start: s, end: e, base: base, seenAt: seenAt };
    paintSchedule();
  }
  function shift(id, zone, from, dw) {
    var W = weeks(), s = from.start, e = from.end;
    if (BARS[id].demo) zone = "move";
    if (zone === "move") { var len = e - s; s = Math.max(0, Math.min(W - len, s + dw)); e = s + len; }
    else if (zone === "start") s = Math.max(0, Math.min(e - 1, s + dw));
    else e = Math.max(s + 1, Math.min(W, e + dw));
    return { start: s, end: e };
  }
  function draftBase(id) { return pending[id] ? { base: pending[id].base, seenAt: pending[id].seenAt }
    : { base: saved(id), seenAt: (state.sched[id] || {}).at || null }; }
  function barAt(target) { var bar = target && target.closest ? target.closest(".bar, .ms i[data-ms]") : null, cell = bar && bar.parentElement;
    var id = cell && cell.getAttribute("data-bar"); return id && BARS[id] ? { id: id, bar: bar } : null; }
  function zoneAt(bar, x) { var r = bar.getBoundingClientRect(), edge = Math.min(10, r.width / 4);
    return x - r.left <= edge ? "start" : r.right - x <= edge ? "end" : "move"; }
  function colWidth() { var w = $$(".wk", GANTT); if (!w.length) return 60;
    return w.length > 1 ? w[1].getBoundingClientRect().left - w[0].getBoundingClientRect().left : w[0].getBoundingClientRect().width; }
  if (GANTT) {
    GANTT.addEventListener("pointerdown", function (ev) {
      if (mode !== "live" || ev.button > 0) return;
      var hit = barAt(ev.target); if (!hit) return;
      var b = draftBase(hit.id);
      drag = { id: hit.id, zone: zoneAt(hit.bar, ev.clientX), x0: ev.clientX, from: place(hit.id), cw: colWidth(), base: b.base, seenAt: b.seenAt };
      try { hit.bar.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
    });
    GANTT.addEventListener("pointermove", function (ev) {
      if (!drag) { var hit = mode === "live" && barAt(ev.target);
        if (hit) hit.bar.style.cursor = zoneAt(hit.bar, ev.clientX) === "move" ? "grab" : "ew-resize"; return; }
      var w = shift(drag.id, drag.zone, drag.from, Math.round((ev.clientX - drag.x0) / drag.cw));
      var cur = place(drag.id); if (w.start !== cur.start || w.end !== cur.end) setDraft(drag.id, w.start, w.end, drag.base, drag.seenAt);
    });
    var endDrag = function () { if (!drag) return; var id = drag.id; drag = null;
      var bar = BARS[id] && BARS[id].bar; if (bar && pending[id]) bar.focus({ preventScroll: true }); };
    GANTT.addEventListener("pointerup", endDrag); GANTT.addEventListener("pointercancel", endDrag);
    GANTT.addEventListener("keydown", function (ev) {
      if (mode !== "live") return;
      var hit = barAt(ev.target); if (!hit) return;
      if (ev.key === "Escape" && pending[hit.id]) { delete pending[hit.id]; paintSchedule(); ev.preventDefault(); return; }
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      var b = draftBase(hit.id), w = shift(hit.id, ev.shiftKey ? "end" : ev.altKey ? "start" : "move", place(hit.id), ev.key === "ArrowLeft" ? -1 : 1);
      setDraft(hit.id, w.start, w.end, b.base, b.seenAt); ev.preventDefault();
      var bar = BARS[hit.id].bar; if (bar) bar.focus();
    });
  }
  function saveSchedule() {
    return guarded("sched", "sched", async function () {
      var ids = Object.keys(pending);
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i], p = pending[id], rec = { startWeek: p.start, endWeek: p.end, at: now(), by: meId, actor: "person" };
        if (START) { rec.from = isoDay(weekDate(p.start)); rec.to = isoDay(weekDate(p.end - 1, 6)); }
        if (BARS[id].demo) { rec.milestone = BARS[id].demo; rec.due = demoDue(id, p) || null; }
        try { await merge("schedule/" + id, rec, p.seenAt); }
        catch (e) { if (e && e.code === "stale") delete pending[id]; throw e; }
        delete pending[id];
        await logAfter("sched", "schedule", BARS[id].demo
          ? "Moved the demo " + BARS[id].label + " from " + changeText(id, p.base) + " to " + changeText(id, p) + "."
          : "Moved " + BARS[id].label + " from " + spanText(p.base.start, p.base.end) + " to " + spanText(p.start, p.end) + ".", id);
      }
      paintSchedule();
    });
  }

  /* ── log ────────────────────────────────────────────────── */
  var JIG_FACE = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#clamp"/></svg>';
  function paintLog(ps) {
    var box = $("#log-items"); if (!box) return;
    box.textContent = "";
    if (!state.log.length) {
      var empty = el("div", "log-empty"); empty.appendChild(el("b", null, "Nothing logged yet."));
      empty.appendChild(el("span", null, "Tick a milestone, record a decision or add a note, and it shows up here with a name and a time. Jig adds entries as the spec, plan and build move along."));
      box.appendChild(empty); return;
    }
    state.log.forEach(function (e) {
      var row = el("div", "entry"), t = el("time", null, fmt(e.at)); t.setAttribute("datetime", e.at || ""); row.appendChild(t);
      var face = el("span", "face");
      if (e.actor === "jig") face.innerHTML = JIG_FACE;
      else { var p = e.by ? ps[e.by] : null; if (p && p.avatarUrl) { var img = el("img"); img.alt = ""; img.src = p.avatarUrl; face.appendChild(img); } }
      row.appendChild(face);
      var b = el("div", "entry-b"), h = el("div", "entry-h");
      h.appendChild(el("b", null, who(ps, e))); h.appendChild(el("span", "chip " + (KIND[e.kind] || "ph"), e.kind || "note"));
      if (e.example) h.appendChild(el("span", "ex", "example"));
      b.appendChild(h); b.appendChild(el("p", null, e.text || "")); row.appendChild(b); box.appendChild(row);
    });
  }

  /* ── writes ─────────────────────────────────────────────── */
  function fail(where, e) {
    if (e && (e.code === "not_granted" || e.code === "revoked")) { mode = "readonly"; setLive(); render();
      say(where, "This view can read the page but not save to it."); return; }
    if (e && e.code === "quota_exceeded") { say(where, "The page's storage is full, so new changes can't be saved."); return; }
    if (e && e.code === "invalid_argument") { say(where, "That change was too large or malformed to save."); return; }
    if (e && e.code === "busy") { say(where, "Someone else is changing this right now. Try again in a moment."); return; }
    if (e && e.code === "stale") { say(where, "Someone else just changed this. The page now shows their change."); return; }
    say(where, "That didn't save. Try again in a moment.");
  }
  /* One entry per action: the id is minted once, so a retry overwrites the
     same entry instead of adding a second one. */
  async function addLog(kind, text, ref, docRef) {
    await (docRef || db.collection("log").doc()).set({ at: now(), by: meId, actor: "person", kind: kind, text: text, ref: ref || null });
  }
  /* The page's database has no multi-document batch, so a change and its log
     entry are two writes. The change is the one that matters: if only the log
     entry fails, say so instead of claiming the change failed. */
  async function logAfter(where, kind, text, ref) {
    var entry = db.collection("log").doc();
    try { await addLog(kind, text, ref, entry); }
    catch (e) {
      if (e && e.code === "unavailable") {
        await new Promise(function (r) { setTimeout(r, 200 + Math.random() * 300); });
        try { await addLog(kind, text, ref, entry); return; } catch (e2) { e = e2; }
      }
      say(where, "Saved. The log entry for it did not save" + (e && e.code === "quota_exceeded" ? ": the page's storage is full." : "."));
    }
  }
  /* Merge fields on the server with update(), so a field another writer set
     (Jig's note on a milestone, a decision's question) survives a person's
     click even if it lands at the same moment. update() needs the document
     to exist; the first write to a new document uses set(). */
  /* Before writing, take a short lease on the record so two people cannot
     change the same item at once, and check the record still has the "at"
     the page last showed. If either fails, say so instead of overwriting.
     Jig's own writes are pinned with if_version, so they never overwrite
     a person's change either. */
  function conflict(code) { var e = new Error(code); e.code = code; return e; }
  /* Each open copy of the page holds leases under its own id, so two people,
     or one person in two tabs, never share a holder. */
  var SESSION = "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  async function merge(path, patch, seenAt) {
    var ref = db.doc(path);
    if (typeof ref.acquire === "function") {
      var lease = null;
      try { lease = await ref.acquire({ holder: SESSION, ttlMs: 5000 }); } catch (e) { lease = null; }
      if (lease && !lease.acquired) throw conflict("busy");
    }
    var cur = await ref.get(), curAt = cur.exists ? ((cur.data() || {}).at || null) : null;
    if ((seenAt || null) !== curAt) throw conflict("stale");
    if (!cur.exists) { await ref.set(patch); return; }
    try { await ref.update(patch); return; }
    catch (e) {
      if (!e || e.code !== "invalid_argument") throw e;
      if ((await ref.get()).exists) await ref.update(patch);   // another writer created it meanwhile
      else await ref.set(patch);
    }
  }
  async function guarded(key, where, fn) {
    if (busy[key] || mode !== "live") { render(); return; }
    busy[key] = true; say(where, "");
    try { await fn(); } catch (e) { fail(where, e); render(); }
    busy[key] = false;
  }
  function toggleMilestone(id, done) {
    return guarded("ms" + id, "ms", async function () {
      await merge("milestones/" + id, { done: done, at: now(), by: meId, actor: "person" }, (state.ms[id] || {}).at);
      await logAfter("ms", "milestone", (done ? "Ticked off: " : "Reopened: ") + msTitle(id), id);
    });
  }
  function decide(d, choice) {
    return guarded("d" + d.id, "dec", async function () {
      await merge("decisions/" + d.id, { choice: choice, at: now(), by: meId, actor: "person" }, (state.dec[d.id] || {}).at);
      await logAfter("dec", "decision", choice ? d.question + " Chose " + choice + ": " + d.options[choice].label + "." : d.question + " Reopened.", d.id);
    });
  }
  function approve(id, yes) {
    return guarded("a" + id, "appr", async function () {
      await merge("approvals/" + id, { state: yes ? "approved" : "withdrawn", rev: REV, at: now(), by: meId }, (state.appr[id] || {}).at);
      await logAfter("appr", "approval", (yes ? "Sign-off recorded for " : "Sign-off withdrawn for ") + apprName(id) + ", rev " + REV + ".", id);
    });
  }
  var form = $("#log-form");
  if (form) form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = $("input", form), text = (input.value || "").trim(); if (!text) return;
    guarded("note", "log", async function () { await addLog("note", text.slice(0, 280)); input.value = ""; });
  });

  /* ── boot ───────────────────────────────────────────────── */
  function watch(path, key, where) {
    db.collection(path).onSnapshot(function (snap) {
      var next = {}; snap.docs.forEach(function (d) { next[d.id] = d.data(); }); state[key] = next; render();
    }, function (e) { fail(where, e); });
  }
  setLive(); render();
  (async function start() {
    if (!window.claude || typeof window.claude.use !== "function") { mode = "offline"; setLive(); render(); return; }
    try { db = await window.claude.use("db"); } catch (e) { db = null; }
    if (!db) { mode = "offline"; setLive(); render(); return; }
    try { user = await window.claude.use("user"); } catch (e) { user = null; }
    mode = "live";
    if (user) {
      try { var me = await user.me(); meId = (me && me.id) || null; } catch (e) { meId = null; }
      try { if ((await user.can("data.write")) === false) mode = "readonly"; } catch (e) {}
    }
    setLive();
    watch("milestones", "ms", "ms"); watch("decisions", "dec", "dec"); watch("approvals", "appr", "appr"); watch("trace", "trace", "trace");
    if (Object.keys(BARS).length) watch("schedule", "sched", "sched");
    db.collection("log").orderBy("at", "desc").limit(150).onSnapshot(function (snap) {
      state.log = snap.docs.map(function (d) { return d.data(); }); render();
    }, function (e) { fail("log", e); });
    render();
  })();
})();
