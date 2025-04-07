-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add company_id to manuals table
ALTER TABLE manuals
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index on company_id
CREATE INDEX IF NOT EXISTS idx_manuals_company_id ON manuals(company_id);

-- Add RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by authenticated users"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Companies are insertable by authenticated users"
    ON companies FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Companies are updatable by authenticated users"
    ON companies FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Companies are deletable by authenticated users"
    ON companies FOR DELETE
    TO authenticated
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for companies table
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 