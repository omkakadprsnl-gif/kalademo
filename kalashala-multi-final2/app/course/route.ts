import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  parseAccessToken,
} from "../access/route";

const COOKIE_NAME =
  "kalashala_access";

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get(
        COOKIE_NAME
      )?.value;

    const access =
      parseAccessToken(token);

    if (!access) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          error:
            "Server configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        }
      );

    const {
      data: course,
      error: courseError,
    } =
      await supabase
        .from("courses")
        .select(
          "id,slug,title,description"
        )
        .eq(
          "id",
          access.courseId
        )
        .maybeSingle();

    if (courseError) {
      console.error(
        "Course query error:",
        courseError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load course.",
        },
        {
          status: 500,
        }
      );
    }

    if (!course) {
      return NextResponse.json(
        {
          error:
            "Course not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: lectures,
      error: lecturesError,
    } =
      await supabase
        .from("lectures")
        .select(
          "id,position,title,description,youtube_url"
        )
        .eq(
          "course_id",
          access.courseId
        )
        .order(
          "position",
          {
            ascending: true,
          }
        );

    if (lecturesError) {
      console.error(
        "Lectures query error:",
        lecturesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load lectures.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      course,
      lectures:
        lectures ?? [],
    });
  } catch (error) {
    console.error(
      "Course API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load course.",
      },
      {
        status: 500,
      }
    );
  }
}
