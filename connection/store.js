// Servers data layer. Every page talks to servers ONLY through window.SMOO_DB,
// so replacing localStorage by your real backend (Supabase...) = rewriting this one file.
// For now everything is saved in this browser, so sharing works between accounts of the same browser.
(function () {
  "use strict";
  var S = window.SMOO;
  var KEY = "smoo-servers-db";
  var MAX_OWNED = S.MAX_SERVERS;
  var MAX_PLAYERS_LIMIT = 16;   // change this number if your host allows more players

  /* The editable categories. "section"/"name" match the keys of the SMOO settings.json.
     Address and Port are readonly, and the Discord section is not exposed on purpose. */
  var CATS = [
    { key: "server", title: "Server", section: "Server", fields: [
      { name: "Address", type: "readonly", label: "Address", hint: "Set by the host. You can't change it." },
      { name: "Port", type: "readonly", label: "Port", hint: "Set by the host. You can't change it." },
      { name: "MaxPlayers", type: "int", label: "Max players", min: 1, max: MAX_PLAYERS_LIMIT }
    ] },
    { key: "flip", title: "Flip", section: "Flip", fields: [
      { name: "Enabled", type: "bool", label: "Enabled" },
      { name: "Pov", type: "select", label: "Point of view", options: ["both", "player", "other"] },
      { name: "Players", type: "list", kind: "player", label: "Players", placeholder: "Player name or ID" }
    ] },
    { key: "scenario", title: "Scenario", section: "Scenario", fields: [
      { name: "MergeEnabled", type: "bool", label: "Merge enabled" }
    ] },
    { key: "banlist", title: "Ban list", section: "BanList", fields: [
      { name: "Enabled", type: "bool", label: "Enabled" },
      { name: "Players", type: "list", kind: "player", label: "Players", placeholder: "Player name or ID" },
      { name: "IpAddresses", type: "list", kind: "ip", label: "IP addresses", placeholder: "1.2.3.4" },
      { name: "Stages", type: "list", kind: "stage", label: "Stages", placeholder: "Stage name" }
    ] },
    { key: "shines", title: "Shines", section: "Shines", fields: [
      { name: "Enabled", type: "bool", label: "Enabled" }
    ] },
    { key: "persist", title: "Persist shines", section: "PersistShines", fields: [
      { name: "Enabled", type: "bool", label: "Enabled" },
      { name: "Filename", type: "text", label: "File name", placeholder: "./moons.json", pattern: /^\.\/[A-Za-z0-9_\-]{1,32}\.json$/, error: "Use a file name like ./moons.json" }
    ] }
  ];

  function defaults(port) {
    return {
      Server: { Address: "0.0.0.0", Port: port, MaxPlayers: 8 },
      Flip: { Enabled: true, Players: [], Pov: "both" },
      Scenario: { MergeEnabled: false },
      BanList: { Enabled: false, Players: [], IpAddresses: [], Stages: [] },
      Shines: { Enabled: true },
      PersistShines: { Enabled: false, Filename: "./moons.json" }
    };
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function me() {
    return S.user ? { id: S.user.id, email: (S.user.email || "").toLowerCase() } : { id: "dev", email: "guest@dev.local" };
  }
  // Servers live in the Supabase table "servers" (see supabase.sql). The page loads them once
  // into this cache (load()), reads are instant, and every change is also sent to Supabase.
  var cache = [], db = S.client;
  function toRow(s) {
    return { id: s.id, owner_id: s.owner.id, owner_email: s.owner.email, name: s.name, created: s.created,
             data: { settings: s.settings, access: s.access } };
  }
  function fromRow(r) {
    var d = r.data || {};
    return { id: r.id, name: r.name, created: Number(r.created), owner: { id: r.owner_id, email: r.owner_email },
             settings: d.settings || {}, access: d.access || [],
             status: r.status || "offline", address: r.address || "", last_seen: r.last_seen || null };
  }
  function randKey() {
    var a = new Uint8Array(24), h = "";
    crypto.getRandomValues(a);
    a.forEach(function (b) { h += ("0" + b.toString(16)).slice(-2); });
    return "smoo_" + h;
  }
  function newKey(id) {   // owner only (RLS). Resolves to the key, or null.
    var k = randKey();
    if (!db) return Promise.resolve(null);
    return db.from("server_keys").upsert({ server_id: id, key: k }).then(function (r) { return r.error ? null : k; }, function () { return null; });
  }
  function fail() { S.toast("Couldn't sync with the server. Check your connection."); }
  function done(r) { if (r && r.error) fail(); }
  function read() { return cache; }
  function saveRemote(s) {
    if (db) db.from("servers").update({ name: s.name, data: { settings: s.settings, access: s.access } }).eq("id", s.id).then(done, fail);
  }
  function nextPort(all) {
    var used = {};
    all.forEach(function (s) { if (s.settings && s.settings.Server) used[s.settings.Server.Port] = true; });
    var p = 1027;
    while (used[p]) p++;
    return p;
  }

  // Fill anything missing so older saved servers keep working when fields are added.
  function fix(s) {
    s.access = Array.isArray(s.access) ? s.access : [];
    var d = defaults(1027);
    if (!s.settings || typeof s.settings !== "object") s.settings = {};
    Object.keys(d).forEach(function (sec) {
      var cur = s.settings[sec];
      if (!cur || typeof cur !== "object") cur = {};
      Object.keys(d[sec]).forEach(function (k) {
        if (typeof cur[k] !== typeof d[sec][k] || Array.isArray(cur[k]) !== Array.isArray(d[sec][k])) cur[k] = d[sec][k];
      });
      s.settings[sec] = cur;
    });
    return s;
  }

  // What the current person can do on this server (null = no access at all).
  function perms(s) {
    var m = me(), edit = {};
    if (s.owner && s.owner.id === m.id) {
      CATS.forEach(function (c) { edit[c.key] = true; });
      return { owner: true, start: true, access: true, edit: edit };
    }
    var a = null;
    s.access.forEach(function (x) { if (x.email === m.email) a = x; });
    if (!a) return null;
    CATS.forEach(function (c) { edit[c.key] = !!(a.edit && a.edit[c.key]); });
    return { owner: false, start: !!a.start, access: !!a.access, edit: edit };
  }

  window.SMOO_DB = {
    CATS: CATS, MAX_OWNED: MAX_OWNED, MAX_PLAYERS_LIMIT: MAX_PLAYERS_LIMIT,
    me: me, perms: perms,

    // Owned servers first, then the ones shared with me.
    list: function () {
      var out = [];
      read().forEach(function (s) {
        fix(s);
        var p = perms(s);
        if (p) out.push({ server: s, perms: p });
      });
      out.sort(function (a, b) {
        if (a.perms.owner !== b.perms.owner) return a.perms.owner ? -1 : 1;
        return a.server.created - b.server.created;
      });
      return out;
    },
    get: function (id) {
      var found = null;
      read().forEach(function (s) { if (s.id === id) found = fix(s); });
      return found;
    },
    newKey: newKey,
    getKey: function (id) {
      if (!db) return Promise.resolve(null);
      return db.from("server_keys").select("key").eq("server_id", id).maybeSingle().then(function (r) { return r.data ? r.data.key : null; }, function () { return null; });
    },
    load: function () {
      if (!db || !S.user) return Promise.resolve();
      return db.from("servers").select("*").then(function (r) {
        if (r.error) { fail(); return; }
        cache = (r.data || []).map(fromRow);
      }, fail);
    },
    create: function (name) {
      var all = read(), m = me(), owned = all.filter(function (s) { return s.owner && s.owner.id === m.id; });
      if (owned.length >= MAX_OWNED) return { error: "You reached the limit of " + MAX_OWNED + " servers." };
      if (owned.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) return { error: "You already have a server with this name." };
      var s = { id: uid(), name: name, created: Date.now(), owner: m, settings: defaults(nextPort(all)), access: [] };
      all.push(s);
      if (db) db.from("servers").insert(toRow(s)).then(function (r) {
        if (r && r.error) { cache = cache.filter(function (x) { return x.id !== s.id; }); fail(); return; }
        newKey(s.id);
      }, fail);
      return { server: s };
    },
    save: function (server) {
      var all = read(), done = false;
      for (var i = 0; i < all.length; i++) if (all[i].id === server.id) { all[i] = server; done = true; }
      if (done) saveRemote(server);
      return done;
    },
    remove: function (id) {   // owner only
      var m = me(), all = read();
      var next = all.filter(function (s) { return !(s.id === id && s.owner && s.owner.id === m.id); });
      if (next.length === all.length) return false;
      cache = next;
      if (db) db.from("servers").delete().eq("id", id).then(done, fail);
      return true;
    },
    leave: function (id) {    // drop my own access
      var m = me(), all = read();
      var left = null;
      all.forEach(function (s) { if (s.id === id) { s.access = (s.access || []).filter(function (a) { return a.email !== m.email; }); left = s; } });
      if (left) { saveRemote(left); cache = cache.filter(function (x) { return x.id !== id; }); }
      return !!left;
    }
  };
})();
