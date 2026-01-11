-- 1. Create 'courses' table
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- e.g., 'BCA', 'BBS'
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Semester', 'Yearly')) NOT NULL,
  duration INTEGER NOT NULL, -- e.g., 8 for BCA, 4 for BBS
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to 'subjects' table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS semester INTEGER, -- 1-8 or 1-4
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Core',
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Seed initial courses
INSERT INTO courses (code, name, type, duration) VALUES
('BCA', 'Bachelor of Computer Application', 'Semester', 8),
('BBS', 'Bachelor of Business Studies', 'Yearly', 4),
('BEd', 'Bachelor of Education', 'Yearly', 4)
ON CONFLICT (code) DO NOTHING;
