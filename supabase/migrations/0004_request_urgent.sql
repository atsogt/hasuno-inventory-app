-- Lets a request be flagged urgent (surfaced when someone re-requests an item
-- they already have an open ask for, instead of creating a duplicate row).
alter table requests
  add column urgent boolean not null default false;
