"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner"; // Assuming sonner or generic toast

export default function ManageCurriculum() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null); // ID of expanded course
  const [expandedSemester, setExpandedSemester] = useState(null); // `${courseId}-${sem}`

  // Add Subject Modal State
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    course_id: "",
    semester: "",
    credits: 3,
    type: "Core"
  });

  useEffect(() => {
    fetchCoursesAndSubjects();
  }, []);

  const fetchCoursesAndSubjects = async () => {
    setLoading(true);
    try {
      const [resCourses, resSubjects] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/subjects")
      ]);
      const jsonCourses = await resCourses.json();
      const jsonSubjects = await resSubjects.json();
      
      setCourses(jsonCourses.courses || []);
      setSubjects(jsonSubjects.subjects || []);
    } catch (error) {
      console.error("Failed to fetch curriculum data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectStart = (courseId, semester) => {
    setNewSubject({ ...newSubject, course_id: courseId, semester: semester });
    setShowAddSubject(true);
  };

  const handleAddSubjectSubmit = async () => {
    try {
      if(!newSubject.name || !newSubject.code) {
        alert("Name and Code are required");
        return;
      }
      
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubject)
      });
      
      if(!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add subject");
      }

      setShowAddSubject(false);
      setNewSubject({ name: "", code: "", course_id: "", semester: "", credits: 3, type: "Core" });
      fetchCoursesAndSubjects();
      // toast.success("Subject added");
    } catch (error) {
      alert(error.message);
    }
  };

  // Group subjects by Course -> Semester
  const getSubjects = (courseId, semester) => {
    return subjects.filter(s => s.course_id === courseId && s.semester == semester);
  };

  if (loading) return <div>Loading curriculum...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Curriculum Management</h2>
      </div>

      <div className="grid gap-4">
        {courses.map(course => (
          <Card key={course.id} className="overflow-hidden">
            <div 
              className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
            >
              <div className="flex items-center gap-3">
                 {expandedCourse === course.id ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                 <div>
                    <h3 className="font-bold text-lg">{course.name} ({course.code})</h3>
                    <p className="text-xs text-gray-500">{course.type} System • {course.duration} {course.type === 'Semester' ? 'Semesters' : 'Years'}</p>
                 </div>
              </div>
              <div className="text-sm font-medium text-gray-500">
                {subjects.filter(s => s.course_id === course.id).length} Subjects
              </div>
            </div>

            {expandedCourse === course.id && (
              <div className="p-4 bg-white border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: course.duration }, (_, i) => i + 1).map(sem => (
                        <div key={sem} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b">
                                <h4 className="font-semibold text-gray-700">{course.type === 'Semester' ? 'Semester' : 'Year'} {sem}</h4>
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50" onClick={() => handleAddSubjectStart(course.id, sem)}>
                                    <Plus className="w-3 h-3 mr-1"/> Add Subject
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                {getSubjects(course.id, sem).length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-2">No subjects added</p>
                                ) : (
                                    getSubjects(course.id, sem).map(sub => (
                                        <div key={sub.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm group">
                                            <div>
                                                <span className="font-medium">{sub.name}</span>
                                                <span className="text-xs text-gray-400 ml-2">({sub.code})</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500" onClick={async(e) => {
                                                e.stopPropagation();
                                                if(confirm("Delete subject?")) {
                                                    await fetch("/api/subjects", { method: "DELETE", body: JSON.stringify({ id: sub.id }) });
                                                    fetchCoursesAndSubjects();
                                                }
                                            }}>
                                                <Trash2 className="w-3 h-3"/>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
            )}
          </Card>
        ))}
      </div>

       {/* Add Subject Dialog - Using simplified inline conditional since shadcn Dialog might vary in setup */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-bold mb-4">Add Subject</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium">Subject Name</label>
                        <Input value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="e.g. C Programming"/>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Subject Code</label>
                        <Input value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} placeholder="e.g. CACS101"/>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                             <label className="text-sm font-medium">Credits</label>
                             <Input type="number" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: e.target.value})} />
                        </div>
                         <div className="flex-1">
                             <label className="text-sm font-medium">Type</label>
                             <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newSubject.type} onChange={e => setNewSubject({...newSubject, type: e.target.value})}>
                                <option value="Core">Core</option>
                                <option value="Elective">Elective</option>
                             </select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => setShowAddSubject(false)}>Cancel</Button>
                    <Button onClick={handleAddSubjectSubmit}>Save Subject</Button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
