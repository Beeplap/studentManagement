import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Create Supabase SSR client
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookies().get(name)?.value ?? null,
        set: (name, value, options) => cookies().set(name, value, options),
        remove: (name, options) => cookies().delete(name, options),
      },
    }
  );
}

// 🟢 POST: Create a class
export async function POST(request) {
  const supabase = createClient();
  try {
    const { course, semester, subject, room_number, teacher_id } =
      await request.json();

    // Validate inputs
    if (!course || !subject || !teacher_id || !semester) {
      return NextResponse.json(
        { error: "Course, semester, subject, and teacher are required." },
        { status: 400 }
      );
    }

    // Check user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate if subject exists in that course/semester (Optional but good for data integrity)
    // We assume 'course' passed here is the Course Name or Code. The subjects table has 'course_id'.
    // If the frontend passes Course Code, we need to lookup.
    // Ideally frontend passes standard values.
    // For now, let's just insert. The cascading dropdowns in frontend will ensure validity.
    // If we want strict backend validation, we need to join courses table.
    // Let's rely on frontend for now to keep it simple as `classes` table schema is loose.

    // Insert class
    const { data: classData, error } = await supabase
      .from("classes")
      .insert([{ course, semester, subject, room_number, teacher_id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: "Class assigned successfully",
      class: classData,
    });
  } catch (error) {
    console.error("API Error [POST /classes]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign class" },
      { status: 400 }
    );
  }
}

// 🔵 GET: Fetch classes
export async function GET(request) {
  const supabase = createClient();
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");

    let query = supabase
      .from("classes")
      .select(`
        id, course, semester, subject, room_number, created_at,
        teacher:users(id, full_name, email)
      `)
      .order("created_at", { ascending: false });
    // Note: Joined 'users' instead of 'profiles' based on admin page usage

    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data: classes, error } = await query;
    if (error) throw error;

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("API Error [GET /classes]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch classes" },
      { status: 400 }
    );
  }
}

// 🔴 DELETE: Remove a class
export async function DELETE(request) {
  const supabase = createClient();
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("id");

    if (!classId)
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("classes").delete().eq("id", classId);
    if (error) throw error;

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("API Error [DELETE /classes]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete class" },
      { status: 400 }
    );
  }
}
