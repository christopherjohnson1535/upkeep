-- Tasks now repeat on a fixed schedule and live in groups, one calendar per group.
-- Existing items move into a "Home" group, starting from their next due date.

PRAGMA defer_foreign_keys = on;

CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'home' CHECK (kind IN ('home', 'car', 'other')),
  token TEXT NOT NULL UNIQUE,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  every INTEGER NOT NULL CHECK (every > 0),
  unit TEXT NOT NULL CHECK (unit IN ('day', 'week', 'month', 'year')),
  starts_on TEXT NOT NULL,
  remind_days INTEGER NOT NULL DEFAULT 7,
  -- shown in the event as "or every N miles"; calendars can't track an odometer
  miles INTEGER,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX tasks_group ON tasks (group_id);

INSERT INTO groups (id, name, kind, token)
SELECT 1, 'Home', 'home', lower(hex(randomblob(16)))
WHERE EXISTS (SELECT 1 FROM items);

INSERT INTO tasks (group_id, name, every, unit, starts_on, remind_days, miles, notes)
SELECT
  1,
  i.name,
  CASE WHEN i.unit = 'mile' THEN coalesce(i.fallback_months, 6) ELSE i.every END,
  CASE WHEN i.unit = 'mile' THEN 'month' ELSE i.unit END,
  CASE i.unit
    WHEN 'day' THEN date(c.done_on, '+' || i.every || ' days')
    WHEN 'week' THEN date(c.done_on, '+' || (i.every * 7) || ' days')
    WHEN 'month' THEN date(c.done_on, '+' || i.every || ' months')
    WHEN 'year' THEN date(c.done_on, '+' || i.every || ' years')
    ELSE date(c.done_on, '+' || coalesce(i.fallback_months, 6) || ' months')
  END,
  i.lead_days,
  CASE WHEN i.unit = 'mile' THEN i.every END,
  i.notes
FROM items i
JOIN completions c ON c.id = (
  SELECT id FROM completions WHERE item_id = i.id ORDER BY done_on DESC, id DESC LIMIT 1
);

DROP TABLE completions;
DROP TABLE items;
