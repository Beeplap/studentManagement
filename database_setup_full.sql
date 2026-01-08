-- -----------------------------------------------------------------------------
-- SCHOLARSYNC COMPLETE DATABASE SETUP
-- -----------------------------------------------------------------------------
-- This script creates all tables required for the Admin, Teacher, and Student dashboards.
-- It assumes 'users', 'students', and 'teachers' tables already exist (as per your request).
-- -----------------------------------------------------------------------------

-- 1. CLASSES TABLE
-- Stores class details. Includes 'subject' assuming a class is subject-specific (e.g. "Math - Grade 10 A")
-- 1. CLASSES TABLE
-- Stores class details.
-- Course: BCA (Semesters 1-8), BBS (Years 1-4), BEd (Years 1-4)
-- Section: Only for BBS and BEd
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  subject text NOT NULL, -- The subject name (e.g. "Java Programming")
  course text NOT NULL CHECK (course IN ('BCA', 'BBS', 'BEd')),
  semester text NOT NULL, -- Stores "1", "2" etc. representing Semester for BCA or Year for others.
  section text, -- Nullable, used for BBS/BEd
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_teacher_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id)
);


-- 2. SUBJECTS TABLE (For Admin Management)
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

-- 3. ATTENDANCE TABLE
-- Tracks daily attendance per student per class.
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid, -- Teacher ID
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_class_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT attendance_unique_entry UNIQUE (student_id, date, class_id)
);

-- 4. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_teacher_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id),
  CONSTRAINT assignments_class_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

-- 5. SUBMISSIONS TABLE
-- Student submissions for assignments.
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  content text,  -- Text answer or description
  file_url text, -- Link to uploaded file
  grade numeric,
  feedback text,
  status text DEFAULT 'submitted', -- 'submitted', 'graded', 'late'
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_assignment_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT submissions_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT submissions_unique_entry UNIQUE (student_id, assignment_id)
);

-- 6. MARKS TABLE
-- Stores exam results. Linked to 'classes' table for subject context.
CREATE TABLE IF NOT EXISTS public.marks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL, -- Serves as the subject identifier
  exam_type text NOT NULL, -- e.g. 'Mid Term', 'Final'
  marks_obtained numeric,
  total_marks numeric DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT marks_pkey PRIMARY KEY (id),
  CONSTRAINT marks_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT marks_class_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT marks_unique_entry UNIQUE (student_id, class_id, exam_type)
);

-- 7. NOTICES TABLE
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  target text DEFAULT 'All Students',
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT notices_pkey PRIMARY KEY (id)
);

-- 8. FEES TABLE (For Admin)
CREATE TABLE IF NOT EXISTS public.fees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'Pending', -- 'Paid', 'Pending', 'Overdue'
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fees_pkey PRIMARY KEY (id),
  CONSTRAINT fees_student_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

-- 9. (Optional) Enable Row Level Security (RLS) policies here if needed.
-- For now, tables are created open or inheriting default schema permissions.
