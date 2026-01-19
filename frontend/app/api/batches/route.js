import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Helper to create Supabase client
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

// Middleware-like Admin Check
async function checkAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

// 🟢 GET: Fetch Batches
export async function GET(request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const isActive = searchParams.get("isActive");

  try {
    let query = supabase
      .from("batches")
      .select(`
        id, academic_unit, section, admission_year, is_active, created_at,
        course:courses(id, name, code)
      `)
      .order("admission_year", { ascending: false })
      .order("created_at", { ascending: false });

    if (courseId) query = query.eq("course_id", courseId);
    if (isActive !== null) query = query.eq("is_active", isActive === "true");

    const { data: batches, error } = await query;
    if (error) throw error;

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("API Error [GET /batches]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 🔵 POST: Create Batch (Admin Only)
export async function POST(request) {
  const supabase = createClient();
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { course_id, academic_unit, section, admission_year } = await request.json();

    const { data: batch, error } = await supabase
      .from("batches")
      .insert([{ course_id, academic_unit, section, admission_year }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "Batch created successfully", batch });
  } catch (error) {
    console.error("API Error [POST /batches]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 🟠 PATCH: Update Batch (Admin Only)
export async function PATCH(request) {
  const supabase = createClient();
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: "Batch ID required" }, { status: 400 });

    const { data: batch, error } = await supabase
      .from("batches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "Batch updated successfully", batch });
  } catch (error) {
    console.error("API Error [PATCH /batches]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// 🔴 DELETE: Remove Batch (Admin Only)
export async function DELETE(request) {
  const supabase = createClient();
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Batch ID required" }, { status: 400 });

    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Batch deleted successfully" });
  } catch (error) {
    console.error("API Error [DELETE /batches]:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
