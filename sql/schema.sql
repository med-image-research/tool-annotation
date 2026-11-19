CREATE TABLE IF NOT EXISTS reference_findings (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  rf_label TEXT NOT NULL,
  rf_index INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  finding_text TEXT NOT NULL,
  csv_status TEXT NOT NULL DEFAULT 'Pre-annotated',
  boxes JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_boxes JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  impression_relevance_prior TEXT NOT NULL DEFAULT 'yes',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_findings_image_id
  ON reference_findings (image_id, rf_index);

CREATE INDEX IF NOT EXISTS idx_reference_findings_status
  ON reference_findings (verification_status);
