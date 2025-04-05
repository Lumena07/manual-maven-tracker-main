-- Fix the amendment approval trigger function to properly update section content
CREATE OR REPLACE FUNCTION handle_amendment_approval()
RETURNS TRIGGER AS $$
DECLARE
    new_revision_number TEXT;
BEGIN
    -- Check if the amendment was just approved by quality
    IF NEW.status = 'quality' AND (OLD.status IS NULL OR OLD.status != 'quality') THEN
        -- Generate a new revision number specific to this manual
        new_revision_number := generate_sequential_revision_number(NEW.manual_id);
        
        -- Update the section content with the amended content
        UPDATE manual_sections
        SET content = NEW.content,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.section_id;
        
        -- Insert a new temporary revision
        INSERT INTO temporary_revisions (
            revision_number,
            manual_id,
            section_id,
            description,
            effective_date,
            expiry_date,
            issued_by
        ) VALUES (
            new_revision_number,
            NEW.manual_id,
            NEW.section_id,
            'Amendment: ' || NEW.title,
            NEW.approved_by_quality_at,
            NEW.approved_by_quality_at + INTERVAL '30 days',
            NEW.approved_by_quality_by
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (you can replace this with your preferred logging method)
        RAISE NOTICE 'Error in handle_amendment_approval: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql; 