import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { accessCookieName, createAccessToken, getAccessTokenPayload, SESSION_DAYS } from "@/lib/access";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(accessCookieName())?.value;
  const payload = getAccessTokenPayload(token);

  if (!payload) return NextResponse.json({ authenticated: false }, { status: 401 });

  return NextResponse.json({ authenticated: true, courseId: payload.courseId });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!courseId) return NextResponse.json({ error: "Course is required." }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Please enter the course password." }, { status: 400 });

    const supabase = getServerSupabase();

    const { data: access, error: accessError } = await supabase
      .from("course_access")
      .select("course_id,password_hash")
      .eq("course_id", courseId)
      .maybeSingle();

    if (accessError) {
      console.error("Course access lookup error:", accessError);
      return NextResponse.json({ error: accessError.message }, { status: 500 });
    }

    if (!access) return NextResponse.json({ error: "Course not found." }, { status: 404 });

    const { data: valid, error: verifyError } = await supabase.rpc("verify_course_password", {
      p_course_id: courseId,
      p_password: password,
    });

    if (verifyError) {
      console.error("Password verification error:", verifyError);
      return NextResponse.json({ error: verifyError.message }, { status: 500 });
    }

    if (valid !== true) {
      return NextResponse.json({ error: "Incorrect course password." }, { status: 401 });
    }

    const token = createAccessToken(courseId);
    const response = NextResponse.json({ success: true, courseId });

    response.cookies.set({
      name: accessCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Access route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify password." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: accessCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
