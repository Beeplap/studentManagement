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

// 🟢 POST: Create a subject/course
export async function POST(request) {
  const supabase = createClient();
  try {
    const { subject_name, course_code, semester, description, credits } =
      await request.json();

    // Validate inputs
    if (!subject_name || !course_code) {
      return NextResponse.json(
        { error: "Subject name and course code are required." },
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
    const { data: subjectDataResult, error } = await supabase
      .from("subjects")
      .insert([
        {
          code: course_code,
          name: subject_name,
        },
      ])
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Course code already exists. Please use a different code." },
          { status: 400 }
        );
      }
      throw error;
    }

    // Map back to subject format for frontend
    const subjectData = {
      id: courseData.id,
      course_code: courseData.course_code,
      subject_name: courseData.course_title,
      credits: courseData.credit_hours,
      description: courseData.description,
      semester: semester || null,
      course_type: courseData.course_type,
      theory_hours: courseData.theory_hours,
      practical_hours: courseData.practical_hours,
      created_at: courseData.created_at,
    };

    return NextResponse.json({
      message: "Subject added successfully",
      subject: subjectData,
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
    const semester = searchParams.get("semester");

    // Query from subjects table
    let query = supabase
      .from("subjects")
      .select("*")
      .order("code", { ascending: true });

    const { data: subjectsData, error } = await query;
    if (error) throw error;

    // Map subjects table structure to frontend format
    const subjects = (subjectsData || []).map((subject) => ({
      id: subject.id,
      course_code: subject.code,
      subject_name: subject.name, 
      credits: 3, // Default or add column if needed
      description: "", // Add if needed
      semester: null, // Subjects are general, Classes are semester specific
      course_type: "Core",
      created_at: subject.created_at,
    }));

    // Filter by semester if provided (Note: Subjects table might not have semester if it's a general pool)
    // If strict semester filtering is needed for SUBJECTS, we need a column. 
    // For now returning all or filtering in memory if column existed.
    let filteredSubjects = subjects;
    // if (semester) { ... }

    return NextResponse.json({ subjects: filteredSubjects });
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

    // Delete from subjects table
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
