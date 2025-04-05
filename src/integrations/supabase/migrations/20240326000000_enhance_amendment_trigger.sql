-- Enhance the amendment approval trigger function with better error handling and logging
CREATE OR REPLACE FUNCTION handle_amendment_approval()
RETURNS TRIGGER AS $$
DECLARE
    new_revision_number TEXT;
    section_exists BOOLEAN;
    update_result INTEGER;
BEGIN
    -- Check if the amendment was just approved by quality
    IF NEW.status = 'quality' AND (OLD.status IS NULL OR OLD.status != 'quality') THEN
        -- Log the start of the process
        RAISE NOTICE 'Amendment approval process started for amendment ID: %', NEW.id;
        RAISE NOTICE 'Section ID: %, Manual ID: %', NEW.section_id, NEW.manual_id;
        
        -- Check if the section exists
        SELECT EXISTS (
            SELECT 1 FROM manual_sections WHERE id = NEW.section_id
        ) INTO section_exists;
        
        IF NOT section_exists THEN
            RAISE NOTICE 'Section with ID % does not exist', NEW.section_id;
            RETURN NEW;
        END IF;
        
        -- Generate a new revision number specific to this manual
        BEGIN
            new_revision_number := generate_sequential_revision_number(NEW.manual_id);
            RAISE NOTICE 'Generated revision number: %', new_revision_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error generating revision number: %', SQLERRM;
                RETURN NEW;
        END;
        
        -- Update the section content with the amended content
        BEGIN
            UPDATE manual_sections
            SET content = NEW.content,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.section_id;
            
            GET DIAGNOSTICS update_result = ROW_COUNT;
            RAISE NOTICE 'Section update affected % rows', update_result;
            
            IF update_result = 0 THEN
                RAISE NOTICE 'No rows were updated in manual_sections table';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error updating section content: %', SQLERRM;
                RETURN NEW;
        END;
        
        -- Insert a new temporary revision
        BEGIN
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
            RAISE NOTICE 'Temporary revision created successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error creating temporary revision: %', SQLERRM;
                RETURN NEW;
        END;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE NOTICE 'Error in handle_amendment_approval: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS create_temporary_revision_on_approval ON amendments;

-- Create the trigger
CREATE TRIGGER create_temporary_revision_on_approval
    AFTER UPDATE ON amendments
    FOR EACH ROW
    EXECUTE FUNCTION handle_amendment_approval(); 