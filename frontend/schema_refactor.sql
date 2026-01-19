-- Refactor Schema: Final Version
-- Replaces 'classes' with 'batches' (Academic Groups) and 'teaching_assignments'.
-- Links 'students' to 'batches'.

-- 1. DROP legacy table (WARNING: Data Loss)
DROP TABLE IF EXISTS classes CASCADE;

-- 2. CREATE 'batches' table (Academic Group)
-- Represents a specific group of students studying together (e.g., BCA Sem 3 Section A)
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_unit INTEGER NOT NULL, -- Semester or Year number
  section TEXT, -- e.g. 'A', can be NULL
  admission_year INTEGER, -- Optional: when they joined
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate batch definitions
  UNIQUE (course_id, academic_unit, section)
);

-- 3. CREATE 'teaching_assignments' table
-- Maps a Teacher to a Subject for a Batch.
CREATE TABLE IF NOT EXISTS teaching_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- References users, not teachers table
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One subject in a batch has only one teacher (initially)
  UNIQUE (batch_id, subject_id)
);

-- 4. UPDATE 'students' table
-- Add direct link to the batch they belong to.
ALTER TABLE students
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id);

-- Note:
-- 'students.class' and 'students.section' are now deprecated.
-- You should migrate existing student data to 'batch_id' manually if needed, 
-- or start fresh by assigning batches in the dashboard.
