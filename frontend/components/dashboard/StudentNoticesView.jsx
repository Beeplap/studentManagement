"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, Calendar } from "lucide-react";

export default function StudentNoticesView() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    // Ideally filter by role or class. For now, fetch generic.
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setNotices(data);
  };

  return (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="text-purple-600" /> Use Notices
        </h2>
        
        <div className="grid gap-4">
            {notices.map(notice => (
                <Card key={notice.id} className="hover:shadow-md transition">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                {notice.title}
                            </CardTitle>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(notice.date || notice.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
                    </CardContent>
                </Card>
            ))}
             {notices.length === 0 && (
                 <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                     No notices available at this time.
                 </div>
             )}
        </div>
    </div>
  );
}
