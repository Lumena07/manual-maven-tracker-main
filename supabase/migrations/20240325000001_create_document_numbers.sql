-- Create document_numbers table
CREATE TABLE IF NOT EXISTS document_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
    doc_number TEXT NOT NULL,
    doc_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on manual_id
CREATE INDEX IF NOT EXISTS idx_document_numbers_manual_id ON document_numbers(manual_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document_numbers table
CREATE TRIGGER update_document_numbers_updated_at
    BEFORE UPDATE ON document_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_document_numbers_updated_at();

-- Add RLS policies
ALTER TABLE document_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document numbers are viewable by authenticated users"
    ON document_numbers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Document numbers are insertable by authenticated users"
    ON document_numbers FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Document numbers are updatable by authenticated users"
    ON document_numbers FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Document numbers are deletable by authenticated users"
    ON document_numbers FOR DELETE
    TO authenticated
    USING (true); 