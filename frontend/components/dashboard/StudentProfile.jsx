"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, Key } from "lucide-react";

export default function StudentProfile({ studentData, user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleChangePassword = () => {
    // In a real app, this would open a modal
    alert("Password change functionality would open here.");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <Card>
           <CardHeader>
               <CardTitle>Student Profile</CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
                <div className="flex flex-col items-center p-6 bg-purple-50 rounded-lg">
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                        {studentData?.full_name?.charAt(0) || "S"}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{studentData?.full_name}</h2>
                    <p className="text-gray-500">{user?.email}</p>
                    <p className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2">
                        Roll: {studentData?.roll} | Class: {studentData?.class}-{studentData?.section}
                    </p>
                </div>

                <div className="grid gap-4">
                     <div className="flex justify-between p-3 border rounded hover:bg-gray-50">
                         <span className="text-gray-500">Guardian Name</span>
                         <span className="font-medium">{studentData?.guardian_name || "N/A"}</span>
                     </div>
                     <div className="flex justify-between p-3 border rounded hover:bg-gray-50">
                         <span className="text-gray-500">Contact</span>
                         <span className="font-medium">{studentData?.phone_number || "N/A"}</span>
                     </div>
                     <div className="flex justify-between p-3 border rounded hover:bg-gray-50">
                         <span className="text-gray-500">Address</span>
                         <span className="font-medium">{studentData?.address || "N/A"}</span>
                     </div>
                </div>
           </CardContent>
       </Card>

       <Card>
           <CardContent className="p-4 space-y-3">
               <Button variant="outline" className="w-full justify-start" onClick={handleChangePassword}>
                   <Key className="w-4 h-4 mr-2" /> Change Password
               </Button>
               <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                   <LogOut className="w-4 h-4 mr-2" /> Sign Out
               </Button>
           </CardContent>
       </Card>
    </div>
  );
}
