-- Create temporary revisions table
CREATE TABLE IF NOT EXISTS temporary_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    revision_number TEXT NOT NULL,
    manual_id UUID NOT NULL REFERENCES manuals(id),
    section_id UUID NOT NULL REFERENCES manual_sections(id),
    description TEXT NOT NULL,
    date_issued TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to generate revision number
CREATE OR REPLACE FUNCTION generate_revision_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    month TEXT;
    day TEXT;
    sequence_number INTEGER;
    revision_number TEXT;
BEGIN
    -- Get current date parts
    year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    month := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    day := LPAD(EXTRACT(DAY FROM CURRENT_DATE)::TEXT, 2, '0');
    
    -- Get next sequence number for the day
    SELECT COALESCE(MAX(CAST(SPLIT_PART(revision_number, '-', 4) AS INTEGER)), 0) + 1
    INTO sequence_number
    FROM temporary_revisions
    WHERE date_issued::DATE = CURRENT_DATE;
    
    -- Format revision number: YYYY-MM-DD-XXX
    revision_number := year || '-' || month || '-' || day || '-' || LPAD(sequence_number::TEXT, 3, '0');
    
    RETURN revision_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set revision number before insert
CREATE OR REPLACE FUNCTION set_revision_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.revision_number := generate_revision_number();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_revision_number_trigger
BEFORE INSERT ON temporary_revisions
FOR EACH ROW
EXECUTE FUNCTION set_revision_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_temporary_revisions_updated_at
BEFORE UPDATE ON temporary_revisions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 