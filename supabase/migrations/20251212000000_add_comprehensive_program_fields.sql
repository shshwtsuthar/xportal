BEGIN;

-- Insert comprehensive Field of Education fields with hierarchical structure
INSERT INTO public.program_fields (id, label) VALUES
  -- 01 - Natural and Physical Sciences
  ('01', 'Natural and Physical Sciences'),
  ('0101', 'Mathematical Sciences'),
  ('0103', 'Physics and Astronomy'),
  ('0105', 'Chemical Sciences'),
  ('0107', 'Earth Sciences'),
  ('0109', 'Biological Sciences'),
  ('0199', 'Other Natural and Physical Sciences'),

  -- 02 - Information Technology
  ('02', 'Information Technology'),
  ('0201', 'Computer Science'),
  ('0203', 'Information Systems'),
  ('0299', 'Other Information Technology'),

  -- 03 - Engineering and Related Technologies
  ('03', 'Engineering and Related Technologies'),
  ('0301', 'Manufacturing Engineering and Technology'),
  ('0303', 'Process and Resources Engineering'),
  ('0305', 'Automotive Engineering and Technology'),
  ('0307', 'Mechanical and Industrial Engineering and Technology'),
  ('0309', 'Civil Engineering'),
  ('0311', 'Geomatic Engineering'),
  ('0313', 'Electrical and Electronic Engineering and Technology'),
  ('0315', 'Aerospace Engineering and Technology'),
  ('0317', 'Maritime Engineering and Technology'),
  ('0399', 'Other Engineering and Related Technologies'),

  -- 04 - Architecture and Building
  ('04', 'Architecture and Building'),
  ('0401', 'Architecture and Urban Environment'),
  ('0403', 'Building'),

  -- 05 - Agriculture, Environmental and Related Studies
  ('05', 'Agriculture, Environmental and Related Studies'),
  ('0501', 'Agriculture'),
  ('0503', 'Horticulture and Viticulture'),
  ('0505', 'Forestry Studies'),
  ('0507', 'Fisheries Studies'),
  ('0509', 'Environmental Studies'),
  ('0599', 'Other Agriculture, Environmental and Related Studies'),

  -- 06 - Health
  ('06', 'Health'),
  ('0601', 'Medical Studies'),
  ('0603', 'Nursing'),
  ('0605', 'Pharmacy'),
  ('0607', 'Dental Studies'),
  ('0609', 'Optical Science'),
  ('0611', 'Veterinary Studies'),
  ('0613', 'Public Health'),
  ('0615', 'Radiography'),
  ('0617', 'Rehabilitation Therapies'),
  ('0619', 'Complementary Therapies'),
  ('0699', 'Other Health'),

  -- 07 - Education
  ('07', 'Education'),
  ('0701', 'Teacher Education'),
  ('0703', 'Curriculum and Education Studies'),
  ('0799', 'Other Education'),

  -- 08 - Management and Commerce
  ('08', 'Management and Commerce'),
  ('0801', 'Accounting'),
  ('0803', 'Business and Management'),
  ('0805', 'Sales and Marketing'),
  ('0807', 'Tourism'),
  ('0809', 'Office Studies'),
  ('0811', 'Banking, Finance and Related Fields'),
  ('0899', 'Other Management and Commerce'),

  -- 09 - Society and Culture
  ('09', 'Society and Culture'),
  ('0901', 'Political Science and Policy Studies'),
  ('0903', 'Studies in Human Society'),
  ('0905', 'Human Welfare Studies and Services'),
  ('0907', 'Behavioural Science'),
  ('0909', 'Law'),
  ('0911', 'Justice and Law Enforcement'),
  ('0913', 'Librarianship, Information Management and Curatorial Studies'),
  ('0915', 'Language and Literature'),
  ('0917', 'Philosophy and Religious Studies'),
  ('0919', 'Economics and Econometrics'),
  ('0921', 'Sport and Recreation'),
  ('0999', 'Other Society and Culture'),

  -- 10 - Creative Arts
  ('10', 'Creative Arts'),
  ('1001', 'Performing Arts'),
  ('1003', 'Visual Arts and Crafts'),
  ('1005', 'Graphic and Design Studies'),
  ('1007', 'Communication and Media Studies'),
  ('1099', 'Other Creative Arts'),

  -- 11 - Food, Hospitality and Personal Services
  ('11', 'Food, Hospitality and Personal Services'),
  ('1101', 'Food and Hospitality'),
  ('1103', 'Personal Services'),

  -- 12 - Mixed Field Programmes
  ('12', 'Mixed Field Programmes'),
  ('1201', 'General Education Programmes'),
  ('1203', 'Social Skills Programmes'),
  ('1205', 'Employment Skills Programmes'),
  ('1299', 'Other Mixed Field Programmes')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label;

COMMIT;