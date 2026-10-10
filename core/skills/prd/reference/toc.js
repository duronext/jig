/* Jig page contents — a sticky sidebar on wide screens and a bottom sheet on
   narrow ones. Tracks the section and sub-part in view, and scrolls to any
   #anchor clicked anywhere on the page. Sections are `.sheet section[id]`;
   the label is the section's eyebrow, the number its `.sheetno`; sub-parts
   are any `[data-sub][id]` inside a section. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DATA = {}; try { DATA = JSON.parse(document.getElementById("prd-data").textContent); } catch (e) {}
  var toc = document.getElementById("toc"), drawer = document.getElementById("toc-drawer"),
      list2 = document.getElementById("toc-drawer-list"), fab = document.getElementById("toc-fab"),
      scrim = document.getElementById("toc-scrim"), closeBtn = document.getElementById("toc-close");
  if (!toc || !drawer) return;
  var items = [], total = 0, lastSec, lastSub;

  function collect() {
    var secs = Array.prototype.slice.call(document.querySelectorAll(".sheet section[id]"));
    total = document.querySelectorAll(".sheet section .sheetno").length;
    items = secs.map(function (sec) {
      var no = sec.querySelector(".sheetno"), eb = sec.querySelector(".sec-head .eyebrow");
      return { id: sec.id, n: no ? no.textContent.trim() : "", label: eb ? eb.textContent.trim() : sec.id,
        live: !!sec.querySelector("[data-live]"), el: sec,
        subs: Array.prototype.slice.call(sec.querySelectorAll("[data-sub][id]")).map(function (x) {
          return { id: x.id, label: x.getAttribute("data-sub"), el: x }; }) };
    });
  }
  function list() {
    var ol = document.createElement("ol");
    items.forEach(function (it) {
      var li = document.createElement("li"); li.setAttribute("data-for", it.id);
      var a = document.createElement("a"); a.href = "#" + it.id; a.setAttribute("data-target", it.id);
      var n = document.createElement("span"); n.className = "n"; n.textContent = it.n || "—";
      var l = document.createElement("span"); l.textContent = it.label;
      a.appendChild(n); a.appendChild(l);
      if (it.live) { var d = document.createElement("span"); d.className = "livedot"; d.title = "Live"; a.appendChild(d); }
      li.appendChild(a);
      if (it.subs.length) {
        var sub = document.createElement("ol"); sub.className = "subs";
        it.subs.forEach(function (s) { var sli = document.createElement("li"), sa = document.createElement("a");
          sa.href = "#" + s.id; sa.setAttribute("data-target", s.id); sa.textContent = s.label; sli.appendChild(sa); sub.appendChild(sli); });
        li.appendChild(sub);
      }
      ol.appendChild(li);
    });
    return ol;
  }
  var sig = null;
  function build() {
    collect();
    var next = items.map(function (it) { return it.id + ":" + it.subs.map(function (x) { return x.id; }).join(","); }).join("|");
    if (next === sig) return;
    sig = next;
    toc.textContent = "";
    var head = document.createElement("div"); head.className = "toc-head";
    head.innerHTML = '<svg aria-hidden="true"><use href="#clamp"/></svg>';
    var b = document.createElement("b"); b.textContent = DATA.title || document.title; head.appendChild(b);
    var sm = document.createElement("small"); sm.textContent = (DATA.kind || "PRD") + " · REV " + (DATA.rev || "A"); head.appendChild(sm);
    toc.appendChild(head); toc.appendChild(list());
    var foot = document.createElement("div"); foot.className = "toc-foot";
    foot.innerHTML = '<span id="toc-pos"></span><span class="track"><span class="fill" id="toc-fill"></span></span>';
    toc.appendChild(foot);
    list2.textContent = ""; list2.appendChild(list());
    lastSec = lastSub = undefined; spy();
  }

  function openDrawer() { drawer.hidden = false; scrim.hidden = false; fab.setAttribute("aria-expanded", "true");
    var on = drawer.querySelector("a.on"); (on || closeBtn).focus({ preventScroll: true }); if (on) on.scrollIntoView({ block: "center" }); }
  function closeDrawer() { drawer.hidden = true; scrim.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus({ preventScroll: true }); }
  fab.addEventListener("click", openDrawer); closeBtn.addEventListener("click", closeDrawer); scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) closeDrawer(); });

  function go(id) { var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    try { history.replaceState(null, "", "#" + id); } catch (e) {} }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href").slice(1); if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    if (!drawer.hidden) { drawer.hidden = true; scrim.hidden = true; fab.setAttribute("aria-expanded", "false"); }
    go(id);
  });

  function mark(kind, id) {
    document.querySelectorAll("a[data-target]").forEach(function (a) {
      if (a.closest(".subs") ? kind === "sub" : kind === "sec") a.classList.toggle("on", a.getAttribute("data-target") === id); });
  }
  function spy() {
    var line = Math.min(160, window.innerHeight * 0.3), cur = null;
    for (var i = 0; i < items.length; i++) { if (items[i].el.getBoundingClientRect().top - line <= 0) cur = items[i]; else break; }
    var secId = cur ? cur.id : null;
    if (secId !== lastSec) {
      lastSec = secId; mark("sec", secId);
      document.querySelectorAll("li[data-for]").forEach(function (li) { li.classList.toggle("open", li.getAttribute("data-for") === secId); });
      document.getElementById("fab-n").textContent = cur && cur.n ? cur.n : "00";
      document.getElementById("fab-l").textContent = cur ? cur.label : "Contents";
      var pos = document.getElementById("toc-pos"); if (pos) pos.textContent = "SHEET " + (cur && cur.n ? cur.n : "—") + " / " + total;
      var on = toc.querySelector('a.on[data-target="' + secId + '"]');
      if (on) { var r = on.getBoundingClientRect(), tr = toc.getBoundingClientRect();
        if (r.top < tr.top + 60 || r.bottom > tr.bottom - 60) toc.scrollTop += (r.top - tr.top) - tr.height / 3; }
    }
    var subId = null;
    if (cur) for (var j = 0; j < cur.subs.length; j++) if (cur.subs[j].el.getBoundingClientRect().top - line <= 0) subId = cur.subs[j].id;
    if (subId !== lastSub) { lastSub = subId; mark("sub", subId); }
    var max = document.documentElement.scrollHeight - window.innerHeight, fill = document.getElementById("toc-fill");
    if (fill) fill.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + "%";
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); } }
  window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
  var pending = null;
  document.addEventListener("jig:rendered", function () { clearTimeout(pending); pending = setTimeout(build, 50); });
  build();
  if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))) setTimeout(function () { go(location.hash.slice(1)); }, 80);
})();
