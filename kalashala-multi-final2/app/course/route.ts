import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { accessCookieName, getAccessTokenPayload } from "@/lib/access";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(accessCookieName())?.value;
  const payload = getAccessTokenPayload(token);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,title,description")
    .eq("id", payload.courseId)
    .maybeSingle();

  if (courseError) return NextResponse.json({ error: courseError.message }, { status: 500 });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const { data: lectures, error: lectureError } = await supabase
    .from("lectures")
    .select("id,position,title,description,youtube_url")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  if (lectureError) return NextResponse.json({ error: lectureError.message }, { status: 500 });

  return NextResponse.json({ course, lectures: lectures || [] });
}
