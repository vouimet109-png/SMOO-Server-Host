// Settings page: notifications, password, danger zone.
// Notification choices are saved in this browser for now.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SMOO;

  function key() { return "smoo-settings:" + S.id(); }
  function load() {
    var v = {};
    try { v = JSON.parse(localStorage.getItem(key()) || "{}") || {}; } catch (e) {}
    return { server: v.server !== false, news: v.news === true };   // defaults: server on, news off
  }
  function save() {
    try { localStorage.setItem(key(), JSON.stringify({ server: $("n-server").checked, news: $("n-news").checked })); }
    catch (e) { S.toast("Couldn't save. Storage is blocked."); return; }
    S.toast("Settings saved.");
  }
  function pwShow(text, kind) {
    var m = $("pw-msg");
    m.textContent = text; m.className = "msg" + (kind ? " " + kind : ""); m.hidden = !text;
  }

  S.init(function () {
    $("devnote").hidden = !!S.user;
    var lang = $("lang");
    lang.value = window.SMOO_I18N ? SMOO_I18N.get() : "en";
    lang.addEventListener("change", function () { if (window.SMOO_I18N) { SMOO_I18N.set(lang.value); S.toast("Settings saved."); } });
    var s = load();
    $("n-server").checked = s.server;
    $("n-news").checked = s.news;
    $("n-server").addEventListener("change", save);
    $("n-news").addEventListener("change", save);

    // password: needs a real signed-in account
    if (!S.user || !S.client) {
      $("pw1").disabled = true; $("pw2").disabled = true; $("pw-save").disabled = true;
    }
  });

  $("pw-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!S.user || !S.client) return;
    var a = $("pw1").value, b = $("pw2").value;
    if (a.length < 6) { pwShow("Password is too short. Use at least 6 characters.", "error"); return; }
    if (a !== b) { pwShow("The two passwords don't match.", "error"); return; }
    pwShow(""); $("pw-save").disabled = true;
    S.client.auth.updateUser({ password: a }).then(function (res) {
      $("pw-save").disabled = false;
      if (res.error) {
        var m = (res.error.message || "").toLowerCase();
        pwShow(m.indexOf("same") !== -1 ? "Choose a different password than the current one." : "Couldn't change the password. Try again.", "error");
        return;
      }
      $("pw1").value = ""; $("pw2").value = "";
      pwShow("Password changed.", "ok");
    }, function () { $("pw-save").disabled = false; pwShow("Can't reach the login service. Check your connection.", "error"); });
  });

})();
