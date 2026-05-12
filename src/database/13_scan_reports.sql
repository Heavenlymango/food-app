-- Scan reports: students submit feedback on food detection results.
-- Admins review these to improve model training data.

CREATE TABLE IF NOT EXISTS scan_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  detected_label      VARCHAR(100),          -- top prediction label
  detected_confidence DECIMAL(5,4),          -- 0.0 – 1.0
  model_used          VARCHAR(50),           -- 'mobilenet' | 'yolo_small'
  all_predictions     JSONB,                 -- full ranked prediction list
  is_correct          BOOLEAN NOT NULL,      -- did the model get it right?
  actual_label        VARCHAR(100),          -- filled when is_correct = false
  notes               TEXT,                  -- optional extra context
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_reports_created ON scan_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_reports_student ON scan_reports (student_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_incorrect ON scan_reports (is_correct) WHERE is_correct = false;

-- Students can insert their own reports; admins can read all
ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_insert_reports"
  ON scan_reports FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_read_own_reports"
  ON scan_reports FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Allow admins to read all (relies on user_metadata role = 'admin')
CREATE POLICY "admins_read_all_reports"
  ON scan_reports FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
