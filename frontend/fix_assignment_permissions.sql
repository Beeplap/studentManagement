-- Fix permissions for Teaching Assignments

-- 1. Enable RLS on teaching_assignments
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage assignments" ON teaching_assignments;
DROP POLICY IF EXISTS "Everyone can view assignments" ON teaching_assignments;

-- 3. Create Policy: Admins can do everything (Insert, Update, Delete, Select)
-- We check against the 'users' table for user role = 'admin'
CREATE POLICY "Admins can manage assignments"
ON teaching_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- 4. Create Policy: Everyone (Authenticated) can view assignments
-- Needed for students/teachers to see their schedule
CREATE POLICY "Everyone can view assignments"
ON teaching_assignments
FOR SELECT
USING (
  auth.role() = 'authenticated'
);
