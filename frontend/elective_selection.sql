-- Elective Selection System Schema

-- 1. Create junction table for student-subject selection
CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL, -- Stored explicitly to lock it to the semester it was taken
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a student can't pick the same subject twice
  UNIQUE(student_id, subject_id)
);

-- 2. Enable RLS
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Students can view their own selections
CREATE POLICY "Students can view own selections"
ON student_subjects FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM students WHERE id = student_subjects.student_id
  )
);

-- Policy: Students can insert their own selections
CREATE POLICY "Students can insert own selections"
ON student_subjects FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM students WHERE id = student_subjects.student_id
  )
);

-- Policy: Students can delete their own selections
CREATE POLICY "Students can delete own selections"
ON student_subjects FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM students WHERE id = student_subjects.student_id
  )
);


-- Policy: Admins have full access
CREATE POLICY "Admins have full access"
ON student_subjects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- 4. Database Functions & Triggers for Validation

CREATE OR REPLACE FUNCTION check_elective_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_type TEXT;
  v_subject_semester INTEGER;
  v_student_semester INTEGER;
  v_current_count INTEGER;
  v_max_electives INTEGER := 2; -- Configurable limit
BEGIN
  -- 1. Check if the subject is an Elective
  SELECT type, semester INTO v_subject_type, v_subject_semester
  FROM subjects
  WHERE id = NEW.subject_id;

  IF v_subject_type IS DISTINCT FROM 'Elective' THEN
    RAISE EXCEPTION 'Only subjects with type "Elective" can be manually selected.';
  END IF;

  -- 2. Check if the student is in the correct semester for this elective
  -- Get student's current batch semester
  SELECT b.academic_unit INTO v_student_semester
  FROM students s
  JOIN batches b ON s.batch_id = b.id
  WHERE s.id = NEW.student_id;

  IF v_student_semester IS NULL THEN
     RAISE EXCEPTION 'Student is not assigned to a batch/semester.';
  END IF;

  IF v_subject_semester != v_student_semester THEN
    RAISE EXCEPTION 'You can only select electives for your current semester (%).', v_student_semester;
  END IF;

  -- 3. Check elective limit per semester
  SELECT COUNT(*) INTO v_current_count
  FROM student_subjects
  WHERE student_id = NEW.student_id
    AND semester = NEW.semester;

  IF v_current_count >= v_max_electives THEN
    RAISE EXCEPTION 'You cannot select more than % electives for this semester.', v_max_electives;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger
DROP TRIGGER IF EXISTS trigger_check_elective_rules ON student_subjects;

CREATE TRIGGER trigger_check_elective_rules
BEFORE INSERT ON student_subjects
FOR EACH ROW
EXECUTE FUNCTION check_elective_rules();
