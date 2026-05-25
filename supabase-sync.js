const SUPABASE_CONFIG = window.SUPABASE_PUBLIC_CONFIG || {
  url: "",
  anonKey: ""
};

const CLOUD_ENABLED = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
let supabaseClient = null;
let currentUser = null;

if (CLOUD_ENABLED && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

async function initCloudAuth(onUserChanged) {
  if (!supabaseClient) {
    onUserChanged?.(null, "クラウド同期は未設定です（README参照）");
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user ?? null;
  onUserChanged?.(currentUser);

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    onUserChanged?.(currentUser);
  });
}

async function loginWithProvider(provider) {
  if (!supabaseClient) throw new Error("Cloud not configured");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.href }
  });
  if (error) throw error;
}

async function logoutCloud() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

function getCurrentUser() {
  return currentUser;
}

async function pullCloudEntries() {
  if (!supabaseClient || !currentUser) return [];
  const { data, error } = await supabaseClient
    .from("pair_entries")
    .select("pair, word, created_at, skip_count, favorite, memo")
    .eq("user_id", currentUser.id);
  if (error) throw error;
  return (data || []).map((row) => ({
    pair: row.pair,
    word: row.word,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    skipCount: row.skip_count || 0,
    favorite: Boolean(row.favorite),
    memo: row.memo || ""
  }));
}

async function pushCloudEntries(entries) {
  if (!supabaseClient || !currentUser) return;
  const payload = entries.map((e) => ({
    user_id: currentUser.id,
    pair: e.pair,
    word: e.word,
    created_at: new Date(e.createdAt || Date.now()).toISOString(),
    skip_count: Number(e.skipCount || 0),
    favorite: Boolean(e.favorite),
    memo: e.memo || ""
  }));
  const { error } = await supabaseClient.from("pair_entries").upsert(payload, { onConflict: "user_id,pair" });
  if (error) throw error;
}



async function pullMailOptSetting() {
  if (!supabaseClient || !currentUser) return null;
  const { data, error } = await supabaseClient
    .from("user_settings")
    .select("mail_opt_in")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return Boolean(data.mail_opt_in);
}

async function pushMailOptSetting(enabled) {
  if (!supabaseClient || !currentUser) return;
  const { error } = await supabaseClient.from("user_settings").upsert(
    {
      user_id: currentUser.id,
      mail_opt_in: Boolean(enabled)
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
