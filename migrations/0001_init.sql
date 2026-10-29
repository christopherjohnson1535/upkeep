CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'home',
  every INTEGER NOT NULL CHECK (every > 0),
  unit TEXT NOT NULL CHECK (unit IN ('day', 'week', 'month', 'year', 'mile')),
  -- mileage items also come due on time, since nobody reads the odometer between visits
  fallback_months INTEGER,
  lead_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE completions (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  done_on TEXT NOT NULL,
  odometer INTEGER,
  note TEXT
);

CREATE INDEX completions_item ON completions (item_id, done_on);
