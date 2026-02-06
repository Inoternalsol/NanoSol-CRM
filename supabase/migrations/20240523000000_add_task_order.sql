-- Add position column to tasks table for Kanban ordering
ALTER TABLE "public"."tasks" ADD COLUMN "position" double precision DEFAULT 0;

-- Update existing tasks to have a default position based on creation date
WITH numbered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM tasks
)
UPDATE tasks
SET position = numbered_tasks.row_num * 1000
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;
