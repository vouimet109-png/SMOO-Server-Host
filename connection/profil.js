// Profile page: change name, bio and photo. Saved in Supabase (see common.js).
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SMOO;
  var draft = null;       // what is shown in the form (not saved until "Save changes")

  function show(text, kind) {
    var m = $("msg");
    m.textContent = text; m.className = "msg" + (kind ? " " + kind : ""); m.hidden = !text;
  }

  function fill(p) {
    draft = { name: p.name, bio: p.bio, avatar: p.avatar };
    $("name").value = p.name;
    $("bio").value = p.bio;
    $("bio-count").textContent = p.bio.length;
    preview();
    $("remove").disabled = !p.avatar;
  }
  function preview() {
    S.paintAvatar($("preview"), { name: $("name").value.trim() || "?", avatar: draft.avatar });
    $("remove").disabled = !draft.avatar;
  }

  S.init(function () {
    $("devnote").hidden = !!S.user;
    $("email").value = S.user ? S.user.email : "(not signed in)";
    fill(S.getProfile());
  });

  $("name").addEventListener("input", preview);
  $("bio").addEventListener("input", function () { $("bio-count").textContent = this.value.length; });

  /* ---------- photo: pick, crop to a square, shrink ---------- */
  $("pick").addEventListener("click", function () { $("file").click(); });
  $("remove").addEventListener("click", function () { draft.avatar = ""; preview(); show(""); });

  $("file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { show("Use a PNG, JPG or WebP image.", "error"); return; }
    if (f.size > 8 * 1024 * 1024) { show("This image is too big (8 MB max).", "error"); return; }

    var reader = new FileReader();
    reader.onerror = function () { show("Couldn't read this image.", "error"); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { show("Couldn't read this image.", "error"); };
      img.onload = function () {
        var size = 256, c = document.createElement("canvas");
        c.width = c.height = size;
        var side = Math.min(img.width, img.height);
        var sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        draft.avatar = c.toDataURL("image/jpeg", 0.85);
        preview(); show("");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });

  /* ---------- save / reset ---------- */
  $("reset").addEventListener("click", function () { fill(S.getProfile()); show(""); });

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("name").value.trim().replace(/\s+/g, " ");
    if (name.length < 3) { show("The name must have at least 3 characters.", "error"); return; }
    if (S.user && S.nameTaken(name)) { show("This pseudo is already taken.", "error"); return; }
    S.saveProfile({ name: name, bio: $("bio").value.trim(), avatar: draft.avatar }).then(function (res) {
      if (res === "taken") { show("This pseudo is already taken.", "error"); return; }
      if (res !== "ok") { show("Couldn't save. Check your connection.", "error"); return; }
      fill(S.getProfile());
      S.refreshHeader();
      show("Profile saved.", "ok");
    });
  });
})();
