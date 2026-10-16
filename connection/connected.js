// Page shown after the person clicks the link in the confirmation e-mail.
// Supabase puts the login token in the address; the client below reads it and signs the person in.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.SMOO_CONFIG || {};
  var client = null;
  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  function finish(ok) {
    var go = $("go");
    $("title").textContent = ok ? "You are connected! :D" : "This link is invalid or expired.";
    $("sub").textContent = ok ? "Your email is confirmed. Welcome!" : "Sign in to continue.";
    $("icon").className = "check" + (ok ? "" : " bad");
    $("icon").textContent = ok ? "\u2713" : "!";
    go.textContent = ok ? "Go to my servers" : "Go to sign in";
    go.href = ok ? "../dashboard/dashboard.html" : "../login/login.html";
    go.hidden = false;
    try { history.replaceState(null, "", location.pathname); } catch (e) {}   // hide the token from the address bar
    if (ok) setTimeout(function () { location.replace("../dashboard/dashboard.html"); }, 5000);
  }

  if (!client) { finish(false); return; }
  client.auth.getSession().then(function (res) {
    finish(!!(res && res.data && res.data.session));
  }, function () { finish(false); });
})();
