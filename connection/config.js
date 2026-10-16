// Settings for the login. Fill in the two values from your Supabase project
// (Project Settings -> API).
//
// supabaseAnonKey is the "anon" / "public" key. It is meant to be public.
// NEVER put the "service_role" key here.
window.SMO_CONFIG = {
  supabaseUrl: "https://draueejvcijyluetbxtr.supabase.co",
  supabaseAnonKey: "sb_publishable_rR5Qfb2PKlVEK2NVyTSr_A_sa-R9bPC",

  // Page to open after a successful login, relative to login/login.html.
  // Change it when that page exists.
  afterLogin: "../dashboard/dashboard.html",

  // DEV ONLY. Shows a "Skip for now" button that goes to afterLogin without
  // any account. It is NOT real security: anyone can click it.
  // Set it to false before the site goes public.
  allowSkip: false
};
