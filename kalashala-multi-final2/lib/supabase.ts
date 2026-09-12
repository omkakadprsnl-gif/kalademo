import { createBrowserClient } from "@supabase/ssr";

function getSupabaseUrl() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    return null;
  }

  // Clean up common URLs accidentally copied from Supabase.
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");

  return url;
}

export function getSupabaseBrowser() {
  const url = getSupabaseUrl();

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}