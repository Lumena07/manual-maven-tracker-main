-- Enable Row Level Security on final_revisions table
ALTER TABLE final_revisions ENABLE ROW LEVEL SECURITY;

-- Policy for inserting final revisions (only authenticated users can insert)
CREATE POLICY "Authenticated users can insert final revisions"
ON final_revisions
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Policy for updating final revisions (only the user who created the revision can update it)
CREATE POLICY "Users can update their own final revisions"
ON final_revisions
FOR UPDATE
TO authenticated
USING (inserted_by = auth.uid())
WITH CHECK (inserted_by = auth.uid());

-- Policy for deleting final revisions (only the user who created the revision can delete it)
CREATE POLICY "Users can delete their own final revisions"
ON final_revisions
FOR DELETE
TO authenticated
USING (inserted_by = auth.uid());

-- Policy for viewing final revisions (all authenticated users can view)
CREATE POLICY "Authenticated users can view final revisions"
ON final_revisions
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated'); 