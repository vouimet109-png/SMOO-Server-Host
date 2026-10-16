// Shared by dashboard / profils / settings: login guard, top bar, account menu, profile storage.
// All pages live in a sub folder, so the site root is "../".
(function () {
  "use strict";

  var ROOT = "../";
  var cfg = window.SMO_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  var configured =
    cfg.supabaseUrl && cfg.supabaseAnonKey &&
    cfg.supabaseUrl.indexOf("YOUR_") !== 0 && cfg.supabaseAnonKey.indexOf("YOUR_") !== 0;
  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
  var devSkip = false;
  try { devSkip = sessionStorage.getItem("smo-dev-skip") === "1"; } catch (e) {}

  var S = window.SMOO = { client: client, user: null, root: ROOT, MAX_SERVERS: 1000 };

  /* ---------- helpers ---------- */
  S.id = function () { return S.user ? S.user.id : "dev"; };
  S.serversKey = function () { return "smoo-servers:" + S.id(); };

  var tt;
  S.toast = function (text) {
    var t = $("toast");
    t.textContent = text; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 2600);
  };

  /* ---------- profile + directory (Supabase table "profiles") ---------- */
  var mine = null, dir = [];
  function defaultName() { return S.user ? (S.user.email.split("@")[0] || "Player") : "Guest"; }
  S.getProfile = function () {
    var p = mine || {};
    return {
      name: typeof p.name === "string" && p.name ? p.name : defaultName(),
      bio: typeof p.bio === "string" ? p.bio : "",
      avatar: typeof p.avatar === "string" && p.avatar.indexOf("data:image/") === 0 ? p.avatar : ""
    };
  };
  // Returns a Promise: "ok", "taken" (pseudo already used) or "error".
  S.saveProfile = function (p) {
    if (!client || !S.user) return Promise.resolve("error");
    var row = { id: S.user.id, email: (S.user.email || "").toLowerCase(), name: p.name, bio: p.bio, avatar: p.avatar };
    return client.from("profiles").upsert(row).then(function (r) {
      if (r.error) return r.error.code === "23505" ? "taken" : "error";
      mine = row;
      dir = dir.filter(function (e) { return e.id !== row.id; });
      dir.push({ id: row.id, email: row.email, name: row.name });
      return "ok";
    }, function () { return "error"; });
  };
  function createProfile(n) {
    var name = (S.user.email.split("@")[0] || "player").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, n ? 20 : 24);
    if (name.length < 3) name = ("player" + name).slice(0, 12);
    if (n) name += Math.floor(100 + Math.random() * 900);
    return S.saveProfile({ name: name, bio: "", avatar: "" }).then(function (res) {
      if (res === "taken" && n < 4) return createProfile(n + 1);
    });
  }
  S.loadProfiles = function () {
    if (!client || !S.user) return Promise.resolve();
    return Promise.all([
      client.from("profiles").select("id,email,name").limit(1000),
      client.from("profiles").select("*").eq("id", S.user.id).maybeSingle()
    ]).then(function (r) {
      dir = r[0].data || [];
      mine = r[1].data || null;
      if (!mine) return createProfile(0);
    }, function () {});
  };
  function entries() { return dir; }
  S.findByName = function (name) {
    var n = String(name || "").trim().toLowerCase();
    return n ? entries().filter(function (e) { return String(e.name || "").toLowerCase() === n; }) : [];
  };
  S.findByEmail = function (email) {
    var m = String(email || "").trim().toLowerCase();
    var f = m ? entries().filter(function (e) { return e.email === m; }) : [];
    return f[0] || null;
  };
  S.nameTaken = function (name) {
    return S.findByName(name).some(function (e) { return e.id !== S.id(); });
  };
  S.who = function (email) {     // pseudo if known, else the email
    if (!email) return "";
    var e = S.findByEmail(email);
    return e && e.name ? e.name : email;
  };

  S.paintAvatar = function (node, p) {
    node.textContent = "";
    if (p.avatar) {
      var img = document.createElement("img");
      img.alt = ""; img.src = p.avatar;
      node.appendChild(img);
    } else {
      node.textContent = p.name.charAt(0) || "?";
    }
  };

  /* ---------- top bar ---------- */
  function buildHeader() {
    var host = $("topbar");
    host.className = "topbar";
    host.innerHTML =
      '<a class="mini-brand" href="' + ROOT + 'dashboard/dashboard.html">' +
        '<span class="logo small"><img src="' + ROOT + 'logo.png" alt="" onerror="this.parentNode.classList.add(\'nologo\');this.remove()"></span>' +
        '<span>SMOO <b>Server Host</b></span></a>' +
      '<div class="account" id="account">' +
        '<button type="button" class="account-btn" id="account-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="account-menu">' +
          '<span class="avatar" id="avatar" aria-hidden="true"></span>' +
          '<span class="account-name" id="account-name"></span>' +
          '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="menu" id="account-menu" role="menu" aria-labelledby="account-btn" hidden>' +
          '<div class="menu-head"><span class="avatar big" id="avatar2" aria-hidden="true"></span>' +
            '<div><strong id="menu-name"></strong><small id="menu-email"></small></div></div>' +
          '<a role="menuitem" href="' + ROOT + 'dashboard/dashboard.html">My servers</a>' +
          '<a role="menuitem" href="' + ROOT + 'profils/profil.html">Profile</a>' +
          '<a role="menuitem" href="' + ROOT + 'settings/settings.html">Settings</a>' +
          '<a role="menuitem" href="' + ROOT + 'help/help.html">Help</a>' +
          '<hr>' +
          '<button role="menuitem" type="button" class="danger" id="signout">Sign out</button>' +
        '</div>' +
      '</div>';
  }

  S.refreshHeader = function () {
    var p = S.getProfile();
    S.paintAvatar($("avatar"), p);
    S.paintAvatar($("avatar2"), p);
    $("account-name").textContent = p.name;
    $("menu-name").textContent = p.name;
    $("menu-email").textContent = S.user ? S.user.email : "Not signed in";
  };

  function wireMenu() {
    var btn = $("account-btn"), menu = $("account-menu");
    function items() { return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]')); }
    function setMenu(open, focus) {
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && focus) items()[0].focus();
      if (!open && focus === false) btn.focus();
    }
    btn.addEventListener("click", function () { setMenu(menu.hidden); });
    document.addEventListener("click", function (e) { if (!menu.hidden && !$("account").contains(e.target)) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (menu.hidden) return;
      if (e.key === "Escape") { setMenu(false, false); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var list = items(), i = list.indexOf(document.activeElement);
        i = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[i].focus();
      }
    });
    btn.addEventListener("keydown", function (e) { if (e.key === "ArrowDown") { e.preventDefault(); setMenu(true, true); } });

    $("signout").addEventListener("click", function () {
      try { sessionStorage.removeItem("smo-dev-skip"); } catch (e) {}
      var go = function () { location.replace(ROOT + "login/login.html"); };
      if (client) client.auth.signOut().then(go, go); else go();
    });
  }

  /* ---------- start: who is logged in? ---------- */
  S.init = function (cb) {
    var login = ROOT + "login/login.html";
    function ready() {
      S.loadProfiles().then(function () {
        buildHeader(); wireMenu(); S.refreshHeader();
        if (cb) cb(S);
      });
    }
    if (client) {
      client.auth.getSession().then(function (res) {
        var s = res && res.data && res.data.session;
        if (s) { S.user = { id: s.user.id, email: s.user.email }; ready(); }
        else if (devSkip && cfg.allowSkip === true) { ready(); }
        else { location.replace(login); }
      }, function () { location.replace(login); });
    } else if (devSkip && cfg.allowSkip === true) {
      ready();
    } else {
      location.replace(login);
    }
  };
})();
