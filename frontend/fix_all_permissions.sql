-- Fix permissions for ALL Academic Tables
-- Run this script to ensure Admins have full access and Users can view data.

-- A. Batches Table
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON batches;
DROP POLICY IF EXISTS "Everyone can view batches" ON batches;

CREATE POLICY "Admins have full access" ON batches FOR ALL
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Everyone can view batches" ON batches FOR SELECT
USING ( true ); -- Public/Authenticated read access for dropdowns

-- B. Courses Table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON courses;
DROP POLICY IF EXISTS "Everyone can view courses" ON courses;

CREATE POLICY "Admins have full access" ON courses FOR ALL
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Everyone can view courses" ON courses FOR SELECT
USING ( true );

-- C. Subjects Table
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON subjects;
DROP POLICY IF EXISTS "Everyone can view subjects" ON subjects;

CREATE POLICY "Admins have full access" ON subjects FOR ALL
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT
USING ( true );

-- D. Teaching Assignments Table (Re-applying for safety)
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON teaching_assignments;
DROP POLICY IF EXISTS "Everyone can view assignments" ON teaching_assignments;

CREATE POLICY "Admins have full access" ON teaching_assignments FOR ALL
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Everyone can view assignments" ON teaching_assignments FOR SELECT
USING ( true );

-- E. Ensure Users Table is Readable by Authenticated Users (Self & Admin)
-- Be careful with users table policies as it affects auth.
-- Assuming existing policies are sufficient, but if checkAdmin failed on reading users, ensure:
-- (This part depends on existing users RLS, adding a safe 'admin read all' might help if missing)
-- CREATE POLICY "Admins can view all users" ON users FOR SELECT USING ( ... );
