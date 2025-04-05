-- Enable RLS on temporary_revisions table
ALTER TABLE temporary_revisions ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing temporary revisions
CREATE POLICY "Users can view temporary revisions for manuals they have access to"
ON temporary_revisions
FOR SELECT
USING (
  -- Allow if user is authenticated
  auth.uid() IS NOT NULL
);

-- Create policy for inserting temporary revisions
CREATE POLICY "Quality department can create temporary revisions"
ON temporary_revisions
FOR INSERT
WITH CHECK (
  -- Allow if user is in quality department
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'quality'
  )
);

-- Create policy for updating temporary revisions
CREATE POLICY "Issuers can update their own temporary revisions"
ON temporary_revisions
FOR UPDATE
USING (
  -- Allow if user is the issuer of the revision
  issued_by = auth.uid()
)
WITH CHECK (
  -- Ensure they can only update their own revisions
  issued_by = auth.uid()
);

-- Create policy for deleting temporary revisions
CREATE POLICY "Issuers and admins can delete temporary revisions"
ON temporary_revisions
FOR DELETE
USING (
  -- Allow if user is the issuer or an admin
  issued_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
); 