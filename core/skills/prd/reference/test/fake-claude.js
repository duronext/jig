/* A fake window.claude for testing live.js without a viewer: an in-memory
   document store with the db capability's surface (doc, collection, get, set,
   add, orderBy, limit, onSnapshot) and a minimal user capability.
   window.__jigTest exposes the store and failure switches to the driver. */
(function () {
  "use strict";
  var store = {}, listeners = [], seq = 0, failNext = {}, leases = {};
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function children(path) {
    return Object.keys(store).filter(function (k) { return k.indexOf(path + "/") === 0 && k.slice(path.length + 1).indexOf("/") < 0; }).sort();
  }
  function snapDoc(path) { var d = clone(store[path]); return { id: path.split("/").pop(), exists: d !== undefined,
    data: function () { return clone(d); }, metadata: { fromCache: false, hasPendingWrites: false } }; }
  /* Every call takes LAG ms, like a network round trip. Reads capture their
     snapshot when called; writes apply when they arrive. */
  var LAG = 10;
  function later(fn) { return new Promise(function (res, rej) { setTimeout(function () { try { res(fn()); } catch (e) { rej(e); } }, LAG); }); }
  function notify() { listeners.forEach(function (l) { setTimeout(l, 0); }); }
  function maybeFail(op) { if (failNext[op]) { var c = failNext[op]; delete failNext[op]; var e = new Error(c); e.code = c; throw e; } }
  function docRef(path) {
    return { id: path.split("/").pop(), path: path,
      get: function () { var snap = snapDoc(path); return later(function () { return snap; }); },
      set: function (d) { d = clone(d); return later(function () {
        var c = path.split("/")[0], f = failNext["set-after-write:" + c];
        if (f) { delete failNext["set-after-write:" + c]; store[path] = d; notify(); var e = new Error(f); e.code = f; throw e; }
        maybeFail("set:" + c); store[path] = d; notify(); }); },
      update: function (d) { d = clone(d); return later(function () { maybeFail("update:" + path.split("/")[0]);
        if (store[path] === undefined) { var e = new Error("missing"); e.code = "invalid_argument"; throw e; }
        var c = clone(store[path]); Object.keys(d).forEach(function (k) { c[k] = d[k]; }); store[path] = c; notify(); }); },
      delete: async function () { delete store[path]; notify(); },
      onSnapshot: function (next) { var l = function () { next(snapDoc(path)); }; listeners.push(l); setTimeout(l, 0); return function () {}; },
      acquire: function (o) { return later(function () {
        var l = leases[path], t = Date.now();
        if (l && l.holder !== o.holder && l.until > t) return { acquired: false, expiresAt: new Date(l.until).toISOString() };
        leases[path] = { holder: o.holder, until: t + (o.ttlMs || 30000) };
        return { acquired: true, version: 1, expiresAt: new Date(leases[path].until).toISOString(), holder: o.holder }; }); } };
  }
  function query(path, order, lim) {
    function run() {
      var docs = children(path).map(snapDoc);
      if (order) docs.sort(function (a, b) { var x = (a.data() || {})[order.f], y = (b.data() || {})[order.f];
        var r = x < y ? -1 : x > y ? 1 : 0; return order.dir === "desc" ? -r : r; });
      if (lim) docs = docs.slice(0, lim);
      return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
    }
    return { path: path,
      where: function () { return query(path, order, lim); },
      orderBy: function (f, dir) { return query(path, { f: f, dir: dir || "asc" }, lim); },
      limit: function (n) { return query(path, order, n); },
      get: async function () { return run(); },
      onSnapshot: function (next) { var l = function () { next(run()); }; listeners.push(l); setTimeout(l, 0); return function () {}; },
      doc: function (id) { return docRef(path + "/" + (id || "auto" + (++seq))); },
      add: function (d) { d = clone(d); return later(function () { maybeFail("add:" + path); var r = docRef(path + "/auto" + (++seq)); store[r.path] = d; notify(); return r; }); } };
  }
  var db = { doc: docRef, collection: function (p) { return query(p); } };
  var user = {
    me: async function () { return { id: "u_tester", name: "Test Person", avatarUrl: "", color: "#888", email: null, isOwner: true, canEdit: true }; },
    can: async function () { return true; },
    isOwner: async function () { return true; }, canEdit: async function () { return true; },
    profiles: async function (ids) { var o = {}; [].concat(ids).forEach(function (id) {
      o[id] = { id: id, name: id === "u_tester" ? "Test Person" : "", avatarUrl: "", color: "#888", email: null, isMe: id === "u_tester", guest: false }; }); return o; }
  };
  window.claude = { use: async function (name) { return name === "db" ? db : name === "user" ? user : null; } };
  window.__jigTest = { store: store, failNext: failNext, leases: leases, seed: function (path, d) { store[path] = clone(d); notify(); } };
})();
