-- Adds two seller-controlled badge override flags to menu_items.
--
-- These do NOT change the classifier itself — they only suppress the
-- corresponding badge in the UI for a single item. Useful for:
--   - hide_healthy_badge:    item is healthy in the DB (is_healthy=true)
--                            but the seller doesn't want the green leaf
--                            shown (e.g. they prefer the auto-classifier
--                            to render it as a heavy meal warning instead).
--   - hide_unhealthy_badge:  classifier flags the item but the seller
--                            disagrees (e.g. a freshly-rolled spring roll
--                            caught by the NOVA "Snacks" rule).

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS hide_healthy_badge   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_unhealthy_badge boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.menu_items.hide_healthy_badge
  IS 'Seller override: suppress the green Healthy leaf badge for this item.';

COMMENT ON COLUMN public.menu_items.hide_unhealthy_badge
  IS 'Seller override: suppress the auto-classifier Unhealthy / Heavy meal badge for this item.';
