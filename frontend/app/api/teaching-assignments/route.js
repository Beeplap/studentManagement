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
    },
  );
}

async function checkAdmin(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("checkAdmin: No user found", authError);
    return { authorized: false, reason: "User not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("checkAdmin: Profile lookup failed", profileError);
    return { authorized: false, reason: "Profile not found or access denied" };
  }

  if (profile.role !== "admin") {
    return {
      authorized: false,
      reason: `Role mismatch: found '${profile.role}'`,
    };
  }

  return { authorized: true };
}

// 🟢 GET: Fetch Assignments
export async function GET(request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const teacherId = searchParams.get("teacherId");

  try {
    let query = supabase
      .from("teaching_assignments")
      .select(
        `
        id, created_at,
        batch:batches(id, academic_unit, section, course:courses(code, name)),
        subject:subjects(id, name, code),
        teacher:users(id, full_name, email)
      `,
      )
      .order("created_at", { ascending: false });

    if (batchId) query = query.eq("batch_id", batchId);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data: assignments, error } = await query;
    if (error) throw error;

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("API Error [GET /teaching-assignments]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 🔵 POST: Assign Teacher (Admin Only)
export async function POST(request) {
  const supabase = createClient();
  const authCheck = await checkAdmin(supabase);

  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: "Unauthorized: " + authCheck.reason },
      { status: 401 },
    );
  }

  try {
    const { batch_id, subject_id, teacher_id } = await request.json();

    if (!batch_id || !subject_id || !teacher_id) {
      return NextResponse.json(
        { error: "Batch, Subject, and Teacher are required." },
        { status: 400 },
      );
    }

    const { data: assignment, error } = await supabase
      .from("teaching_assignments")
      .insert([{ batch_id, subject_id, teacher_id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: "Teacher assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("API Error [POST /teaching-assignments]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 🔴 DELETE: Remove Assignment (Admin Only)
export async function DELETE(request) {
  const supabase = createClient();
  const authCheck = await checkAdmin(supabase);

  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: "Unauthorized: " + authCheck.reason },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Assignment ID required" },
        { status: 400 },
      );

    const { error } = await supabase
      .from("teaching_assignments")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Assignment removed successfully" });
  } catch (error) {
    console.error("API Error [DELETE /teaching-assignments]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
