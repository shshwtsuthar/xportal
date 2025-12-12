BEGIN;

-- Insert comprehensive AQF Level (Program Level of Education) fields
INSERT INTO public.program_levels (id, label) VALUES
  -- Graduate Levels
  ('211', 'Graduate diploma'),
  ('221', 'Graduate certificate'),

  -- Bachelor Levels
  ('311', 'Bachelor degree (Honours)'),
  ('312', 'Bachelor degree (pass)'),

  -- Diploma & Advanced Diploma Levels
  ('411', 'Advanced diploma'),
  ('413', 'Associate degree'),
  ('421', 'Diploma'),

  -- Certificate Levels
  ('511', 'Certificate IV'),
  ('514', 'Certificate III'),
  ('521', 'Certificate II'),
  ('524', 'Certificate I'),

  -- School Levels
  ('611', 'Year 12'),
  ('613', 'Year 11'),
  ('621', 'Year 10'),

  -- Miscellaneous / Non-AQF
  ('912', 'Other non-award courses'),
  ('991', 'Statement of attainment not identifiable by level'),
  ('992', 'Bridging and enabling courses not identifiable by level'),
  ('999', 'Education not elsewhere classified')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label;

-- Insert comprehensive Recognition Status (Program Recognition Identifier) fields
INSERT INTO public.program_recognitions (id, label) VALUES
  -- Nationally Recognised
  ('11', 'Nationally accredited qualification specified in a national training package'),
  ('12', 'Nationally recognised accredited course (other than a qualification specified in a national training package)'),
  ('13', 'Nationally recognised skill set specified in a national training package'),

  -- Not Nationally Recognised
  ('14', 'Other course (e.g., local course developed by the RTO)'),

  -- Other
  ('15', 'Higher-level qualification (other than training package qualification or nationally recognised accredited course)'),
  ('16', 'Locally recognised skill set')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label;

COMMIT;