-- Add doc_number to manuals table
ALTER TABLE manuals
ADD COLUMN IF NOT EXISTS doc_number TEXT;

-- Create index on doc_number
CREATE INDEX IF NOT EXISTS idx_manuals_doc_number ON manuals(doc_number); 