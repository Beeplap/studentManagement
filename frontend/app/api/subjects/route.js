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

// 🟢 POST: Create a subject
export async function POST(request) {
  const supabase = createClient();
  try {
    const { name, code, course_id, semester, description, credits, type } =
      await request.json();

    // Validate inputs
    if (!name || !code || !course_id || !semester) {
      return NextResponse.json(
        { error: "Subject name, code, course, and semester are required." },
        { status: 400 }
      );
    }

    // Check user authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert into subjects table
    const { data: subject, error } = await supabase
      .from("subjects")
      .insert([
        {
          name,
          code,
          course_id,
          semester,
          description,
          credits: credits || 3,
          type: type || 'Core'
        },
      ])
      .select()
      .single();

    if (error) {
       // Handle unique constraint if any (code might be unique strictly or per course?)
       // Assuming code is unique global or handle duplicate error generic
       if (error.code === "23505") {
          return NextResponse.json({ error: "Subject code already exists" }, { status: 400 });
       }
       throw error;
    }

    return NextResponse.json({
      message: "Subject added successfully",
      subject,
    });
  } catch (error) {
    console.error("API Error [POST /subjects]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add subject" },
      { status: 400 }
    );
  }
}

// 🔵 GET: Fetch subjects
export async function GET(request) {
  const supabase = createClient();
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    const semester = searchParams.get("semester");

    let query = supabase
      .from("subjects")
      .select("*, course:courses(name, code)")
      .order("code", { ascending: true });

    if (courseId) {
        query = query.eq('course_id', courseId);
    }
    if (semester) {
        query = query.eq('semester', semester);
    }

    const { data: subjects, error } = await query;
    if (error) throw error;

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("API Error [GET /subjects]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subjects" },
      { status: 400 }
    );
  }
}

// 🔴 DELETE: Remove a subject
export async function DELETE(request) {
  const supabase = createClient();
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("API Error [DELETE /subjects]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete subject" },
      { status: 400 }
    );
  }
}
