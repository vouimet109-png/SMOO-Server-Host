// Login logic. The checking of email + password is done by Supabase,
// never in this file, so no password is stored in the site's code.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.SMO_CONFIG || {};
  var form = $("form"), msg = $("msg"), submit = $("submit");
  var mode = "in"; // "in" = sign in, "up" = create account

  var configured =
    cfg.supabaseUrl && cfg.supabaseAnonKey &&
    cfg.supabaseUrl.indexOf("YOUR_") !== 0 && cfg.supabaseAnonKey.indexOf("YOUR_") !== 0;

  var client = null;
  if (configured && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  /* ---------- helpers ---------- */
  function show(text, kind) {
    msg.textContent = text;
    msg.className = "msg" + (kind ? " " + kind : "");
    msg.hidden = !text;
  }
  function label() { return mode === "up" ? "Create account" : "Sign in"; }
  function resetButton() {
    submit.disabled = !client;
    submit.textContent = label();
  }
  function friendly(error) {
    var m = (error && error.message || "").toLowerCase();
    if (m.indexOf("invalid login") !== -1) return "Wrong email or password.";
    if (m.indexOf("already registered") !== -1 || m.indexOf("already been registered") !== -1) return "This email already has an account. Sign in instead.";
    if (m.indexOf("signups not allowed") !== -1 || m.indexOf("signup is disabled") !== -1) return "Creating accounts is turned off right now.";
    if (m.indexOf("password") !== -1 && m.indexOf("least") !== -1) return "Password is too short. Use at least 6 characters.";
    if (m.indexOf("email not confirmed") !== -1) return "Confirm your email first, then try again.";
    if (m.indexOf("rate limit") !== -1 || m.indexOf("too many") !== -1) return "Too many attempts. Wait a minute and try again.";
    if (m.indexOf("fetch") !== -1 || m.indexOf("network") !== -1) return "Can't reach the login service. Check your connection.";
    return "Something went wrong. Try again.";
  }

  /* ---------- sign in / create account switch ---------- */
  function setMode(next) {
    mode = next;
    var up = mode === "up";
    $("tab-in").setAttribute("aria-selected", up ? "false" : "true");
    $("tab-up").setAttribute("aria-selected", up ? "true" : "false");
    $("title").textContent = up ? "Create account" : "Sign in";
    $("sub").textContent = up ? "Pick an email and a password." : "Welcome back.";
    $("confirm-wrap").hidden = !up;
    $("password").setAttribute("autocomplete", up ? "new-password" : "current-password");
    document.title = (up ? "Create account" : "Sign in") + " · SMOO Server Host";
    $("confirm").value = "";
    if (client || !configured) { /* keep the setup message if any */ }
    if (client) show("");
    resetButton();
  }
  $("tab-in").addEventListener("click", function () { setMode("in"); });
  $("tab-up").addEventListener("click", function () { setMode("up"); });

  /* ---------- show/hide password ---------- */
  $("toggle").addEventListener("click", function () {
    var input = $("password");
    var hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    this.textContent = hidden ? "Hide" : "Show";
    this.setAttribute("aria-pressed", hidden ? "true" : "false");
  });

  /* ---------- dev skip ---------- */
  if (cfg.allowSkip === true) {
    $("skip").hidden = false;
    $("skip").addEventListener("click", function () {
      try { sessionStorage.setItem("smo-dev-skip", "1"); } catch (e) {}
      location.href = cfg.afterLogin;
    });
  }

  /* ---------- setup state ---------- */
  if (!configured) {
    show("Login isn't set up yet. Add your Supabase URL and key in connection/config.js.");
    submit.disabled = true;
  } else if (!client) {
    show("Couldn't load the login service. Check your connection and reload.", "error");
    submit.disabled = true;
  } else {
    client.auth.getSession().then(function (res) {
      if (res && res.data && res.data.session) location.replace(cfg.afterLogin);
    });
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!client) return;

    var email = $("email").value.trim();
    var password = $("password").value;
    if (!email || !password) { show("Enter your email and password.", "error"); return; }
    if (mode === "up") {
      if (password.length < 6) { show("Password is too short. Use at least 6 characters.", "error"); return; }
      if (password !== $("confirm").value) { show("The two passwords don't match.", "error"); return; }
    }

    show("");
    submit.disabled = true;
    submit.textContent = mode === "up" ? "Creating..." : "Signing in...";

    if (mode === "up") {
      client.auth.signUp({ email: email, password: password }).then(function (res) {
        if (res.error) { show(friendly(res.error), "error"); resetButton(); return; }
        if (res.data && res.data.session) { location.replace(cfg.afterLogin); return; }
        // Supabase may require confirming the email before the first sign in.
        setMode("in");
        show("Account created. Check your email to confirm it, then sign in.", "ok");
      }, function (err) { show(friendly(err), "error"); resetButton(); });
    } else {
      client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) { show(friendly(res.error), "error"); resetButton(); return; }
        location.replace(cfg.afterLogin);
      }, function (err) { show(friendly(err), "error"); resetButton(); });
    }
  });

  resetButton();
})();
