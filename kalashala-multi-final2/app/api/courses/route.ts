import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("courses")
      .select("id,title,description,created_at")
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ courses: data || [] });
  } catch (error) {
    console.error("Courses API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load courses." },
      { status: 500 }
    );
  }
}
