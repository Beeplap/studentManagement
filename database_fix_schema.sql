-- -----------------------------------------------------------------------------
-- SCHOLARSYNC DATABASE FIX & UPDATE
-- -----------------------------------------------------------------------------
-- Run this script to ensure your 'users', 'students', and 'teachers' tables 
-- match what the application expects.
-- -----------------------------------------------------------------------------

-- 1. USERS TABLE
-- Ensure it has necessary columns and correct role constraints.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  role text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Add columns if they are missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update Role Check Constraint to allow 'student'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'teacher', 'student', 'staff'));


-- 2. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  teacher_id text UNIQUE,
  full_name text,
  email text,
  phone_number text,
  specialization text,
  qualification text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. STUDENTS TABLE
-- Needs many columns for the registration form
CREATE TABLE IF NOT EXISTS public.students (
  id uuid REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  roll text UNIQUE,
  full_name text,
  class text, -- Stores "BCA", "BBS", etc.
  section text,
  gender text,
  phone_number text,
  guardian_name text,
  guardian_phone text,
  guardian_contact text,
  emergency_contact text,
  address text,
  dob date,
  admission_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- Add columns if they are missing (for existing table)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_contact text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_date date;

-- 4. ENABLE RLS (Optional but recommended)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow insert/select for now (Simplified Policies)
CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all for teachers" ON public.teachers FOR ALL USING (true);
CREATE POLICY "Enable all for students" ON public.students FOR ALL USING (true);
