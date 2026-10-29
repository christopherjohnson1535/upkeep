-- Sample data for local development: npm run db:seed

INSERT INTO items (id, name, category, every, unit, fallback_months, lead_days) VALUES
  (1, 'Change oil', 'car', 5000, 'mile', 6, 7),
  (2, 'Rotate tires', 'car', 5000, 'mile', 6, 7),
  (3, 'Replace HVAC filter', 'home', 3, 'month', NULL, 7),
  (4, 'Clean gutters', 'yard', 1, 'year', NULL, 14),
  (5, 'Test smoke detectors', 'home', 6, 'month', NULL, 7),
  (6, 'Flush water heater', 'home', 1, 'year', NULL, 14),
  (7, 'Clean dryer vent', 'home', 1, 'year', NULL, 14),
  (8, 'Deep clean fridge', 'home', 3, 'month', NULL, 7);

INSERT INTO completions (item_id, done_on, odometer) VALUES
  (1, '2026-05-03', 46100),
  (2, '2026-04-12', 45800),
  (3, '2026-08-14', NULL),
  (4, '2025-10-25', NULL),
  (5, '2026-05-20', NULL),
  (6, '2025-11-28', NULL),
  (7, '2026-10-24', NULL),
  (8, '2026-09-02', NULL);
