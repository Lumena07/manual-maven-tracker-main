-- Add reason column to amendments table
ALTER TABLE amendments 
ADD COLUMN reason TEXT NOT NULL DEFAULT 'No reason provided';

-- Remove the default after adding the column
ALTER TABLE amendments 
ALTER COLUMN reason DROP DEFAULT; 