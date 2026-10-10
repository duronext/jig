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
               spec: "new", plan: "new", build: "new", check: "ok", ship: "ok", learn: "ph" };
  var TRACE = { "not-started": ["bad", "not started"], built: ["warn", "built"], verified: ["ok", "verified"], deferred: ["ph", "deferred"] };

  var state = { ms: {}, dec: {}, appr: {}, trace: {}, log: [] };
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
    ["ms", "dec", "appr", "trace"].forEach(function (k) { Object.keys(state[k]).forEach(function (id) { ids.push(state[k][id].by); }); });
    state.log.forEach(function (e) { ids.push(e.by); });
    var ps = await names(ids);
    if (token !== renderToken) return;
    paintMilestones(ps); paintDecisions(ps); paintApprovals(ps); paintTrace(ps); paintLog(ps);
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
      var date = el("span", "ms-date", m.due || "");
      var cell = el("span", "ms-state");
      if (isDone) { cell.appendChild(el("span", "chip ok", "done")); cell.appendChild(stamp("", who(ps, rec), rec.at));
        if (rec.note) cell.appendChild(el("span", "stamped", rec.note)); }
      else if (m.due && m.due < t) cell.appendChild(el("span", "chip bad", "overdue"));
      else cell.appendChild(el("span", "chip ph", m.due ? "due " + m.due.slice(5) : "open"));
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
  async function merge(path, patch, seenAt) {
    var ref = db.doc(path);
    if (typeof ref.acquire === "function") {
      var lease = null;
      try { lease = await ref.acquire({ holder: meId || "page", ttlMs: 5000 }); } catch (e) { lease = null; }
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
    db.collection("log").orderBy("at", "desc").limit(150).onSnapshot(function (snap) {
      state.log = snap.docs.map(function (d) { return d.data(); }); render();
    }, function (e) { fail("log", e); });
    render();
  })();
})();
