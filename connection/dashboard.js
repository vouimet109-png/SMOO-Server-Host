// Dashboard: my servers + servers shared with me. Data comes from SMOO_DB (store.js).
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SMOO, DB = window.SMOO_DB, MAX = DB.MAX_OWNED;

  S.init(function () {
    $("devnote").hidden = !!S.user;
    DB.load().then(render);
  });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent: names can't inject HTML
    return n;
  }
  function canManage(p) { return p.access || DB.CATS.some(function (c) { return p.edit[c.key]; }); }

  function card(item) {
    var s = item.server, p = item.perms;
    var card = el("article", "server");
    var top = el("div");
    var on = s.status === "online" && s.last_seen && Date.now() - Date.parse(s.last_seen) < 45000;
    top.appendChild(el("span", "badge" + (on ? " on" : ""), on ? "Online" : "Offline"));
    top.appendChild(el("h3", null, s.name));
    if (on && s.address) top.appendChild(el("small", null, s.address));
    if (p.owner) top.appendChild(el("small", null, "Created " + new Date(s.created).toLocaleDateString()));
    else top.appendChild(el("small", "by", "Shared by " + S.who(s.owner.email)));
    card.appendChild(top);

    var row = el("div", "row");
    if (p.start) {
      var start = el("button", "btn", "Start");
      start.type = "button"; start.disabled = true; start.title = "Coming soon";
      row.appendChild(start);
    }
    if (canManage(p)) {
      var manage = el("a", "btn", "Manage");
      manage.href = "server.html?id=" + encodeURIComponent(s.id);
      row.appendChild(manage);
    }
    if (p.owner) {
      var del = el("button", "btn danger", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        if (confirm("Delete \"" + s.name + "\"? Everyone with access will lose it. This can't be undone.")) {
          if (!DB.remove(s.id)) S.toast("Couldn't delete this server.");
          render();
        }
      });
      row.appendChild(del);
    } else {
      var leave = el("button", "btn danger", "Leave");
      leave.type = "button";
      leave.addEventListener("click", function () {
        if (confirm("Leave \"" + s.name + "\"? You will lose your access.")) { DB.leave(s.id); render(); }
      });
      row.appendChild(leave);
    }
    card.appendChild(row);
    return card;
  }

  function render() {
    var items = DB.list();
    var owned = items.filter(function (i) { return i.perms.owner; });
    var shared = items.filter(function (i) { return !i.perms.owner; });

    var grid = $("grid");
    grid.textContent = "";
    $("count").textContent = owned.length;
    owned.forEach(function (i) { grid.appendChild(card(i)); });

    var slot = el("button", "slot");
    slot.type = "button";
    slot.appendChild(el("span", "plus", "+"));
    slot.appendChild(el("strong", null, "Create a server"));
    slot.addEventListener("click", openCreate);
    grid.appendChild(slot);

    $("shared-wrap").hidden = !shared.length;
    var sg = $("shared-grid");
    sg.textContent = "";
    shared.forEach(function (i) { sg.appendChild(card(i)); });
  }

  var dlg = $("create"), nameInput = $("server-name"), cmsg = $("create-msg");
  function openCreate() {
    nameInput.value = ""; cmsg.hidden = true;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    nameInput.focus();
  }
  function closeCreate() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  $("create-cancel").addEventListener("click", closeCreate);

  $("create-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput.value.trim().replace(/\s+/g, " ");
    if (name.length < 3) { cmsg.textContent = "The name must have at least 3 characters."; cmsg.hidden = false; return; }
    var res = DB.create(name);
    if (res.error) { cmsg.textContent = res.error; cmsg.hidden = false; return; }
    closeCreate(); render();
    S.toast("Server \"" + name + "\" created.");
  });
})();
