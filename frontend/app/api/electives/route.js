import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

// 🔵 GET: List available electives for the logged-in student
export async function GET(request) {
  const supabase = createClient();
  try {
    // 1. Auth Check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Student Info (Batch -> Course & Semester)
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select(`
        id,
        batch_id,
        batch:batches (
          id,
          course_id,
          academic_unit
        )
      `)
      .eq("id", user.id) // Corrected: students.id is the FK to auth.users
      .single();

    if (studentError || !studentData) {
       // If not a student, maybe admin? allow admin to list all? 
       // For now, strict for students to see THEIR electives.
       // If user is admin returned error might be confusing, but requirement says "List available electives for a student"
       return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const { batch } = studentData;
    if (!batch) {
      return NextResponse.json({ error: "Student is not assigned to a batch" }, { status: 400 });
    }

    const currentSemester = batch.academic_unit;
    const courseId = batch.course_id;

    // 3. Fetch Electives for this Course & Semester
    const { data: electives, error: subjectsError } = await supabase
      .from("subjects")
      .select("*")
      .eq("course_id", courseId)
      .eq("semester", currentSemester)
      .eq("type", "Elective");

    if (subjectsError) throw subjectsError;

    // 4. Fetch Already Selected Subjects
    const { data: selections, error: selectionError } = await supabase
      .from("student_subjects")
      .select("subject_id")
      .eq("student_id", studentData.id);

    if (selectionError) throw selectionError;

    const selectedIds = new Set(selections.map((s) => s.subject_id));

    // 5. Merge Data
    const results = electives.map((subject) => ({
      ...subject,
      selected: selectedIds.has(subject.id),
      disabled: false // Can add logic here if limit reached etc, but frontend can handle
    }));

    return NextResponse.json({ 
      electives: results,
      meta: {
        semester: currentSemester,
        limit: 2 // Hardcoded or fetch from config
      }
    });

  } catch (error) {
    console.error("API Error [GET /electives]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch electives" },
      { status: 500 }
    );
  }
}

// 🟢 POST: Select an elective
export async function POST(request) {
  const supabase = createClient();
  try {
    const { subject_id } = await request.json();

    if (!subject_id) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    }

    // 1. Auth Check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Identify Student
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, batch_id, batch:batches(academic_unit)")
      .eq("id", user.id)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json({ error: "Student record not found" }, { status: 403 });
    }

    const currentSemester = studentData.batch?.academic_unit;

    // 3. Insert Selection
    // We pass 'semester' explicitly as per schema requirement
    const { data, error } = await supabase
      .from("student_subjects")
      .insert([
        {
          student_id: studentData.id,
          subject_id: subject_id,
          semester: currentSemester
        },
      ])
      .select()
      .single();

    if (error) {
      // Handle Postgres Trigger Errors (P0001 is default for RAISE EXCEPTION)
      if (error.code === 'P0001') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // Handle Unique Violation
      if (error.code === '23505') {
        return NextResponse.json({ error: "You have already selected this subject" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({
      message: "Elective selected successfully",
      selection: data,
    });

  } catch (error) {
    console.error("API Error [POST /electives]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to select elective" },
      { status: 500 }
    );
  }
}
