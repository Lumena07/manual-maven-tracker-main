-- Create function to handle amendment approval
CREATE OR REPLACE FUNCTION handle_amendment_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the amendment was just approved by quality
  IF NEW.status = 'quality' AND (OLD.status IS NULL OR OLD.status != 'quality') THEN
    -- Insert a new temporary revision
    INSERT INTO temporary_revisions (
      manual_id,
      section_id,
      description,
      effective_date,
      expiry_date,
      issued_by
    ) VALUES (
      NEW.manual_id,
      NEW.section_id,
      'Amendment: ' || NEW.title,
      NEW.approved_by_quality_at,
      NEW.approved_by_quality_at + INTERVAL '30 days',
      NEW.approved_by_quality_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create temporary revision
CREATE TRIGGER create_temporary_revision_on_approval
AFTER UPDATE ON amendments
FOR EACH ROW
EXECUTE FUNCTION handle_amendment_approval(); 