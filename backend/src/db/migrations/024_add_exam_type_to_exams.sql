ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS exam_type_id UUID REFERENCES exam_types(id);
