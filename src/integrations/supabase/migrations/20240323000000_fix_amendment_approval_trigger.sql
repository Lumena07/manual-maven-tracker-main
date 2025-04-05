-- Create a function to generate sequential revision numbers for a specific manual
CREATE OR REPLACE FUNCTION generate_sequential_revision_number(manual_id UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the next sequence number for this specific manual
    SELECT COALESCE(MAX(CAST(revision_number AS INTEGER)), 0) + 1
    INTO next_number
    FROM temporary_revisions
    WHERE temporary_revisions.manual_id = generate_sequential_revision_number.manual_id;
    
    -- Return the next number as text
    RETURN next_number::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create a function to highlight changes within a line
CREATE OR REPLACE FUNCTION highlight_line_changes(original_line TEXT, new_line TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    i INTEGER;
    j INTEGER;
    k INTEGER;
    match_found BOOLEAN;
    match_length INTEGER;
    max_match_length INTEGER;
    best_match_start INTEGER;
    best_match_length INTEGER;
    prefix TEXT;
    suffix TEXT;
    changed_part TEXT;
BEGIN
    -- If lines are identical, return as is
    IF original_line = new_line THEN
        RETURN new_line;
    END IF;
    
    -- Find the longest common substring
    max_match_length := 0;
    best_match_start := 0;
    best_match_length := 0;
    
    FOR i IN 1..length(original_line) LOOP
        FOR j IN 1..length(new_line) LOOP
            match_length := 0;
            WHILE i + match_length <= length(original_line) AND 
                  j + match_length <= length(new_line) AND 
                  substring(original_line FROM i FOR match_length + 1) = 
                  substring(new_line FROM j FOR match_length + 1) LOOP
                match_length := match_length + 1;
            END LOOP;
            
            IF match_length > max_match_length THEN
                max_match_length := match_length;
                best_match_start := j;
                best_match_length := match_length;
            END IF;
        END LOOP;
    END LOOP;
    
    -- If no significant match found, mark the entire line as changed
    IF max_match_length < 3 THEN
        RETURN '| ' || new_line;
    END IF;
    
    -- Extract the unchanged parts and the changed part
    prefix := substring(new_line FROM 1 FOR best_match_start - 1);
    changed_part := substring(new_line FROM best_match_start FOR best_match_length);
    suffix := substring(new_line FROM best_match_start + best_match_length);
    
    -- Return the line with the changed part marked
    RETURN prefix || '|' || changed_part || '|' || suffix;
END;
$$ LANGUAGE plpgsql;

-- Create a function to mark changed lines with a vertical bar
CREATE OR REPLACE FUNCTION mark_changed_lines(original_content TEXT, new_content TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    orig_lines TEXT[];
    new_lines TEXT[];
    i INTEGER;
    max_lines INTEGER;
    orig_line TEXT;
    new_line TEXT;
    line_changed BOOLEAN;
    paragraph_start INTEGER;
    paragraph_end INTEGER;
    paragraph_text TEXT;
    paragraph_changed BOOLEAN;
BEGIN
    -- Split both contents into arrays of lines
    orig_lines := string_to_array(original_content, E'\n');
    new_lines := string_to_array(new_content, E'\n');
    
    -- Determine the maximum number of lines
    max_lines := GREATEST(array_length(orig_lines, 1), array_length(new_lines, 1));
    
    -- If either array is empty, handle it
    IF array_length(orig_lines, 1) IS NULL THEN
        orig_lines := ARRAY[]::TEXT[];
    END IF;
    
    IF array_length(new_lines, 1) IS NULL THEN
        new_lines := ARRAY[]::TEXT[];
    END IF;
    
    -- Compare each line and mark changes
    FOR i IN 1..max_lines LOOP
        -- If we've reached the end of one of the arrays, just add the remaining lines
        IF i > array_length(orig_lines, 1) THEN
            -- This is a new line in the new content
            result := result || '| ' || new_lines[i] || E'\n';
        ELSIF i > array_length(new_lines, 1) THEN
            -- This line was removed in the new content - mark it with a vertical bar
            result := result || '| ' || orig_lines[i] || E'\n';
        ELSE
            -- Get the current lines
            orig_line := orig_lines[i];
            new_line := new_lines[i];
            
            -- Check if the lines are different
            IF orig_line = new_line THEN
                -- Lines are identical, no change
                result := result || new_line || E'\n';
            ELSE
                -- Lines are different, mark the new line with a vertical bar at the beginning
                result := result || '| ' || new_line || E'\n';
            END IF;
        END IF;
    END LOOP;
    
    -- Remove trailing newline
    IF length(result) > 0 AND substring(result FROM length(result) FOR 1) = E'\n' THEN
        result := substring(result FROM 1 FOR length(result) - 1);
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update the amendment approval trigger function
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

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS create_temporary_revision_on_approval ON amendments;

-- Create the trigger
CREATE TRIGGER create_temporary_revision_on_approval
    AFTER UPDATE ON amendments
    FOR EACH ROW
    EXECUTE FUNCTION handle_amendment_approval(); 