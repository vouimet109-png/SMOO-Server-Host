// Server settings page: one panel per category (only the ones you are allowed to edit),
// then the Access panel at the end. Address and Port are shown but never editable.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SMOO, DB = window.SMOO_DB, CATS = DB.CATS;
  var id = new URLSearchParams(location.search).get("id");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent: nothing typed by a user is read as HTML
    return n;
  }
  function canManage(p) { return p.access || CATS.some(function (c) { return p.edit[c.key]; }); }
  function show(node, text, kind) { node.textContent = text; node.className = "msg" + (kind ? " " + kind : ""); node.hidden = !text; }

  S.init(function () { DB.load().then(function () {
    var server = id && DB.get(id);
    var perms = server && DB.perms(server);
    if (!server || !perms || !canManage(perms)) { location.replace("dashboard.html"); return; }
    $("title").textContent = server.name;
    document.title = server.name + " · SMOO Server Host";
    $("owner").textContent = perms.owner ? "You own this server." : "Owned by " + S.who(server.owner.email) + ".";

    // left menu: one tab per category you can open, Access last; a click shows that category
    var host = $("cats"), side = $("side"), tabs = [];
    side.setAttribute("role", "tablist"); side.setAttribute("aria-orientation", "vertical");
    function add(key, title, panel, last) {
      if (last && tabs.length) { var sep = el("div", "sep"); sep.setAttribute("role", "separator"); side.appendChild(sep); }
      var tab = el("button", "tab", title);
      tab.type = "button"; tab.id = "tab-" + key;
      tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panel.hidden = true;
      tab.addEventListener("click", function () { select(key, false); });
      side.appendChild(tab); host.appendChild(panel);
      tabs.push({ key: key, tab: tab, panel: panel });
    }
    function select(key, focus) {
      tabs.forEach(function (t) {
        var on = t.key === key;
        t.panel.hidden = !on;
        t.tab.setAttribute("aria-selected", on ? "true" : "false");
        t.tab.tabIndex = on ? 0 : -1;
        if (on && focus) t.tab.focus();
      });
      try { history.replaceState(null, "", "#" + key); } catch (e) {}
    }
    side.addEventListener("keydown", function (e) {
      var k = e.key;
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].indexOf(k) === -1) return;
      e.preventDefault();
      var i = 0;
      tabs.forEach(function (t, n) { if (t.tab.getAttribute("aria-selected") === "true") i = n; });
      if (k === "Home") i = 0;
      else if (k === "End") i = tabs.length - 1;
      else if (k === "ArrowDown" || k === "ArrowRight") i = (i + 1) % tabs.length;
      else i = (i - 1 + tabs.length) % tabs.length;
      select(tabs[i].key, true);
    });

    CATS.forEach(function (c) { if (perms.edit[c.key]) add(c.key, c.title, buildCat(c), false); });
    if (perms.access) add("access", "Access", buildAccess(), true);
    if (perms.owner) add("connection", "Connection", buildConnection(), false);
    var want = location.hash.replace("#", "");
    select(tabs.some(function (t) { return t.key === want; }) ? want : tabs[0].key, false);
  }); });

  /* ---------- list values (players, IPs, stages) ---------- */
  function isIp(v) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.split(".").every(function (n) { return +n <= 255; });
    return v.indexOf(":") !== -1 && /^[0-9a-fA-F:.]{2,45}$/.test(v);
  }
  var LIST_RULES = {
    player: { ok: function (v) { return v.length >= 1 && v.length <= 64 && !/[\x00-\x1f]/.test(v); }, msg: "Enter a player name or ID (64 characters max)." },
    ip: { ok: isIp, msg: "Enter a valid IP address." },
    stage: { ok: function (v) { return /^[A-Za-z0-9_\-]{1,64}$/.test(v); }, msg: "Stage names use letters, numbers, _ and - only." }
  };
  var LIST_MAX = 200;

  /* ---------- one field => { node, read() } ---------- */
  function field(f, value, fid) {
    var w = el("div");
    var label = f.label || f.name;

    if (f.type === "bool") {
      var sw = el("label", "switch");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = !!value;
      sw.appendChild(cb); sw.appendChild(el("span", "track"));
      var txt = el("span", "txt"); txt.appendChild(el("strong", null, label));
      if (f.hint) txt.appendChild(el("small", null, f.hint));
      sw.appendChild(txt);
      return { node: sw, read: function () { return cb.checked; } };
    }

    if (f.type === "list") {
      var items = value.slice();
      w.className = "field";
      var l = el("label", null, label); l.htmlFor = fid; w.appendChild(l);
      var chips = el("div", "chips");
      var row = el("div", "addrow");
      var inp = el("input"); inp.type = "text"; inp.id = fid; inp.maxLength = 64; inp.autocomplete = "off"; inp.placeholder = f.placeholder || "";
      var add = el("button", "btn", "Add"); add.type = "button";
      var err = el("p", "fielderr"); err.hidden = true;
      row.appendChild(inp); row.appendChild(add);
      w.appendChild(chips); w.appendChild(row); w.appendChild(err);

      var drawChips = function () {
        chips.textContent = "";
        if (!items.length) { chips.appendChild(el("span", "none", "None yet.")); return; }
        items.forEach(function (it, i) {
          var chip = el("span", "chip"); chip.appendChild(el("span", null, it));
          var x = el("button", null, "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Remove " + it);
          x.addEventListener("click", function () { items.splice(i, 1); drawChips(); });
          chip.appendChild(x); chips.appendChild(chip);
        });
      };
      var addItem = function () {
        var v = inp.value.trim(), rule = LIST_RULES[f.kind];
        err.hidden = true;
        if (!v) return;
        if (!rule.ok(v)) { err.textContent = rule.msg; err.hidden = false; return; }
        if (items.length >= LIST_MAX) { err.textContent = "Too many entries (" + LIST_MAX + " max)."; err.hidden = false; return; }
        if (items.some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) { err.textContent = "Already in the list."; err.hidden = false; return; }
        items.push(v); inp.value = ""; drawChips(); inp.focus();
      };
      add.addEventListener("click", addItem);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addItem(); } });
      drawChips();
      return { node: w, read: function () { return items.slice(); } };
    }

    var lab = el("label", null, label); lab.htmlFor = fid; w.appendChild(lab);

    if (f.type === "select") {
      var sel = el("select"); sel.id = fid;
      f.options.forEach(function (o) { var op = el("option", null, o); op.value = o; sel.appendChild(op); });
      sel.value = value;
      w.appendChild(sel);
      return { node: w, read: function () { return f.options.indexOf(sel.value) !== -1 ? sel.value : value; } };
    }

    var input = el("input"); input.type = "text"; input.id = fid; input.value = String(value);
    w.appendChild(input);

    if (f.type === "readonly") {
      input.readOnly = true;
      w.appendChild(el("p", "hint", f.hint || "You can't change this."));
      return { node: w };            // no read(): never written back
    }
    if (f.type === "int") {
      input.inputMode = "numeric"; input.maxLength = 4;
      return { node: w, read: function () {
        var t = input.value.trim();
        if (!/^\d+$/.test(t)) throw new Error(label + " must be a number.");
        var n = parseInt(t, 10);
        if (n < f.min || n > f.max) throw new Error(label + " must be between " + f.min + " and " + f.max + ".");
        return n;
      } };
    }
    // text
    input.maxLength = 40; if (f.placeholder) input.placeholder = f.placeholder;
    return { node: w, read: function () {
      var t = input.value.trim();
      if (f.pattern && !f.pattern.test(t)) throw new Error(f.error || (label + " is not valid."));
      return t;
    } };
  }

  /* ---------- one category panel ---------- */
  function buildCat(cat) {
    var form = el("form", "panel"); form.noValidate = true; form.id = "cat-" + cat.key;
    form.appendChild(el("h2", null, cat.title));
    var body = el("div"); body.style.marginTop = "16px";
    form.appendChild(body);
    var msg = el("p", "msg"); msg.hidden = true; msg.setAttribute("role", "alert");
    form.appendChild(msg);
    var actions = el("div", "actions");
    var reset = el("button", "ghost", "Reset"); reset.type = "button";
    var save = el("button", "submit", "Save"); save.type = "submit";
    actions.appendChild(reset); actions.appendChild(save);
    form.appendChild(actions);

    var readers = [];
    function draw() {
      var s = DB.get(id), cur = s.settings[cat.section];
      body.textContent = ""; readers = [];
      cat.fields.forEach(function (f) {
        var b = field(f, cur[f.name], "f-" + cat.key + "-" + f.name);
        body.appendChild(b.node);
        if (b.read) readers.push({ name: f.name, read: b.read });
      });
    }
    draw();
    reset.addEventListener("click", function () { draw(); show(msg, ""); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = DB.get(id), p = s && DB.perms(s);
      if (!p || !p.edit[cat.key]) { show(msg, "You no longer have access to this category.", "error"); return; }
      var out = {};
      try { readers.forEach(function (r) { out[r.name] = r.read(); }); }
      catch (er) { show(msg, er.message, "error"); return; }
      Object.keys(out).forEach(function (k) { s.settings[cat.section][k] = out[k]; });   // readonly fields are never in "out"
      if (!DB.save(s)) { show(msg, "Couldn't save. Storage is blocked or full.", "error"); return; }
      show(msg, "Saved.", "ok");
    });
    return form;
  }

  /* ---------- Access (last panel) ---------- */
  function summary(a) {
    var parts = [];
    if (a.start) parts.push("Can start");
    var names = CATS.filter(function (c) { return a.edit && a.edit[c.key]; }).map(function (c) { return c.title; });
    if (names.length) parts.push("Can edit: " + names.join(", "));
    if (a.access) parts.push("Can manage access");
    return parts.join(" \u00b7 ");
  }

  function buildConnection() {
    var panel = el("section", "panel"); panel.id = "cat-connection";
    panel.appendChild(el("h2", null, "Connection"));
    panel.appendChild(el("p", "sub", "Link your computer to this server with the agent."));
    var s0 = DB.get(id) || {};
    var on = s0.status === "online" && s0.last_seen && Date.now() - Date.parse(s0.last_seen) < 45000;
    panel.appendChild(el("p", "sub", on ? "Online" : "Offline"));
    if (on && s0.address) panel.appendChild(el("p", "sub", s0.address));

    var lab = el("label", null, "Server key"); lab.htmlFor = "srv-key"; panel.appendChild(lab);
    var inp = el("input"); inp.type = "text"; inp.id = "srv-key"; inp.readOnly = true; inp.autocomplete = "off"; panel.appendChild(inp);
    panel.appendChild(el("p", "sub", "Keep this key secret. Anyone who has it can control this server. If it leaks, generate a new one."));
    var msg = el("p", "msg"); msg.hidden = true; panel.appendChild(msg);

    var row = el("div", "actions");
    var copy = el("button", "btn", "Copy"); copy.type = "button";
    var regen = el("button", "btn danger", "Generate a new key"); regen.type = "button";
    var help = el("a", "btn", "How to set up the agent"); help.href = "../help/help.html";
    row.appendChild(copy); row.appendChild(regen); row.appendChild(help); panel.appendChild(row);

    DB.getKey(id).then(function (k) {
      inp.value = k || "";
      if (!k) show(msg, "No key yet. Generate one with the button below.", "");
    });
    copy.addEventListener("click", function () {
      if (!inp.value) return;
      var ok = function () { S.toast("Copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(ok, function () {});
      else { inp.select(); try { document.execCommand("copy"); ok(); } catch (e) {} }
    });
    regen.addEventListener("click", function () {
      var q = "Generate a new key? The agent using the old key will stop working.";
      if (inp.value && !confirm(window.SMOO_I18N ? SMOO_I18N.t(q) : q)) return;
      DB.newKey(id).then(function (k) {
        if (!k) { show(msg, "Couldn't generate a key.", "error"); return; }
        inp.value = k; show(msg, "New key generated.", "ok");
      });
    });
    return panel;
  }

  function buildAccess() {
    var panel = el("section", "panel"); panel.id = "cat-access";
    panel.appendChild(el("h2", null, "Access"));
    panel.appendChild(el("p", "sub", "People you add will see this server in their own servers."));
    var list = el("div", "people"); panel.appendChild(list);

    var form = el("form", "addperson"); form.noValidate = true; panel.appendChild(form);
    var title = el("h3", null, "Add a person"); form.appendChild(title);
    var mode = "email";   // find the person by "email" or "pseudo"
    var seg = el("div", "seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Add the person with");
    var bEmail = el("button", null, "Email"), bPseudo = el("button", null, "Pseudo");
    bEmail.type = "button"; bPseudo.type = "button";
    seg.appendChild(bEmail); seg.appendChild(bPseudo); form.appendChild(seg);
    var lab = el("label", null, "Email"); lab.htmlFor = "acc-email"; form.appendChild(lab);
    var email = el("input"); email.type = "email"; email.id = "acc-email"; email.autocomplete = "off"; email.placeholder = "friend@example.com";
    form.appendChild(email);
    function setMode(m) {
      mode = m;
      bEmail.setAttribute("aria-pressed", m === "email" ? "true" : "false");
      bPseudo.setAttribute("aria-pressed", m === "pseudo" ? "true" : "false");
      lab.textContent = m === "email" ? "Email" : "Pseudo";
      email.type = m === "email" ? "email" : "text";
      email.placeholder = m === "email" ? "friend@example.com" : "Their pseudo";
      email.value = "";
    }

    function chk(text) {
      var l = el("label", "check"), i = el("input"); i.type = "checkbox";
      l.appendChild(i); l.appendChild(el("span", null, text));
      return { l: l, i: i };
    }
    var one = el("div", "checks one");
    var cStart = chk("Can open (start) the server");
    one.appendChild(cStart.l); form.appendChild(one);

    var group = el("fieldset", "group"); group.appendChild(el("legend", null, "Can edit these categories"));
    var grid = el("div", "checks"); group.appendChild(grid);
    var cEdit = {};
    CATS.forEach(function (c) { cEdit[c.key] = chk(c.title); grid.appendChild(cEdit[c.key].l); });
    form.appendChild(group);

    var one2 = el("div", "checks one");
    var cAccess = chk("Can manage access (add other people)");
    one2.appendChild(cAccess.l); form.appendChild(one2);

    var note = el("p", "capnote", "You can only give rights that you have yourself.");
    form.appendChild(note);

    var msg = el("p", "msg"); msg.hidden = true; msg.setAttribute("role", "alert"); form.appendChild(msg);
    var actions = el("div", "actions");
    var cancel = el("button", "ghost", "Cancel"); cancel.type = "button"; cancel.hidden = true;
    var submit = el("button", "submit", "Add person"); submit.type = "submit";
    actions.appendChild(cancel); actions.appendChild(submit); form.appendChild(actions);

    var editing = null;   // email of the person being edited

    function caps() {     // what I'm allowed to hand out
      var s = DB.get(id), p = s && DB.perms(s);
      cStart.i.disabled = !(p && p.start);
      cAccess.i.disabled = !(p && p.access);
      CATS.forEach(function (c) { cEdit[c.key].i.disabled = !(p && p.edit[c.key]); });
    }
    function fill(a) {
      cStart.i.checked = !!(a && a.start);
      cAccess.i.checked = !!(a && a.access);
      CATS.forEach(function (c) { cEdit[c.key].i.checked = !!(a && a.edit && a.edit[c.key]); });
    }
    function resetForm() {
      editing = null; email.disabled = false; bEmail.disabled = false; bPseudo.disabled = false; setMode(mode); fill(null);
      title.textContent = "Add a person"; submit.textContent = "Add person"; cancel.hidden = true;
      show(msg, ""); caps();
    }
    cancel.addEventListener("click", resetForm);

    function renderList() {
      var s = DB.get(id), p = s && DB.perms(s);
      list.textContent = "";
      if (!s || !p) return;
      var me = DB.me().email;

      var o = el("div", "person"), od = el("div");
      od.appendChild(el("strong", null, S.who(s.owner.email) || "Owner"));
      od.appendChild(el("small", null, "Owner \u00b7 full access"));
      o.appendChild(od); list.appendChild(o);

      if (!s.access.length) list.appendChild(el("p", "none", "No one else has access yet."));
      s.access.forEach(function (a) {
        var r = el("div", "person"), d = el("div");
        var shown = S.who(a.email);
        d.appendChild(el("strong", null, shown));
        d.appendChild(el("small", null, (shown !== a.email ? a.email + " \u00b7 " : "") + "Added by " + (S.who(a.addedBy) || "?") + " \u00b7 " + summary(a)));
        r.appendChild(d);
        if (p.owner || a.addedBy === me) {          // owner edits everyone; others only the people they added
          var btns = el("div", "row");
          var ed = el("button", "btn", "Edit"); ed.type = "button";
          ed.addEventListener("click", function () {
            editing = a.email; setMode("email"); email.value = a.email; email.disabled = true; bEmail.disabled = true; bPseudo.disabled = true; fill(a);
            title.textContent = "Edit access"; submit.textContent = "Save access"; cancel.hidden = false;
            show(msg, ""); caps(); form.scrollIntoView({ block: "nearest" });
          });
          var rm = el("button", "btn danger", "Remove"); rm.type = "button";
          rm.addEventListener("click", function () {
            if (!confirm("Remove access for " + a.email + "?")) return;
            var s2 = DB.get(id), p2 = s2 && DB.perms(s2);
            if (!p2 || !p2.access) return;
            s2.access = s2.access.filter(function (x) { return !(x.email === a.email && (p2.owner || x.addedBy === me)); });
            DB.save(s2);
            if (editing === a.email) resetForm();
            renderList(); S.toast("Access removed.");
          });
          btns.appendChild(ed); btns.appendChild(rm); r.appendChild(btns);
        }
        list.appendChild(r);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = DB.get(id), p = s && DB.perms(s), me = DB.me().email;
      if (!p || !p.access) { show(msg, "You no longer have access to this category.", "error"); return; }

      var addr = email.value.trim().toLowerCase();
      var entry = editing ? s.access.filter(function (x) { return x.email === editing; })[0] : null;
      if (editing && (!entry || !(p.owner || entry.addedBy === me))) { show(msg, "You can't change this person.", "error"); return; }
      if (!editing) {
        if (mode === "pseudo") {
          var typed = email.value.trim();
          if (!typed) { show(msg, "Enter a pseudo.", "error"); return; }
          var found = S.findByName(typed);
          if (!found.length) { show(msg, "No player has this pseudo yet. They need to sign in once, or use their email.", "error"); return; }
          if (found.length > 1) { show(msg, "Several players have this pseudo. Use their email instead.", "error"); return; }
          addr = found[0].email;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { show(msg, "Enter a valid email address.", "error"); return; }
        if (addr === me || addr === (s.owner.email || "").toLowerCase()) { show(msg, "This person already owns or manages this server.", "error"); return; }
        if (s.access.some(function (x) { return x.email === addr; })) { show(msg, "This person already has access. Use Edit.", "error"); return; }
      }

      var edit = {}, any = false;
      CATS.forEach(function (c) { edit[c.key] = cEdit[c.key].i.checked && !!p.edit[c.key]; if (edit[c.key]) any = true; });
      var start = cStart.i.checked && p.start, access = cAccess.i.checked && p.access;
      if (!start && !access && !any) { show(msg, "Pick at least one right.", "error"); return; }

      if (entry) { entry.start = start; entry.access = access; entry.edit = edit; }
      else s.access.push({ email: addr, start: start, access: access, edit: edit, addedBy: me, added: Date.now() });

      if (!DB.save(s)) { show(msg, "Couldn't save. Storage is blocked or full.", "error"); return; }
      var done = editing ? "Access updated." : S.who(addr) + " now has access.";
      resetForm(); renderList(); S.toast(done);
    });

    bEmail.addEventListener("click", function () { setMode("email"); show(msg, ""); });
    bPseudo.addEventListener("click", function () { setMode("pseudo"); show(msg, ""); });
    resetForm(); renderList();
    return panel;
  }
})();
