// Tiny translator. The site is written in English; this file swaps known sentences for French / Spanish.
// To translate something new, add a line below:   "English text": ["français", "español"],
// Anything not listed simply stays in English. A key ending with a space matches the START of a text.
(function () {
  "use strict";
  var D = {
    // login
    "Sign in": ["Se connecter", "Iniciar sesión"], "Create account": ["Créer un compte", "Crear cuenta"],
    "Welcome back.": ["Content de te revoir.", "Te damos la bienvenida."], "Email": ["E-mail", "Correo"],
    "Password": ["Mot de passe", "Contraseña"], "Show": ["Afficher", "Mostrar"], "Hide": ["Masquer", "Ocultar"],
    "Confirm password": ["Confirmer le mot de passe", "Confirmar contraseña"], "← Back": ["← Retour", "← Volver"],
    "Sign in or create an account": ["Connecte-toi ou crée un compte", "Inicia sesión o crea una cuenta"],
    "Pick an email and a password.": ["Choisis un e-mail et un mot de passe.", "Elige un correo y una contraseña."],
    "Enter": ["Entrer", "Entrar"], "Wrong email or password.": ["E-mail ou mot de passe incorrect.", "Correo o contraseña incorrectos."],
    "Enter your email and password.": ["Entre ton e-mail et ton mot de passe.", "Escribe tu correo y contraseña."],
    "Signing in...": ["Connexion...", "Iniciando sesión..."], "Creating...": ["Création...", "Creando..."],
    "Password is too short. Use at least 6 characters.": ["Mot de passe trop court. Mets au moins 6 caractères.", "Contraseña demasiado corta. Usa al menos 6 caracteres."],
    "The two passwords don't match.": ["Les deux mots de passe ne correspondent pas.", "Las contraseñas no coinciden."],
    // header
    "Sign out": ["Se déconnecter", "Cerrar sesión"], "Help": ["Aide", "Ayuda"], "Not signed in": ["Non connecté", "Sin sesión"],
    // dashboard
    "My servers": ["Mes serveurs", "Mis servidores"], "servers created": ["serveurs créés", "servidores creados"],
    "Shared with me": ["Partagés avec moi", "Compartidos conmigo"], "Create a server": ["Créer un serveur", "Crear un servidor"],
    "Choose a name for your server.": ["Choisis un nom pour ton serveur.", "Elige un nombre para tu servidor."],
    "Server name": ["Nom du serveur", "Nombre del servidor"], "Cancel": ["Annuler", "Cancelar"], "Create": ["Créer", "Crear"],
    "My Odyssey server": ["Mon serveur Odyssey", "Mi servidor Odyssey"],
    "Start": ["Démarrer", "Iniciar"], "Manage": ["Gérer", "Administrar"], "Delete": ["Supprimer", "Eliminar"], "Leave": ["Quitter", "Salir"],
    "Online": ["En ligne", "En línea"], "Offline": ["Hors ligne", "Sin conexión"], "Coming soon": ["Bientôt", "Próximamente"],
    "Created ": ["Créé le ", "Creado el "], "Shared by ": ["Partagé par ", "Compartido por "],
    "The name must have at least 3 characters.": ["Le nom doit faire au moins 3 caractères.", "El nombre debe tener al menos 3 caracteres."],
    "You already have a server with this name.": ["Tu as déjà un serveur avec ce nom.", "Ya tienes un servidor con ese nombre."],
    "Couldn't sync with the server. Check your connection.": ["Synchronisation impossible. Vérifie ta connexion.", "No se pudo sincronizar. Revisa tu conexión."],
    // server page
    "← My servers": ["← Mes serveurs", "← Mis servidores"], "Server categories": ["Catégories du serveur", "Categorías del servidor"],
    "Server": ["Serveur", "Servidor"], "Scenario": ["Scénario", "Escenario"], "Ban list": ["Liste de bannis", "Lista de baneados"],
    "Persist shines": ["Shines persistants", "Shines persistentes"], "Access": ["Accès", "Acceso"],
    "Address": ["Adresse", "Dirección"], "Max players": ["Joueurs max", "Máx. jugadores"], "Enabled": ["Activé", "Activado"],
    "Players": ["Joueurs", "Jugadores"], "Point of view": ["Point de vue", "Punto de vista"], "Merge enabled": ["Fusion activée", "Fusión activada"],
    "IP addresses": ["Adresses IP", "Direcciones IP"], "Stages": ["Niveaux", "Niveles"], "File name": ["Nom du fichier", "Nombre del archivo"],
    "Set by the host. You can't change it.": ["Défini par l'hébergeur. Tu ne peux pas le changer.", "Lo define el anfitrión. No puedes cambiarlo."],
    "You own this server.": ["Tu possèdes ce serveur.", "Eres el dueño de este servidor."], "Owned by ": ["Propriétaire : ", "Propietario: "],
    "People you add will see this server in their own servers.": ["Les personnes ajoutées verront ce serveur dans leurs serveurs.", "Las personas que añadas verán este servidor en los suyos."],
    "Add a person": ["Ajouter une personne", "Añadir una persona"], "Add person": ["Ajouter", "Añadir"], "Save access": ["Enregistrer l'accès", "Guardar acceso"],
    "No one else has access yet.": ["Personne d'autre n'a accès pour l'instant.", "Nadie más tiene acceso todavía."],
    // connection tab
    "Connection": ["Connexion", "Conexión"], "Link your computer to this server with the agent.": ["Relie ton ordinateur à ce serveur grâce à l'agent.", "Conecta tu ordenador a este servidor con el agente."],
    "Server key": ["Clé du serveur", "Clave del servidor"], "Copy": ["Copier", "Copiar"], "Copied.": ["Copié.", "Copiado."],
    "Generate a new key": ["Générer une nouvelle clé", "Generar una clave nueva"], "New key generated.": ["Nouvelle clé générée.", "Clave nueva generada."],
    "Keep this key secret. Anyone who has it can control this server. If it leaks, generate a new one.": ["Garde cette clé secrète. Quiconque l'a peut contrôler ce serveur. Si elle fuite, génères-en une nouvelle.", "Mantén esta clave en secreto. Quien la tenga puede controlar este servidor. Si se filtra, genera una nueva."],
    "No key yet. Generate one with the button below.": ["Pas encore de clé. Génère-en une avec le bouton ci-dessous.", "Aún no hay clave. Genera una con el botón de abajo."],
    "Couldn't generate a key.": ["Impossible de générer une clé.", "No se pudo generar la clave."],
    "Generate a new key? The agent using the old key will stop working.": ["Générer une nouvelle clé ? L'agent qui utilise l'ancienne clé ne marchera plus.", "¿Generar una clave nueva? El agente con la clave anterior dejará de funcionar."],
    "How to set up the agent": ["Comment installer l'agent", "Cómo instalar el agente"],
    // profile
    "Profile": ["Profil", "Perfil"], "This is how you appear on the site.": ["C'est ainsi que tu apparais sur le site.", "Así apareces en el sitio."],
    "Profile photo": ["Photo de profil", "Foto de perfil"], "Change photo": ["Changer la photo", "Cambiar foto"], "Remove": ["Retirer", "Quitar"],
    "PNG, JPG or WebP. It will be cropped to a square.": ["PNG, JPG ou WebP. Elle sera recadrée en carré.", "PNG, JPG o WebP. Se recortará en cuadrado."],
    "Pseudo": ["Pseudo", "Seudónimo"], "Others can add you to a server with this pseudo. It must be unique.": ["Les autres peuvent t'ajouter à un serveur avec ce pseudo. Il doit être unique.", "Otros pueden añadirte a un servidor con este seudónimo. Debe ser único."],
    "Bio": ["Bio", "Bio"], "(optional)": ["(facultatif)", "(opcional)"], "Your email can't be changed here.": ["Ton e-mail ne peut pas être changé ici.", "Tu correo no se puede cambiar aquí."],
    "Reset": ["Réinitialiser", "Restablecer"], "Save changes": ["Enregistrer", "Guardar cambios"], "Tell us about you...": ["Parle-nous de toi...", "Cuéntanos sobre ti..."],
    "Profile saved.": ["Profil enregistré.", "Perfil guardado."], "This pseudo is already taken.": ["Ce pseudo est déjà pris.", "Ese seudónimo ya está en uso."],
    "Couldn't save. Check your connection.": ["Enregistrement impossible. Vérifie ta connexion.", "No se pudo guardar. Revisa tu conexión."],
    // settings
    "Settings": ["Paramètres", "Ajustes"], "Manage your account.": ["Gère ton compte.", "Gestiona tu cuenta."],
    "Language": ["Langue", "Idioma"], "Choose the language of the site.": ["Choisis la langue du site.", "Elige el idioma del sitio."],
    "Notifications": ["Notifications", "Notificaciones"], "Choose what you want to be told about.": ["Choisis ce dont tu veux être informé.", "Elige de qué quieres que te avisemos."],
    "Server status": ["État du serveur", "Estado del servidor"], "When one of your servers goes online or offline.": ["Quand un de tes serveurs passe en ligne ou hors ligne.", "Cuando uno de tus servidores se conecta o desconecta."],
    "News and updates": ["Nouveautés", "Novedades"], "New features on SMOO Server Host.": ["Nouvelles fonctions de SMOO Server Host.", "Novedades de SMOO Server Host."],
    "Use at least 6 characters.": ["Utilise au moins 6 caractères.", "Usa al menos 6 caracteres."], "New password": ["Nouveau mot de passe", "Nueva contraseña"],
    "Confirm new password": ["Confirmer le nouveau mot de passe", "Confirmar nueva contraseña"], "Change password": ["Changer le mot de passe", "Cambiar contraseña"],
    "Password changed.": ["Mot de passe changé.", "Contraseña cambiada."], "Settings saved.": ["Paramètres enregistrés.", "Ajustes guardados."],
    "Danger zone": ["Zone de danger", "Zona de peligro"], "These actions can't be undone.": ["Ces actions sont irréversibles.", "Estas acciones no se pueden deshacer."],
    "Delete my account": ["Supprimer mon compte", "Eliminar mi cuenta"], "Needs the backend. Coming soon.": ["Nécessite le backend. Bientôt.", "Requiere el backend. Próximamente."], "Delete account": ["Supprimer le compte", "Eliminar cuenta"],
    // help
    "Run your own SMOO server in 6 steps. It runs on your computer and you control it from this site.": ["Lance ton propre serveur SMOO en 6 étapes. Il tourne sur ton ordinateur et tu le contrôles depuis ce site.", "Crea tu propio servidor SMOO en 6 pasos. Funciona en tu ordenador y lo controlas desde este sitio."],
    "Install Python": ["Installer Python", "Instalar Python"],
    "Download Python 3.8 or newer from python.org. On Windows, tick “Add Python to PATH” during the install.": ["Télécharge Python 3.8 ou plus récent sur python.org. Sous Windows, coche « Add Python to PATH » pendant l'installation.", "Descarga Python 3.8 o superior en python.org. En Windows, marca «Add Python to PATH» durante la instalación."],
    "Get the SMOO server": ["Récupérer le serveur SMOO", "Obtener el servidor SMOO"],
    "Download SmoOnlineServer (open source) from its GitHub releases and unzip it in a folder. Run it once so it creates its files, then close it.": ["Télécharge SmoOnlineServer (open source) dans les releases de son GitHub et décompresse-le dans un dossier. Lance-le une fois pour qu'il crée ses fichiers, puis ferme-le.", "Descarga SmoOnlineServer (código abierto) desde los releases de su GitHub y descomprímelo en una carpeta. Ejecútalo una vez para que cree sus archivos y ciérralo."],
    "Download the agent": ["Télécharger l'agent", "Descargar el agente"],
    "It is a single readable file. It only writes settings.json, starts or stops the server and its tunnel, and reports if you are online. It never runs commands sent by the site.": ["C'est un seul fichier lisible. Il écrit seulement settings.json, démarre ou arrête le serveur et son tunnel, et indique si tu es en ligne. Il n'exécute jamais de commandes envoyées par le site.", "Es un único archivo legible. Solo escribe settings.json, inicia o detiene el servidor y su túnel, e informa si estás en línea. Nunca ejecuta comandos enviados por el sitio."],
    "Download agent.py": ["Télécharger agent.py", "Descargar agent.py"],
    "Get your server key": ["Récupérer ta clé de serveur", "Obtener tu clave de servidor"],
    "Create a server on this site, open it with Manage, and copy the key from the Connection tab. Keep it secret.": ["Crée un serveur sur ce site, ouvre-le avec Gérer et copie la clé dans l'onglet Connexion. Garde-la secrète.", "Crea un servidor en este sitio, ábrelo con Administrar y copia la clave de la pestaña Conexión. Mantenla en secreto."],
    "Run the agent": ["Lancer l'agent", "Ejecutar el agente"],
    "Open a terminal in the folder of agent.py and run:": ["Ouvre un terminal dans le dossier de agent.py et lance :", "Abre una terminal en la carpeta de agent.py y ejecuta:"],
    "The first time, it asks for the key and the path of the server program. Leave the window open: settings you change on the site are applied within seconds.": ["La première fois, il demande la clé et le chemin du programme serveur. Laisse la fenêtre ouverte : les réglages changés sur le site s'appliquent en quelques secondes.", "La primera vez pide la clave y la ruta del programa del servidor. Deja la ventana abierta: los ajustes cambiados en el sitio se aplican en segundos."],
    "To change the key or the path later, run:": ["Pour changer la clé ou le chemin plus tard, lance :", "Para cambiar la clave o la ruta más tarde, ejecuta:"],
    "Hide your IP address": ["Cacher ton adresse IP", "Ocultar tu dirección IP"],
    "Nothing to do: the agent opens a free tunnel for you (using bore, open source), so your IP stays hidden and you open no port on your router. The address your friends use appears on your server card once the agent runs. It changes each time you restart the agent.": ["Rien à faire : l'agent ouvre un tunnel gratuit à ta place (avec bore, open source). Ton IP reste cachée et tu n'ouvres aucun port sur ta box. L'adresse que tes amis utilisent s'affiche sur la carte de ton serveur dès que l'agent tourne. Elle change à chaque redémarrage de l'agent.", "No tienes que hacer nada: el agente abre un túnel gratuito por ti (con bore, código abierto). Tu IP queda oculta y no abres ningún puerto en tu router. La dirección que usan tus amigos aparece en la tarjeta de tu servidor cuando el agente funciona. Cambia cada vez que reinicias el agente."],
    "Screenshots will be added soon.": ["Des captures d'écran seront ajoutées bientôt.", "Pronto añadiremos capturas de pantalla."]
  };
  var P = Object.keys(D).filter(function (k) { return /\s$/.test(k); });
  var KEY = "smoo-lang", IDX = { fr: 0, es: 1 };

  function detect() {
    var s = null; try { s = localStorage.getItem(KEY); } catch (e) {}
    if (s === "en" || IDX[s] !== undefined) return s;
    var n = (navigator.language || "en").slice(0, 2).toLowerCase();
    return IDX[n] !== undefined ? n : "en";
  }
  var lang = detect();

  function lookup(en) {
    if (lang === "en") return en;
    var t = en.trim(), i = IDX[lang], e = D[t];
    if (!t) return en;
    if (e) return en.replace(t, function () { return e[i]; });
    for (var k = 0; k < P.length; k++) {
      if (t.indexOf(P[k]) === 0) return en.replace(P[k], function () { return D[P[k]][i]; });
    }
    return en;
  }

  var texts = new WeakMap(), obs = null, pending = false, titleEn = "", titleOut = "";
  function scan() {
    if (obs) obs.disconnect();
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n, r, en, out;
    while ((n = w.nextNode())) {
      var tag = n.parentNode && n.parentNode.nodeName;
      if (tag === "SCRIPT" || tag === "STYLE") continue;
      r = texts.get(n); en = r && r.out === n.nodeValue ? r.en : n.nodeValue; out = lookup(en);
      texts.set(n, { en: en, out: out });
      if (out !== n.nodeValue) n.nodeValue = out;
    }
    Array.prototype.forEach.call(document.querySelectorAll("[placeholder],[title],[aria-label]"), function (el) {
      el._i = el._i || {};
      ["placeholder", "title", "aria-label"].forEach(function (a) {
        var v = el.getAttribute(a); if (v == null) return;
        var rec = el._i[a], e2 = rec && rec.out === v ? rec.en : v, o2 = lookup(e2);
        el._i[a] = { en: e2, out: o2 };
        if (o2 !== v) el.setAttribute(a, o2);
      });
    });
    if (!titleEn || document.title !== titleOut) titleEn = document.title;
    titleOut = titleEn.split(" · ").map(lookup).join(" · ");
    document.title = titleOut;
    document.documentElement.lang = lang;
    if (obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function later() { if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; scan(); }); } }

  window.SMOO_I18N = {
    get: function () { return lang; },
    t: function (s) { return lookup(s); },
    set: function (l) {
      if (l !== "en" && IDX[l] === undefined) return;
      lang = l; try { localStorage.setItem(KEY, l); } catch (e) {}
      scan();
    }
  };
  function start() { scan(); obs = new MutationObserver(later); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
