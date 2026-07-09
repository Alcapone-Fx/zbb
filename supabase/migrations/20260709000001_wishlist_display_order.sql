ALTER TABLE wishlist_items ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve current display order (newest first) as the initial manual order.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM wishlist_items
)
UPDATE wishlist_items
SET display_order = ordered.rn
FROM ordered
WHERE wishlist_items.id = ordered.id;
