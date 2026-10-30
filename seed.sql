-- Sample data for local development: npm run db:seed

INSERT INTO groups (id, name, kind, token) VALUES
  (1, 'Elm St house', 'home', 'a0000000000000000000000000000001'),
  (2, 'Civic', 'car', 'a0000000000000000000000000000002'),
  (3, 'Maple Ave house', 'home', 'a0000000000000000000000000000003');

UPDATE groups SET archived_at = datetime('now') WHERE id = 3;

INSERT INTO tasks (group_id, name, every, unit, starts_on, remind_days, miles, notes) VALUES
  (1, 'Replace HVAC filter', 3, 'month', '2026-11-14', 7, NULL, 'Filter size 16x25x1'),
  (1, 'Test smoke and CO detectors', 6, 'month', '2026-11-20', 7, NULL, NULL),
  (1, 'Clean gutters', 6, 'month', '2027-04-15', 14, NULL, NULL),
  (1, 'Flush water heater', 1, 'year', '2026-11-28', 14, NULL, NULL),
  (1, 'Clean dryer vent', 1, 'year', '2027-10-24', 14, NULL, NULL),
  (1, 'Deep clean kitchen', 3, 'month', '2026-12-02', 7, NULL, NULL),
  (2, 'Change oil', 6, 'month', '2026-11-03', 7, 5000, '0W-20, 4.4 qt'),
  (2, 'Rotate tires', 6, 'month', '2027-01-12', 7, 5000, NULL),
  (2, 'Replace cabin air filter', 1, 'year', '2027-04-01', 14, 15000, NULL),
  (3, 'Replace HVAC filter', 3, 'month', '2026-01-10', 7, NULL, NULL);
