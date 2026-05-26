-- Migrate legacy assignment status values to the new pipeline.
-- Old: Open | In Progress | Submitted | Approved | Finalized | Archived
-- New: Open | Active      | Under Review | Completed          | Archived
UPDATE assignments SET status = 'Active'       WHERE status = 'In Progress';
UPDATE assignments SET status = 'Under Review' WHERE status = 'Submitted';
UPDATE assignments SET status = 'Completed'    WHERE status = 'Approved';
UPDATE assignments SET status = 'Completed'    WHERE status = 'Finalized';

NOTIFY pgrst, 'reload schema';
