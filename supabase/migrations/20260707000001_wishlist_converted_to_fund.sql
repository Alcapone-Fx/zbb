ALTER TABLE wishlist_items
  ADD COLUMN converted_to_fund_id UUID REFERENCES sinking_funds(id) ON DELETE SET NULL;

COMMENT ON COLUMN wishlist_items.converted_to_fund_id IS
  'Set when this wishlist item was promoted to a sinking fund. NULL means still just an idea.
   ON DELETE SET NULL so deleting the fund later reverts the item to "not converted" instead of breaking.';
