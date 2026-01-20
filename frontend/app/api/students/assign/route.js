import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recalculateBatchRolls } from "@/lib/rollGenerator";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { studentIds, batchId } = await req.json();

    if (
      !studentIds ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0 ||
      !batchId
    ) {
      return NextResponse.json(
        { error: "Invalid request: missing studentIds or batchId" },
        { status: 400 },
      );
    }

    // Setup Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Update batch_id for all students
    const { error: updateError } = await supabase
      .from("students")
      .update({ batch_id: batchId })
      .in("id", studentIds);

    if (updateError) {
      console.error("Error linking students to batch:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Recalculate Roll Numbers
    await recalculateBatchRolls(supabase, batchId);

    return NextResponse.json(
      { message: "Students assigned successfully" },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error in /api/students/assign:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
