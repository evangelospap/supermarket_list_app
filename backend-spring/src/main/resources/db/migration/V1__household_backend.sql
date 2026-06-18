CREATE TABLE app_users (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('GOOGLE', 'GUEST')),
  google_sub TEXT UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE households (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code_hash TEXT NOT NULL UNIQUE,
  invite_code_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE household_members (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE household_categories (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, name),
  UNIQUE (household_id, sort_order)
);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES household_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  status TEXT NOT NULL CHECK (status IN ('needed', 'notNeeded', 'have')),
  quantity_count INTEGER NOT NULL DEFAULT 1,
  quantity_note TEXT NOT NULL DEFAULT '',
  estimated_price TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE home_snapshots (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE home_snapshot_items (
  id UUID PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES home_snapshots(id) ON DELETE CASCADE,
  source_item_id UUID,
  barcode TEXT,
  category_name TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity_count INTEGER NOT NULL DEFAULT 1,
  quantity_note TEXT NOT NULL DEFAULT '',
  estimated_price TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL
);

CREATE TABLE barcode_products (
  barcode TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  quantity TEXT,
  preferred_category TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE household_state_snapshots (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE household_events (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_members_user ON household_members(user_id);
CREATE INDEX idx_items_household ON shopping_items(household_id);
CREATE INDEX idx_items_barcode ON shopping_items(barcode);
CREATE INDEX idx_events_household_time ON household_events(household_id, occurred_at DESC);
