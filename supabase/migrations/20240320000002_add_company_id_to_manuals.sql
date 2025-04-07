-- Add company_id to manuals table
ALTER TABLE manuals
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index on company_id
CREATE INDEX IF NOT EXISTS idx_manuals_company_id ON manuals(company_id);

-- Update RLS policies for manuals table
DROP POLICY IF EXISTS "Manuals are viewable by authenticated users" ON manuals;
DROP POLICY IF EXISTS "Manuals are insertable by authenticated users" ON manuals;
DROP POLICY IF EXISTS "Manuals are updatable by authenticated users" ON manuals;
DROP POLICY IF EXISTS "Manuals are deletable by authenticated users" ON manuals;

CREATE POLICY "Users can view manuals from their companies"
    ON manuals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE user_id = auth.uid()
            AND company_id = manuals.company_id
        )
    );

CREATE POLICY "Users can create manuals for their companies"
    ON manuals FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE user_id = auth.uid()
            AND company_id = NEW.company_id
        )
    );

CREATE POLICY "Users can update manuals from their companies"
    ON manuals FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE user_id = auth.uid()
            AND company_id = OLD.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE user_id = auth.uid()
            AND company_id = NEW.company_id
        )
    );

CREATE POLICY "Users can delete manuals from their companies"
    ON manuals FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE user_id = auth.uid()
            AND company_id = OLD.company_id
        )
    ); 