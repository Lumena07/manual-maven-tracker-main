-- Add RLS policy for updating manual_sections
-- This policy allows the service role to update manual sections
-- which is necessary for the amendment approval trigger to work

-- First, ensure RLS is enabled on the manual_sections table
ALTER TABLE manual_sections ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to update manual sections
CREATE POLICY "Service role can update manual sections"
ON manual_sections
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create a policy that allows authenticated users to update manual sections
-- This is optional but might be useful for other parts of the application
CREATE POLICY "Authenticated users can update manual sections"
ON manual_sections
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated'); 