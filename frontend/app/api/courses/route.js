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

// GET: Fetch all courses
export async function GET(request) {
  const supabase = createClient();
  try {
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .order("code", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("API Error [GET /courses]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 400 }
    );
  }
}

// POST: Add a new course (if needed in future)
export async function POST(request) {
  const supabase = createClient();
  try {
      const { code, name, type, duration } = await request.json();

      if (!code || !name || !type || !duration) {
          return NextResponse.json({ error: "All fields are required" }, { status: 400 });
      }

      // Check admin
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if(profile?.role !== 'admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data, error } = await supabase.from("courses").insert([{ code, name, type, duration }]).select().single();
      if(error) throw error;

      return NextResponse.json({ message: "Course added", course: data });

  } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
