/* Drives the assembled page like a person would, then writes PASS/FAIL lines
   into a results block (id test-results) for run.sh to read. */
(function () {
  "use strict";
  var T = window.__jigTest, results = [], $ = function (s) { return document.querySelector(s); };
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function check(name, ok, detail) { results.push((ok ? "PASS " : "FAIL ") + name + (ok || !detail ? "" : " :: " + detail)); }
  function logTexts() { return Object.keys(T.store).filter(function (k) { return k.indexOf("log/") === 0; }).map(function (k) { return T.store[k].text; }); }
  function click(el) { if (!el) return false; el.click(); return true; }
  function btnIn(root, label) { return Array.prototype.slice.call((root || document).querySelectorAll("button")).filter(function (b) { return b.textContent.trim() === label; })[0]; }

  async function run() {
    T.seed("milestones/m3", { done: true, at: "2026-11-14T18:02:00Z", by: null, actor: "jig", note: "Tasks 4-9 passed review" });
    await wait(400);
    check("goes live with a database", /Live/.test(($("[data-live]") || {}).textContent || ""), ($("[data-live]") || {}).textContent);
    check("renders Jig's milestone note", /Tasks 4-9 passed review/.test($("#milestones").textContent));

    click($("#ms-m1")); await wait(200);
    check("ticking saves the milestone", T.store["milestones/m1"] && T.store["milestones/m1"].done === true && T.store["milestones/m1"].by === "u_tester");
    check("ticking writes a log entry", logTexts().some(function (t) { return /Ticked off: PRD approved/.test(t); }), JSON.stringify(logTexts()));

    click($("#ms-m3")); await wait(200);
    var m3 = T.store["milestones/m3"];
    T.seed("milestones/m5", { done: false, at: "2026-11-30T00:00:00Z", by: null, actor: "jig", note: "Beta report drafted" });
    await wait(150);
    click($("#ms-m5"));
    setTimeout(function () { T.store["milestones/m5"].owner = "set-by-jig-mid-click"; }, 5);
    await wait(200);
    check("a write landing mid-click is kept", T.store["milestones/m5"].done === true && T.store["milestones/m5"].owner === "set-by-jig-mid-click" && T.store["milestones/m5"].note === "Beta report drafted", JSON.stringify(T.store["milestones/m5"]));
    check("reopening keeps Jig's note", m3 && m3.done === false && m3.note === "Tasks 4-9 passed review", JSON.stringify(m3));

    click(btnIn($("#dec-d1"), "Choose A")); await wait(200);
    check("choosing records the decision", T.store["decisions/d1"] && T.store["decisions/d1"].choice === "A");
    check("decided card shows who and when", $("#dec-d1").classList.contains("is-decided") && /recorded by/.test($("#dec-d1").textContent));

    click(btnIn($("#dec-d1"), "Reopen")); await wait(200);
    check("reopening clears the choice", T.store["decisions/d1"].choice === null);

    T.seed("decisions/d9", { question: "Should beta customers get a heads-up email?", options: { A: "Yes, a week before", B: "No" },
      recommended: "A", owner: "Maya", due: "2026-11-10", source: "spec", choice: null, actor: "jig", by: null, at: "2026-10-12T10:00:00Z" });
    await wait(200);
    check("a decision Jig opens appears as a card", !!$("#dec-d9") && /heads-up email/.test($("#dec-d9").textContent));
    click(btnIn($("#dec-d9"), "Choose B")); await wait(200);
    check("choosing keeps Jig's question", T.store["decisions/d9"].choice === "B" && /heads-up/.test(T.store["decisions/d9"].question));

    click(btnIn($("#approvers"), "Record sign-off")); await wait(200);
    check("first sign-off saves for the current rev", T.store["approvals/finance"] && T.store["approvals/finance"].state === "approved" && T.store["approvals/finance"].rev === "C");
    check("title block counts sign-offs", /1 of 3/.test($("#tb-approved").textContent), $("#tb-approved").textContent);
    click(btnIn($("#approvers"), "Record sign-off")); await wait(200);
    click(btnIn($("#approvers"), "Record sign-off")); await wait(200);
    check("all sign-offs stamp the page approved", /Approved for spec/.test($("#tb-approved").textContent), $("#tb-approved").textContent);

    T.seed("approvals/eng", { state: "approved", rev: "B", at: "2026-10-01T00:00:00Z", by: "u_other" }); await wait(200);
    check("an old rev's sign-off asks again", /asks again/.test($("#approvers").textContent) && /2 of 3/.test($("#tb-approved").textContent), $("#tb-approved").textContent);

    $("#log-form input").value = "Finance agreed to 1, 3, 7 on the call";
    $("#log-form").dispatchEvent(new Event("submit", { cancelable: true })); await wait(200);
    check("a note lands in the log", logTexts().indexOf("Finance agreed to 1, 3, 7 on the call") >= 0);
    check("the log renders newest first", /Finance agreed/.test(($("#log-items .entry") || {}).textContent || ""));

    T.failNext["set:log"] = "quota_exceeded";
    click($("#ms-m2")); await wait(200);
    check("a log-only failure keeps the change", T.store["milestones/m2"] && T.store["milestones/m2"].done === true);
    check("a log-only failure says the change saved", /^Saved\./.test(($('[data-msg="ms"]') || {}).textContent || ""), ($('[data-msg="ms"]') || {}).textContent);

    var before = logTexts().length;
    T.failNext["set-after-write:log"] = "unavailable";
    click($("#ms-m6")); await wait(1000);
    var m6Logs = logTexts().filter(function (t) { return /On for everyone/.test(t); }).length;
    check("a retried log write is not duplicated", m6Logs === 1 && logTexts().length === before + 1, m6Logs + " entries");

    T.leases["decisions/d1"] = { holder: "u_other", until: Date.now() + 60000 };
    click(btnIn($("#dec-d1"), "Choose B")); await wait(200);
    check("a record someone else is changing is not written", T.store["decisions/d1"].choice === null && /Someone else is changing this/.test(($('[data-msg="dec"]') || {}).textContent || ""), ($('[data-msg="dec"]') || {}).textContent);
    delete T.leases["decisions/d1"];
    T.leases["decisions/d1"] = { holder: "u_tester", until: Date.now() + 60000 };   // the same person, in another tab
    click(btnIn($("#dec-d1"), "Choose B")); await wait(200);
    check("the same person in another tab is also kept out", T.store["decisions/d1"].choice === null && /Someone else is changing this/.test(($('[data-msg="dec"]') || {}).textContent || ""));
    delete T.leases["decisions/d1"];

    T.store["approvals/eng"] = { state: "withdrawn", rev: "B", at: "2026-12-01T00:00:00Z", by: "u_other" };   // changed without the page seeing it yet
    click(btnIn($("#approvers"), "Record sign-off")); await wait(200);
    check("a change made since the page last showed it is not overwritten", T.store["approvals/eng"].by === "u_other" && T.store["approvals/eng"].state === "withdrawn" && /Someone else just changed this/.test(($('[data-msg="appr"]') || {}).textContent || ""), JSON.stringify(T.store["approvals/eng"]));

    T.failNext["set:milestones"] = "unavailable";
    click($("#ms-m4")); await wait(200);
    check("a failed change is reported", /didn't save/.test(($('[data-msg="ms"]') || {}).textContent || ""));
    check("a failed change leaves the box unticked", !$("#ms-m4").checked && !T.store["milestones/m4"]);

    T.seed("trace/MVP.1", { status: "verified", proof: "Paid 22 s after saving a card", actor: "jig", by: null, at: "2026-11-20T00:00:00Z" });
    await wait(200);
    check("trace shows verified with proof", /verified/.test($("#trace-rows").textContent) && /22 s/.test($("#trace-rows").textContent));
    check("unchecked outcomes show no proof", /\u2014/.test($("#trace-rows").textContent));

    T.seed("log/xss", { at: "2026-12-31T00:00:00Z", by: null, actor: "person", kind: "note", text: "<img src=x onerror=window.__pwned=1>" });
    await wait(200);
    check("log text is not parsed as HTML", !window.__pwned && !document.querySelector("#log-items img[src='x']"));

    /* schedule: drag, keyboard, confirm, save, log */
    var cellB = $('[data-bar="build-mvp"]'), barB = cellB && cellB.querySelector(".bar");
    check("chart bars are editable for someone who can save", $(".gantt").classList.contains("editable") && barB && barB.tabIndex === 0);
    function wk(i) { return document.querySelectorAll(".gantt .wk")[i].getBoundingClientRect(); }
    function pdrag(bar, fromX, toX) {
      var r = bar.getBoundingClientRect(), y = r.top + r.height / 2, o = { bubbles: true, pointerId: 7, button: 0, clientY: y };
      bar.dispatchEvent(new PointerEvent("pointerdown", Object.assign({ clientX: fromX }, o)));
      bar.dispatchEvent(new PointerEvent("pointermove", Object.assign({ clientX: toX }, o)));
      bar.dispatchEvent(new PointerEvent("pointerup", Object.assign({ clientX: toX }, o)));
    }
    var colW = wk(1).left - wk(0).left, rB = barB.getBoundingClientRect();
    pdrag(barB, rB.left + rB.width / 2, rB.left + rB.width / 2 + colW); await wait(100);
    check("dragging a bar moves it a week as a draft", cellB.style.gridColumn.replace(/ /g, "") === "4/8" && !T.store["schedule/build-mvp"], cellB.style.gridColumn);
    check("a draft shows the change and a Save button", !$("#gantt-pending").hidden && /Oct 20 – Nov 16 → Oct 27 – Nov 23/.test($("#gantt-pending").textContent) && !!btnIn($("#gantt-pending"), "Save change"), $("#gantt-pending").textContent);
    click(btnIn($("#gantt-pending"), "Save change")); await wait(300);
    var sb = T.store["schedule/build-mvp"] || {};
    check("saving writes the new weeks", sb.startWeek === 2 && sb.endWeek === 6 && sb.from === "2026-10-27" && sb.to === "2026-11-23" && sb.by === "u_tester", JSON.stringify(sb));
    check("saving logs the move", logTexts().some(function (t) { return t === "Moved Build the MVP from Oct 20 – Nov 16 to Oct 27 – Nov 23."; }), JSON.stringify(logTexts().slice(-2)));
    check("the tray closes after saving", $("#gantt-pending").hidden);

    var barE = $('[data-bar="beta"] .bar'), rE = barE.getBoundingClientRect();
    pdrag(barE, rE.right - 3, rE.right - 3 + colW); await wait(100);
    check("dragging an end stretches the bar", $('[data-bar="beta"]').style.gridColumn.replace(/ /g, "") === "7/10", $('[data-bar="beta"]').style.gridColumn);
    click(btnIn($("#gantt-pending"), "Discard")); await wait(100);
    check("discarding puts the bar back without saving", $('[data-bar="beta"]').style.gridColumn.replace(/ /g, "") === "7/9" && !T.store["schedule/beta"]);

    barE.focus();
    barE.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true, bubbles: true })); await wait(50);
    check("Alt+arrow moves the start a week", $('[data-bar="beta"]').style.gridColumn.replace(/ /g, "") === "6/9", $('[data-bar="beta"]').style.gridColumn);
    barE.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(50);
    check("Escape undoes a draft", $('[data-bar="beta"]').style.gridColumn.replace(/ /g, "") === "7/9" && $("#gantt-pending").hidden);

    var barP = $('[data-bar="prd-spec"] .bar'); barP.focus();
    barP.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); await wait(50);
    check("a bar can't move before the first week", $('[data-bar="prd-spec"]').style.gridColumn.replace(/ /g, "") === "2/4" && $("#gantt-pending").hidden);

    barE.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })); await wait(50);
    T.store["schedule/beta"] = { startWeek: 6, endWeek: 9, at: "2026-12-02T00:00:00Z", by: "u_other", actor: "person" };   // saved elsewhere, not yet seen
    click(btnIn($("#gantt-pending"), "Save change")); await wait(300);
    check("a move someone else just saved is not overwritten", T.store["schedule/beta"].by === "u_other" && /Someone else just changed this/.test(($('[data-msg="sched"]') || {}).textContent || ""), JSON.stringify(T.store["schedule/beta"]));

    T.seed("schedule/everyone", { startWeek: 7, endWeek: 9, at: "2026-12-03T00:00:00Z", by: null, actor: "jig" }); await wait(200);
    check("a saved move from elsewhere redraws the bar", $('[data-bar="everyone"]').style.gridColumn.replace(/ /g, "") === "9/11", $('[data-bar="everyone"]').style.gridColumn);

    /* demo diamonds and dated bar text */
    var barT = $('[data-bar="prd-spec"] .bar'), tm = barT.querySelector("time"); barT.focus();
    barT.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true })); await wait(50);
    check("a date in a bar's text follows its end", tm.textContent === "Oct 31" && tm.getAttribute("datetime") === "2026-10-31", tm.textContent);
    barT.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(50);
    check("undoing puts the date back", tm.textContent === "Oct 24", tm.textContent);

    var dia = $('[data-ms="m3"]');
    check("demo diamonds are draggable", dia.tabIndex === 0 && dia.parentElement.getAttribute("data-bar") === "demo-m3");
    var rD = dia.getBoundingClientRect();
    pdrag(dia, rD.left + 6, rD.left + 6 + colW); await wait(100);
    check("a moved demo shows its new due date as a draft", /Demo: Retry works on staging due Nov 14 → due Nov 21/.test($("#gantt-pending").textContent), $("#gantt-pending").textContent);
    click(btnIn($("#gantt-pending"), "Save change")); await wait(300);
    var sd = T.store["schedule/demo-m3"] || {};
    check("saving a demo writes its week and due date", sd.startWeek === 5 && sd.due === "2026-11-21" && sd.milestone === "m3", JSON.stringify(sd));
    check("saving a demo logs it", logTexts().indexOf("Moved the demo Retry works on staging from due Nov 14 to due Nov 21.") >= 0, JSON.stringify(logTexts().slice(-2)));
    check("the milestone list shows the moved due date", /2026-11-21/.test($("#milestones").textContent) && !/2026-11-14/.test($("#milestones").textContent));

    check("contents sidebar lists the live sections", document.querySelectorAll("#toc .livedot").length >= 4);

    var pre = document.createElement("pre"); pre.id = "test-results"; pre.textContent = results.join("\n");
    document.body.appendChild(pre);
  }
  run().catch(function (e) { var pre = document.createElement("pre"); pre.id = "test-results"; pre.textContent = results.concat("FAIL driver crashed :: " + e).join("\n"); document.body.appendChild(pre); });
})();
