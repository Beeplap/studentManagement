"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Save, 
  History,
  UserCheck 
} from "lucide-react";

export default function AttendanceManager({ teacherId }) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { student_id: 'present' | 'absent' | 'late' }
  const [viewMode, setViewMode] = useState("daily"); // 'daily' | 'history'
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (selectedClassId) {
      if (viewMode === "daily") {
        fetchDailyData();
      } else {
        fetchHistoryData();
      }
    }
  }, [selectedClassId, selectedDate, viewMode]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", teacherId);
    setClasses(data || []);
  };

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      // 1. Get Class Details
      const cls = classes.find(c => c.id === selectedClassId);
      if (!cls) return;

      // 2. Fetch Students
      // Constructing identifier: "BCA Sem-1" or "BBS Year-1"
      const classIdentifier = `${cls.course} ${cls.course === 'BCA' ? 'Sem' : 'Year'}-${cls.semester}`; 
      
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .eq("class", classIdentifier)
        .order("roll", { ascending: true });

      setStudents(studentsData || []);

      // 3. Fetch Existing Attendance for Date
      if (studentsData?.length > 0) {
        const studentIds = studentsData.map(s => s.id);
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*")
          .in("student_id", studentIds)
          .eq("date", selectedDate)
          .eq("class_id", selectedClassId); // Filter by specific class

        const attendanceMap = {};
        attendanceData?.forEach(r => {
          attendanceMap[r.student_id] = r.status;
        });
        setAttendance(attendanceMap);
      }
    } catch (error) {
      console.error("Error fetching daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
        const cls = classes.find(c => c.id === selectedClassId);
        if (!cls) return;
        const classIdentifier = `${cls.course} ${cls.course === 'BCA' ? 'Sem' : 'Year'}-${cls.semester}`;

        // Fetch students to report on
        const { data: studentsData } = await supabase
            .from("students")
            .select("id, full_name, roll")
            .eq("class", classIdentifier)
            .order("roll", { ascending: true });
        
        if (!studentsData || studentsData.length === 0) {
            setHistoryData([]);
            setLoading(false);
            return;
        }

        const studentIds = studentsData.map(s => s.id);

        // Fetch aggregation (simplified)
        // Ideally use a database function or view for performance
        const { data: allAttendance } = await supabase
            .from("attendance")
            .select("student_id, status, date")
            .in("student_id", studentIds)
            .eq("class_id", selectedClassId) // Include class specific history
            .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]); // Last 30 days default

        
        const history = studentsData.map(student => {
            const records = allAttendance?.filter(r => r.student_id === student.id) || [];
            const total = records.length;
            const present = records.filter(r => r.status === 'present').length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            
            return {
                ...student,
                totalClasses: total,
                presentClasses: present,
                percentage,
                isLow: percentage < 75 && total > 0
            };
        });

        setHistoryData(history);

    } catch (error) {
        console.error("Error fetching history:", error);
    } finally {
        setLoading(false);
    }
  };

  const toggleStatus = (studentId, currentStatus) => {
    const nextStatus = {
        'present': 'absent',
        'absent': 'late',
        'late': 'present',
        undefined: 'present'
    }[currentStatus] || 'present';

    setAttendance(prev => ({ ...prev, [studentId]: nextStatus }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        date: selectedDate,
        status: status,
        class_id: selectedClassId,
        marked_by: teacherId
      }));

      if (updates.length > 0) {
         const { error } = await supabase
           .from("attendance")
           .upsert(updates, { onConflict: "student_id, date, class_id" });
         
         if (error) throw error;
         alert("Attendance saved successfully!");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-purple-600 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-purple-600" />
              Attendance Management
            </CardTitle>
            <div className="flex gap-2">
                <Button 
                    variant={viewMode === "daily" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("daily")}
                    size="sm"
                >
                    <Calendar className="w-4 h-4 mr-2" /> Daily
                </Button>
                <Button 
                    variant={viewMode === "history" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("history")}
                    size="sm"
                >
                    <History className="w-4 h-4 mr-2" /> History
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.subject} - {c.course} {c.course === 'BCA' ? 'Sem' : 'Year'}-{c.semester} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {viewMode === "daily" && (
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                </div>
            )}
          </div>

          {/* Daily View */}
          {viewMode === "daily" && selectedClassId && (
            <div className="space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                        Click on status to toggle: <span className="text-green-600 font-bold">Present</span> → <span className="text-red-500 font-bold">Absent</span> → <span className="text-yellow-500 font-bold">Late</span>
                    </p>
                    <Button onClick={handleSave} disabled={loading || students.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Saving..." : "Save Daily Attendance"}
                    </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Roll</th>
                                <th className="px-4 py-3 text-left">Student Name</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {students.map(student => {
                                const status = attendance[student.id] || "present"; // Default to present for ease
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-600">{student.roll}</td>
                                        <td className="px-4 py-3 text-gray-900">{student.full_name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => toggleStatus(student.id, status)}
                                                className={`
                                                    px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide w-24 transition-all
                                                    ${status === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                                                    ${status === 'absent' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                                                    ${status === 'late' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : ''}
                                                `}
                                            >
                                                {status}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-500">
                                        No students found in this class.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* History View */}
           {viewMode === "history" && selectedClassId && (
               <div className="space-y-4">
                   <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-md flex items-start gap-2">
                       <History className="w-4 h-4 mt-0.5 shrink-0" />
                       <p>Showing 30-day summary. Students with less than 75% attendance are highlighted.</p>
                   </div>
                   
                   <div className="border rounded-lg overflow-hidden">
                       <table className="w-full text-sm">
                           <thead className="bg-gray-50">
                               <tr>
                                   <th className="px-4 py-3 text-left">Name</th>
                                   <th className="px-4 py-3 text-center">Total Classes</th>
                                   <th className="px-4 py-3 text-center">Present</th>
                                   <th className="px-4 py-3 text-center">Attendance %</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y">
                               {historyData.map(record => (
                                   <tr key={record.id} className={record.isLow ? "bg-red-50" : "hover:bg-gray-50"}>
                                       <td className="px-4 py-3 font-medium">
                                           {record.full_name}
                                           {record.isLow && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Low</span>}
                                       </td>
                                       <td className="px-4 py-3 text-center text-gray-600">{record.totalClasses}</td>
                                       <td className="px-4 py-3 text-center text-green-600 font-medium">{record.presentClasses}</td>
                                       <td className="px-4 py-3 text-center">
                                           <span className={`font-bold ${record.isLow ? 'text-red-600' : 'text-gray-900'}`}>
                                               {record.percentage}%
                                           </span>
                                       </td>
                                   </tr>
                               ))}
                               {historyData.length === 0 && (
                                   <tr>
                                       <td colSpan="4" className="p-8 text-center text-gray-500">
                                           No history data available.
                                       </td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}

           {!selectedClassId && (
               <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed rounded-lg">
                   <UserCheck className="w-12 h-12 mb-2 opacity-50" />
                   <p>Please select a class to manage attendance.</p>
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
