"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function StudentMarksView({ studentId }) {
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    if (studentId) fetchMarks();
  }, [studentId]);

  const fetchMarks = async () => {
    setLoading(true);
    // Fetch marks and join with subjects/courses if possible. 
    // Assuming 'subject_id' refers to 'subjects' or 'classes'.
    // Given the schema, let's fetch raw marks first.
    
    // NOTE: If subject_id maps to 'classes', we might settle for just showing the ID or fetching class name.
    // Ideally we join.
    const { data, error } = await supabase
      .from("marks")
      .select("*, subjects(subject_name, course_code)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    // Fallback if relation not set up: just show what we have
    if (data) setMarks(data);
    else if (error) console.error(error);
    
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <GraduationCap className="text-purple-600" />
                My Grades & Marks
             </CardTitle>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-3">Subject / Course</th>
                            <th className="px-6 py-3">Exam Type</th>
                            <th className="px-6 py-3 text-center">Marks Obtained</th>
                            <th className="px-6 py-3 text-center">Total</th>
                            <th className="px-6 py-3 text-center">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {marks.map((mark) => {
                            const percentage = (mark.marks / mark.total) * 100;
                            const isPass = percentage >= 40; // Default 40% threshold

                            return (
                                <tr key={mark.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">
                                        {mark.subjects?.subject_name || "Subject " + mark.subject_id.slice(0,4)}
                                        {mark.subjects?.course_code && <span className="ml-2 text-xs text-gray-500">({mark.subjects.course_code})</span>}
                                    </td>
                                    <td className="px-6 py-4">{mark.exam_type || mark.exam_name}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-900">{mark.marks}</td>
                                    <td className="px-6 py-4 text-center text-gray-500">{mark.total}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isPass ? "Pass" : "Fail"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {marks.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                    No marks available yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
