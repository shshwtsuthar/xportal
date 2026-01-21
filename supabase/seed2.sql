BEGIN;

-- Comprehensive Seed File for Certificate III in Carpentry
-- This seed file populates the database with:
-- - 34 carpentry subjects (Field of Education 0403)
-- - Certificate III in Carpentry program (CPC32220)
-- - 4 Program Plans (Intake 2025, 2026, 2027, 2028) with scheduled subjects

-- Ensure an initial RTO exists even with RLS enabled
SELECT public.seed_initial_data();

DO $$
DECLARE
  v_rto_id UUID;
  v_program_id UUID;
  v_program_plan_2025_id UUID;
  v_program_plan_2026_id UUID;
  v_program_plan_2027_id UUID;
  v_program_plan_2028_id UUID;
  v_timetable_2025_2026_id UUID;
  v_timetable_2026_2027_id UUID;
  v_timetable_2027_2028_id UUID;
  v_payment_plan_template_id UUID;
  v_inst_1_id UUID;
  v_inst_2_id UUID;
  v_inst_3_id UUID;
  v_inst_4_id UUID;
  v_inst_5_id UUID;
  v_inst_6_id UUID;
  v_inst_7_id UUID;
  v_inst_8_id UUID;
  v_inst_9_id UUID;
  v_inst_10_id UUID;
  v_inst_11_id UUID;
  v_inst_12_id UUID;
  v_offer_letter_mail_template_id UUID;
  v_subject_id UUID;
  v_location_geelong_id UUID;
  v_location_melbourne_id UUID;
  v_room2_id UUID;
  v_room4_id UUID;
  v_workshop_id UUID;
  v_group1_id UUID;
  v_group2_id UUID;
  v_group3_id UUID;
  v_group4_id UUID;
  v_group5_id UUID;
  v_subject_ids UUID[];
  v_start_date DATE;
  v_end_date DATE;
  v_current_plan_id UUID;
  v_plan_name TEXT;
BEGIN
  -- Get first RTO
  SELECT id INTO v_rto_id FROM public.rtos LIMIT 1;
  
  IF v_rto_id IS NULL THEN
    RAISE EXCEPTION 'No RTO found. Please create an RTO first.';
  END IF;

  -- Step 1: Ensure lookup values exist
  INSERT INTO public.program_levels (id, label) VALUES 
    ('514', 'Certificate III')
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

  INSERT INTO public.program_fields (id, label) VALUES 
    ('0401', 'Architecture and Urban Environment')
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

  INSERT INTO public.program_recognitions (id, label) VALUES 
    ('11', 'Nationally accredited qualification specified in a national training package')
  ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

  RAISE NOTICE 'Lookup values ensured';

  -- Step 2: Insert carpentry subjects with Field of Education Identifier 0403
  INSERT INTO public.subjects (
    rto_id,
    code,
    name,
    nominal_hours,
    field_of_education_id,
    vet_flag
  ) VALUES 
    (v_rto_id, 'CPCCWHS2001', 'Apply WHS requirements, policies and procedures in the construction industry', 20, '0403', 'Y'),
    (v_rto_id, 'CPCWHS3001', 'Identify construction work hazards and select risk control strategies', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA2011', 'Handle carpentry materials', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA2002', 'Use carpentry tools and equipment', 60, '0403', 'Y'),
    (v_rto_id, 'CPCCOM1012', 'Work effectively and sustainably in the construction industry', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3002', 'Carry out setting out', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3003', 'Install flooring systems', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3004', 'Construct and erect wall frames', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3005', 'Construct ceiling frames', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3006', 'Erect roof trusses', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3007', 'Construct pitched roofs', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3008', 'Construct eaves', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3010', 'Install windows and doors', 60, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3016', 'Construct, assemble and install timber external stairs', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3017', 'Install exterior cladding', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3024', 'Install lining, panelling and moulding', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3025', 'Read and interpret plans, specifications and drawings for carpentry work', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3028', 'Erect and dismantle formwork for footings and slabs on ground', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCM2006', 'Apply basic levelling procedures', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCM2008', 'Erect and dismantle restricted height scaffolding', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCO2013', 'Carry out concreting to simple forms', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCOM1014', 'Conduct workplace communication', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCOM3001', 'Perform construction calculations to determine carpentry material requirements', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCOM1015', 'Carry out measurements and calculations', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCOM3006', 'Carry out levelling operations', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCM3005', 'Calculate cost of construction work', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3012', 'Frame and fit wet area fixtures', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCM2002', 'Carry out hand excavation', 20, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3014', 'Construct and install bulkheads', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCJN3003', 'Manufacture components for doors, windows and frames', 60, '0403', 'Y'),
    (v_rto_id, 'CPCCSF2004', 'Place and fix reinforcement materials', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCA3001', 'Carry out general demolition of minor building structures', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCCM2012', 'Work safely at heights', 40, '0403', 'Y'),
    (v_rto_id, 'CPCCOM1013', 'Plan and organise work', 20, '0403', 'Y')
  ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    nominal_hours = EXCLUDED.nominal_hours,
    field_of_education_id = EXCLUDED.field_of_education_id,
    vet_flag = EXCLUDED.vet_flag;

  RAISE NOTICE 'Successfully inserted/updated 34 carpentry subjects with Field of Education ID 0403';

  -- Step 3: Create the Certificate III in Carpentry program
  INSERT INTO public.programs (
    rto_id,
    code,
    name,
    nominal_hours,
    level_of_education_id,
    field_of_education_id,
    recognition_id,
    vet_flag,
    anzsco_id,
    anzsic_id
  ) VALUES (
    v_rto_id,
    'CPC32220',
    'Certificate III in Carpentry',
    1680,
    '514',  -- Certificate III
    '0401', -- Architecture and Urban Environment
    '11',   -- Nationally accredited qualification specified in a national training package
    'Y',    -- VET program
    NULL,   -- ANZSCO Id
    NULL    -- ANZSIC Id
  )
  ON CONFLICT (rto_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    nominal_hours = EXCLUDED.nominal_hours,
    level_of_education_id = EXCLUDED.level_of_education_id,
    field_of_education_id = EXCLUDED.field_of_education_id,
    recognition_id = EXCLUDED.recognition_id,
    vet_flag = EXCLUDED.vet_flag,
    anzsco_id = EXCLUDED.anzsco_id,
    anzsic_id = EXCLUDED.anzsic_id
  RETURNING id INTO v_program_id;

  RAISE NOTICE 'Program created/updated: %', v_program_id;

  -- Step 4: Create Program Plans
  INSERT INTO public.program_plans (
    rto_id,
    program_id,
    name
  ) VALUES 
    (v_rto_id, v_program_id, 'Intake 2025'),
    (v_rto_id, v_program_id, 'Intake 2026'),
    (v_rto_id, v_program_id, 'Intake 2027'),
    (v_rto_id, v_program_id, 'Intake 2028')
  ON CONFLICT (program_id, name) DO UPDATE SET
    rto_id = EXCLUDED.rto_id,
    program_id = EXCLUDED.program_id;

  -- Get program plan IDs
  SELECT id INTO v_program_plan_2025_id FROM public.program_plans WHERE program_id = v_program_id AND name = 'Intake 2025' LIMIT 1;
  SELECT id INTO v_program_plan_2026_id FROM public.program_plans WHERE program_id = v_program_id AND name = 'Intake 2026' LIMIT 1;
  SELECT id INTO v_program_plan_2027_id FROM public.program_plans WHERE program_id = v_program_id AND name = 'Intake 2027' LIMIT 1;
  SELECT id INTO v_program_plan_2028_id FROM public.program_plans WHERE program_id = v_program_id AND name = 'Intake 2028' LIMIT 1;

  RAISE NOTICE 'Program plans created/updated: 2025=%, 2026=%, 2027=%, 2028=%', 
    v_program_plan_2025_id, v_program_plan_2026_id, v_program_plan_2027_id, v_program_plan_2028_id;

  -- Step 4b: Create timetables and link to program plans
  -- Timetable: Certificate III in Carpentry: 2025 - 2026 (Intake 2025 + Intake 2026)
  SELECT id INTO v_timetable_2025_2026_id
  FROM public.timetables
  WHERE program_id = v_program_id AND name = 'Certificate III in Carpentry: 2025 - 2026'
  LIMIT 1;

  IF v_timetable_2025_2026_id IS NULL THEN
    INSERT INTO public.timetables (rto_id, program_id, name, is_archived)
    VALUES (v_rto_id, v_program_id, 'Certificate III in Carpentry: 2025 - 2026', false)
    RETURNING id INTO v_timetable_2025_2026_id;
  END IF;

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2025_2026_id, v_program_plan_2025_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2025_2026_id AND program_plan_id = v_program_plan_2025_id
  );

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2025_2026_id, v_program_plan_2026_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2025_2026_id AND program_plan_id = v_program_plan_2026_id
  );

  -- Timetable: Certificate III in Carpentry: 2026 - 2027 (Intake 2026 + Intake 2027)
  SELECT id INTO v_timetable_2026_2027_id
  FROM public.timetables
  WHERE program_id = v_program_id AND name = 'Certificate III in Carpentry: 2026 - 2027'
  LIMIT 1;

  IF v_timetable_2026_2027_id IS NULL THEN
    INSERT INTO public.timetables (rto_id, program_id, name, is_archived)
    VALUES (v_rto_id, v_program_id, 'Certificate III in Carpentry: 2026 - 2027', false)
    RETURNING id INTO v_timetable_2026_2027_id;
  END IF;

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2026_2027_id, v_program_plan_2026_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2026_2027_id AND program_plan_id = v_program_plan_2026_id
  );

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2026_2027_id, v_program_plan_2027_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2026_2027_id AND program_plan_id = v_program_plan_2027_id
  );

  -- Timetable: Certificate III in Carpentry: 2027 - 2028 (Intake 2027 + Intake 2028)
  SELECT id INTO v_timetable_2027_2028_id
  FROM public.timetables
  WHERE program_id = v_program_id AND name = 'Certificate III in Carpentry: 2027 - 2028'
  LIMIT 1;

  IF v_timetable_2027_2028_id IS NULL THEN
    INSERT INTO public.timetables (rto_id, program_id, name, is_archived)
    VALUES (v_rto_id, v_program_id, 'Certificate III in Carpentry: 2027 - 2028', false)
    RETURNING id INTO v_timetable_2027_2028_id;
  END IF;

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2027_2028_id, v_program_plan_2027_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2027_2028_id AND program_plan_id = v_program_plan_2027_id
  );

  INSERT INTO public.timetable_program_plans (timetable_id, program_plan_id)
  SELECT v_timetable_2027_2028_id, v_program_plan_2028_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.timetable_program_plans 
    WHERE timetable_id = v_timetable_2027_2028_id AND program_plan_id = v_program_plan_2028_id
  );

  RAISE NOTICE 'Timetables created/linked: 2025-2026=%, 2026-2027=%, 2027-2028=%',
    v_timetable_2025_2026_id, v_timetable_2026_2027_id, v_timetable_2027_2028_id;

  -- Step 4c: Create Payment Plan Template + Installments + Lines
  -- Note: due dates are computed from an anchor date using due_date_rule_days offsets.
  SELECT id INTO v_payment_plan_template_id
  FROM public.payment_plan_templates
  WHERE program_id = v_program_id AND name = 'Certificate III in Carpentry - Standard'
  LIMIT 1;

  IF v_payment_plan_template_id IS NULL THEN
    INSERT INTO public.payment_plan_templates (
      rto_id,
      program_id,
      name,
      is_default,
      issue_date_offset_days,
      xero_account_code,
      xero_tax_type,
      xero_item_code
    ) VALUES (
      v_rto_id,
      v_program_id,
      'Certificate III in Carpentry - Standard',
      true,
      0,
      NULL,
      NULL,
      NULL
    )
    RETURNING id INTO v_payment_plan_template_id;
  ELSE
    UPDATE public.payment_plan_templates
    SET
      rto_id = v_rto_id,
      program_id = v_program_id,
      name = 'Certificate III in Carpentry - Standard',
      is_default = true,
      issue_date_offset_days = 0
    WHERE id = v_payment_plan_template_id;
  END IF;

  -- Ensure this is the only default template for this program
  UPDATE public.payment_plan_templates
  SET is_default = false
  WHERE program_id = v_program_id
    AND id <> v_payment_plan_template_id
    AND is_default = true;

  -- Upsert installments (amount_cents = sum of line items)
  -- Installment 1: offset 0 days, total $1,500.00
  SELECT id INTO v_inst_1_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 0 AND name = 'Installment 1'
  LIMIT 1;
  IF v_inst_1_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 1', 150000, 0, true, false)
    RETURNING id INTO v_inst_1_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 150000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_1_id;
  END IF;

  -- Installment 2: offset 30 days, total $1,250.00
  SELECT id INTO v_inst_2_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 30 AND name = 'Installment 2'
  LIMIT 1;
  IF v_inst_2_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 2', 125000, 30, true, false)
    RETURNING id INTO v_inst_2_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 125000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_2_id;
  END IF;

  -- Installment 3: offset 60 days, total $1,400.00
  SELECT id INTO v_inst_3_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 60 AND name = 'Installment 3'
  LIMIT 1;
  IF v_inst_3_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 3', 140000, 60, true, false)
    RETURNING id INTO v_inst_3_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 140000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_3_id;
  END IF;

  -- Installment 4: offset 90 days, total $1,150.00
  SELECT id INTO v_inst_4_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 90 AND name = 'Installment 4'
  LIMIT 1;
  IF v_inst_4_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 4', 115000, 90, true, false)
    RETURNING id INTO v_inst_4_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 115000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_4_id;
  END IF;

  -- Installment 5: offset 120 days, total $900.00
  SELECT id INTO v_inst_5_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 120 AND name = 'Installment 5'
  LIMIT 1;
  IF v_inst_5_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 5', 90000, 120, true, false)
    RETURNING id INTO v_inst_5_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_5_id;
  END IF;

  -- Installment 6: offset 150 days, total $900.00
  SELECT id INTO v_inst_6_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 150 AND name = 'Installment 6'
  LIMIT 1;
  IF v_inst_6_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 6', 90000, 150, true, false)
    RETURNING id INTO v_inst_6_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_6_id;
  END IF;

  -- Installment 7: offset 180 days, total $900.00
  SELECT id INTO v_inst_7_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 180 AND name = 'Installment 7'
  LIMIT 1;
  IF v_inst_7_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 7', 90000, 180, true, false)
    RETURNING id INTO v_inst_7_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_7_id;
  END IF;

  -- Installment 8: offset 210 days, total $900.00
  SELECT id INTO v_inst_8_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 210 AND name = 'Installment 8'
  LIMIT 1;
  IF v_inst_8_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 8', 90000, 210, true, false)
    RETURNING id INTO v_inst_8_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_8_id;
  END IF;

  -- Installment 9: offset 240 days, total $900.00
  SELECT id INTO v_inst_9_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 240 AND name = 'Installment 9'
  LIMIT 1;
  IF v_inst_9_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 9', 90000, 240, true, false)
    RETURNING id INTO v_inst_9_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_9_id;
  END IF;

  -- Installment 10: offset 270 days, total $900.00
  SELECT id INTO v_inst_10_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 270 AND name = 'Installment 10'
  LIMIT 1;
  IF v_inst_10_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 10', 90000, 270, true, false)
    RETURNING id INTO v_inst_10_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_10_id;
  END IF;

  -- Installment 11: offset 300 days, total $900.00
  SELECT id INTO v_inst_11_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 300 AND name = 'Installment 11'
  LIMIT 1;
  IF v_inst_11_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 11', 90000, 300, true, false)
    RETURNING id INTO v_inst_11_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_11_id;
  END IF;

  -- Installment 12: offset 330 days, total $900.00
  SELECT id INTO v_inst_12_id
  FROM public.payment_plan_template_installments
  WHERE template_id = v_payment_plan_template_id AND due_date_rule_days = 330 AND name = 'Installment 12'
  LIMIT 1;
  IF v_inst_12_id IS NULL THEN
    INSERT INTO public.payment_plan_template_installments (template_id, name, amount_cents, due_date_rule_days, is_commissionable, is_deposit)
    VALUES (v_payment_plan_template_id, 'Installment 12', 90000, 330, true, false)
    RETURNING id INTO v_inst_12_id;
  ELSE
    UPDATE public.payment_plan_template_installments
    SET amount_cents = 90000, is_commissionable = true, is_deposit = false
    WHERE id = v_inst_12_id;
  END IF;

  -- Replace lines to keep seed idempotent (no unique constraint on lines)
  DELETE FROM public.payment_plan_template_installment_lines
  WHERE installment_id IN (
    v_inst_1_id, v_inst_2_id, v_inst_3_id, v_inst_4_id, v_inst_5_id, v_inst_6_id,
    v_inst_7_id, v_inst_8_id, v_inst_9_id, v_inst_10_id, v_inst_11_id, v_inst_12_id
  );

  -- Installment 1 lines (Total $1,500.00)
  INSERT INTO public.payment_plan_template_installment_lines (
    installment_id, name, description, amount_cents, sequence_order, is_commissionable,
    xero_account_code, xero_tax_type, xero_item_code
  ) VALUES
    (v_inst_1_id, '1st Installment', NULL, 75000, 1, true, NULL, NULL, NULL),
    (v_inst_1_id, 'Enrolment Fee', NULL, 25000, 2, true, NULL, NULL, NULL),
    (v_inst_1_id, 'Promotional Material (1 CPC)', NULL, 50000, 3, true, NULL, NULL, NULL);

  -- Installment 2 lines (Total $1,250.00)
  INSERT INTO public.payment_plan_template_installment_lines (
    installment_id, name, description, amount_cents, sequence_order, is_commissionable,
    xero_account_code, xero_tax_type, xero_item_code
  ) VALUES
    (v_inst_2_id, '2nd Installment', NULL, 75000, 1, true, NULL, NULL, NULL),
    (v_inst_2_id, 'Promotional Material (2 CPC)', NULL, 50000, 2, true, NULL, NULL, NULL);

  -- Installment 3 lines (Total $1,400.00)
  INSERT INTO public.payment_plan_template_installment_lines (
    installment_id, name, description, amount_cents, sequence_order, is_commissionable,
    xero_account_code, xero_tax_type, xero_item_code
  ) VALUES
    (v_inst_3_id, '3rd Installment', NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_3_id, 'Promotional Material (3 CPC)', NULL, 50000, 2, true, NULL, NULL, NULL);

  -- Installment 4 lines (Total $1,150.00)
  INSERT INTO public.payment_plan_template_installment_lines (
    installment_id, name, description, amount_cents, sequence_order, is_commissionable,
    xero_account_code, xero_tax_type, xero_item_code
  ) VALUES
    (v_inst_4_id, '4th Installment', NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_4_id, 'Promotional Material (4 CPC)', NULL, 25000, 2, true, NULL, NULL, NULL);

  -- Installments 5–12 lines (single line each, $900.00)
  INSERT INTO public.payment_plan_template_installment_lines (
    installment_id, name, description, amount_cents, sequence_order, is_commissionable,
    xero_account_code, xero_tax_type, xero_item_code
  ) VALUES
    (v_inst_5_id,  '5th Installment',  NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_6_id,  '6th Installment',  NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_7_id,  '7th Installment',  NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_8_id,  '8th Installment',  NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_9_id,  '9th Installment',  NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_10_id, '10th Installment', NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_11_id, '11th Installment', NULL, 90000, 1, true, NULL, NULL, NULL),
    (v_inst_12_id, '12th Installment', NULL, 90000, 1, true, NULL, NULL, NULL);

  RAISE NOTICE 'Payment plan template seeded: %', v_payment_plan_template_id;

  -- Step 4d: Create Mail Template (Offer Letter)
  SELECT id INTO v_offer_letter_mail_template_id
  FROM public.mail_templates
  WHERE rto_id = v_rto_id
    AND name = 'Offer Letter Mail Template'
  LIMIT 1;

  IF v_offer_letter_mail_template_id IS NULL THEN
    INSERT INTO public.mail_templates (
      rto_id,
      name,
      subject,
      html_body,
      created_by
    ) VALUES (
      v_rto_id,
      'Offer Letter Mail Template',
      'Your application to Ashford College has been accepted! PFA Offer Letter',
      '<p>Hello,</p>' ||
      '<p>Please find your offer letter attached. If you have any questions about your offer or next steps, reply to this email and our team will be happy to help.</p>' ||
      '<p>Sincerely,<br/>Admin</p>',
      NULL
    )
    RETURNING id INTO v_offer_letter_mail_template_id;
  ELSE
    UPDATE public.mail_templates
    SET
      subject = 'Your application to Ashford College has been accepted! PFA Offer Letter',
      html_body =
        '<p>Hello,</p>' ||
        '<p>Please find your offer letter attached. If you have any questions about your offer or next steps, reply to this email and our team will be happy to help.</p>' ||
        '<p>Sincerely,<br/>Admin</p>'
    WHERE id = v_offer_letter_mail_template_id;
  END IF;

  RAISE NOTICE 'Mail template seeded (Offer Letter): %', v_offer_letter_mail_template_id;

  -- Step 5: Insert subjects into Program Plan 2025
  INSERT INTO public.program_plan_subjects (
    program_plan_id,
    subject_id,
    start_date,
    end_date,
    sequence_order,
    is_prerequisite
  )
  SELECT 
    v_program_plan_2025_id,
    s.id,
    data.start_date::date,
    data.end_date::date,
    data.seq,
    false -- No prerequisites
  FROM (
    VALUES
      ('CPCCWHS2001', '2025-02-03', '2025-02-09', 1),
      ('CPCWHS3001', '2025-02-10', '2025-02-16', 2),
      ('CPCCCA2011', '2025-02-17', '2025-02-23', 3),
      ('CPCCCA2002', '2025-02-24', '2025-03-16', 4),
      ('CPCCOM1012', '2025-03-17', '2025-03-23', 5),
      ('CPCCCA3002', '2025-03-24', '2025-03-30', 6),
      ('CPCCCA3003', '2025-03-31', '2025-04-06', 7),
      ('CPCCCA3004', '2025-04-07', '2025-04-20', 8),
      ('CPCCCA3005', '2025-04-21', '2025-04-27', 9),
      -- Term Break: 2025-04-28 to 2025-05-04 (skip)
      ('CPCCCA3006', '2025-05-05', '2025-05-11', 10),
      ('CPCCCA3007', '2025-05-12', '2025-05-25', 11),
      ('CPCCCA3008', '2025-05-26', '2025-06-01', 12),
      ('CPCCCA3010', '2025-06-02', '2025-06-22', 13),
      ('CPCCCA3016', '2025-06-23', '2025-06-29', 14),
      ('CPCCCA3017', '2025-06-30', '2025-07-06', 15),
      ('CPCCCA3024', '2025-07-07', '2025-07-20', 16),
      ('CPCCCA3025', '2025-07-21', '2025-07-27', 17),
      -- Term Break: 2025-07-28 to 2025-08-03 (skip)
      ('CPCCCA3028', '2025-08-04', '2025-08-17', 18),
      ('CPCCCM2006', '2025-08-18', '2025-08-24', 19),
      ('CPCCCM2008', '2025-08-25', '2025-08-31', 20),
      ('CPCCCO2013', '2025-09-01', '2025-09-07', 21),
      ('CPCCOM1014', '2025-09-08', '2025-09-14', 22),
      ('CPCCOM3001', '2025-09-15', '2025-09-21', 23),
      ('CPCCOM1015', '2025-09-22', '2025-09-28', 24),
      ('CPCCOM3006', '2025-09-29', '2025-10-05', 25),
      ('CPCCCM3005', '2025-10-06', '2025-10-12', 26),
      ('CPCCCA3012', '2025-10-13', '2025-10-19', 27),
      ('CPCCCM2002', '2025-10-20', '2025-10-26', 28),
      -- Term Break: 2025-10-27 to 2025-11-02 (skip)
      ('CPCCCA3014', '2025-11-03', '2025-11-16', 29),
      ('CPCCJN3003', '2025-11-17', '2025-12-07', 30),
      ('CPCCSF2004', '2025-12-08', '2025-12-21', 31),
      -- Term Break: 2025-12-22 to 2025-12-28 (skip)
      ('CPCCCA3001', '2025-12-29', '2026-01-11', 32),
      ('CPCCCM2012', '2026-01-12', '2026-01-25', 33),
      ('CPCCOM1013', '2026-01-26', '2026-02-01', 34)
  ) AS data(code, start_date, end_date, seq)
  JOIN public.subjects s ON s.code = data.code AND s.rto_id = v_rto_id
  ON CONFLICT (program_plan_id, subject_id, start_date) DO UPDATE SET
    end_date = EXCLUDED.end_date,
    sequence_order = EXCLUDED.sequence_order,
    is_prerequisite = EXCLUDED.is_prerequisite;

  RAISE NOTICE 'Program Plan 2025 subjects inserted/updated: 34 subjects';

  -- Step 6: Insert subjects into Program Plan 2026
  INSERT INTO public.program_plan_subjects (
    program_plan_id,
    subject_id,
    start_date,
    end_date,
    sequence_order,
    is_prerequisite
  )
  SELECT 
    v_program_plan_2026_id,
    s.id,
    data.start_date::date,
    data.end_date::date,
    data.seq,
    false -- No prerequisites
  FROM (
    VALUES
      ('CPCCWHS2001', '2026-02-02', '2026-02-08', 1),
      ('CPCWHS3001', '2026-02-09', '2026-02-15', 2),
      ('CPCCCA2011', '2026-02-16', '2026-02-22', 3),
      ('CPCCCA2002', '2026-02-23', '2026-03-15', 4),
      ('CPCCOM1012', '2026-03-16', '2026-03-22', 5),
      ('CPCCCA3002', '2026-03-23', '2026-03-29', 6),
      ('CPCCCA3003', '2026-03-30', '2026-04-05', 7),
      ('CPCCCA3004', '2026-04-06', '2026-04-19', 8),
      ('CPCCCA3005', '2026-04-20', '2026-04-26', 9),
      -- Term Break: 2026-04-27 to 2026-05-03 (skip)
      ('CPCCCA3006', '2026-05-04', '2026-05-10', 10),
      ('CPCCCA3007', '2026-05-11', '2026-05-24', 11),
      ('CPCCCA3008', '2026-05-25', '2026-05-31', 12),
      ('CPCCCA3010', '2026-06-01', '2026-06-21', 13),
      ('CPCCCA3016', '2026-06-22', '2026-06-28', 14),
      ('CPCCCA3017', '2026-06-29', '2026-07-05', 15),
      ('CPCCCA3024', '2026-07-06', '2026-07-19', 16),
      ('CPCCCA3025', '2026-07-20', '2026-07-26', 17),
      -- Term Break: 2026-07-27 to 2026-08-02 (skip)
      ('CPCCCA3028', '2026-08-03', '2026-08-16', 18),
      ('CPCCCM2006', '2026-08-17', '2026-08-23', 19),
      ('CPCCCM2008', '2026-08-24', '2026-08-30', 20),
      ('CPCCCO2013', '2026-08-31', '2026-09-06', 21),
      ('CPCCOM1014', '2026-09-07', '2026-09-13', 22),
      ('CPCCOM3001', '2026-09-14', '2026-09-20', 23),
      ('CPCCOM1015', '2026-09-21', '2026-09-27', 24),
      ('CPCCOM3006', '2026-09-28', '2026-10-04', 25),
      ('CPCCCM3005', '2026-10-05', '2026-10-11', 26),
      ('CPCCCA3012', '2026-10-12', '2026-10-18', 27),
      ('CPCCCM2002', '2026-10-19', '2026-10-25', 28),
      -- Term Break: 2026-10-26 to 2026-11-01 (skip)
      ('CPCCCA3014', '2026-11-02', '2026-11-15', 29),
      ('CPCCJN3003', '2026-11-16', '2026-12-06', 30),
      ('CPCCSF2004', '2026-12-07', '2026-12-20', 31),
      -- Term Break: 2026-12-21 to 2026-12-27 (skip)
      ('CPCCCA3001', '2026-12-28', '2027-01-10', 32),
      ('CPCCCM2012', '2027-01-11', '2027-01-24', 33),
      ('CPCCOM1013', '2027-01-25', '2027-01-31', 34)
  ) AS data(code, start_date, end_date, seq)
  JOIN public.subjects s ON s.code = data.code AND s.rto_id = v_rto_id
  ON CONFLICT (program_plan_id, subject_id, start_date) DO UPDATE SET
    end_date = EXCLUDED.end_date,
    sequence_order = EXCLUDED.sequence_order,
    is_prerequisite = EXCLUDED.is_prerequisite;

  RAISE NOTICE 'Program Plan 2026 subjects inserted/updated: 34 subjects';

  -- Step 7: Insert subjects into Program Plan 2027
  INSERT INTO public.program_plan_subjects (
    program_plan_id,
    subject_id,
    start_date,
    end_date,
    sequence_order,
    is_prerequisite
  )
  SELECT 
    v_program_plan_2027_id,
    s.id,
    data.start_date::date,
    data.end_date::date,
    data.seq,
    false -- No prerequisites
  FROM (
    VALUES
      ('CPCCWHS2001', '2027-02-01', '2027-02-07', 1),
      ('CPCWHS3001', '2027-02-08', '2027-02-14', 2),
      ('CPCCCA2011', '2027-02-15', '2027-02-21', 3),
      ('CPCCCA2002', '2027-02-22', '2027-03-14', 4),
      ('CPCCOM1012', '2027-03-15', '2027-03-21', 5),
      ('CPCCCA3002', '2027-03-22', '2027-03-28', 6),
      ('CPCCCA3003', '2027-03-29', '2027-04-04', 7),
      ('CPCCCA3004', '2027-04-05', '2027-04-18', 8),
      ('CPCCCA3005', '2027-04-19', '2027-04-25', 9),
      -- Term Break: 2027-04-26 to 2027-05-02 (skip)
      ('CPCCCA3006', '2027-05-03', '2027-05-09', 10),
      ('CPCCCA3007', '2027-05-10', '2027-05-23', 11),
      ('CPCCCA3008', '2027-05-24', '2027-05-30', 12),
      ('CPCCCA3010', '2027-05-31', '2027-06-20', 13),
      ('CPCCCA3016', '2027-06-21', '2027-06-27', 14),
      ('CPCCCA3017', '2027-06-28', '2027-07-04', 15),
      ('CPCCCA3024', '2027-07-05', '2027-07-18', 16),
      ('CPCCCA3025', '2027-07-19', '2027-07-25', 17),
      -- Term Break: 2027-07-26 to 2027-08-01 (skip)
      ('CPCCCA3028', '2027-08-02', '2027-08-15', 18),
      ('CPCCCM2006', '2027-08-16', '2027-08-22', 19),
      ('CPCCCM2008', '2027-08-23', '2027-08-29', 20),
      ('CPCCCO2013', '2027-08-30', '2027-09-05', 21),
      ('CPCCOM1014', '2027-09-06', '2027-09-12', 22),
      ('CPCCOM3001', '2027-09-13', '2027-09-19', 23),
      ('CPCCOM1015', '2027-09-20', '2027-09-26', 24),
      ('CPCCOM3006', '2027-09-27', '2027-10-03', 25),
      ('CPCCCM3005', '2027-10-04', '2027-10-10', 26),
      ('CPCCCA3012', '2027-10-11', '2027-10-17', 27),
      ('CPCCCM2002', '2027-10-18', '2027-10-24', 28),
      -- Term Break: 2027-10-25 to 2027-10-31 (skip)
      ('CPCCCA3014', '2027-11-01', '2027-11-14', 29),
      ('CPCCJN3003', '2027-11-15', '2027-12-05', 30),
      ('CPCCSF2004', '2027-12-06', '2027-12-19', 31),
      -- Term Break: 2027-12-20 to 2027-12-26 (skip)
      ('CPCCCA3001', '2027-12-27', '2028-01-09', 32),
      ('CPCCCM2012', '2028-01-10', '2028-01-23', 33),
      ('CPCCOM1013', '2028-01-24', '2028-01-30', 34)
  ) AS data(code, start_date, end_date, seq)
  JOIN public.subjects s ON s.code = data.code AND s.rto_id = v_rto_id
  ON CONFLICT (program_plan_id, subject_id, start_date) DO UPDATE SET
    end_date = EXCLUDED.end_date,
    sequence_order = EXCLUDED.sequence_order,
    is_prerequisite = EXCLUDED.is_prerequisite;

  RAISE NOTICE 'Program Plan 2027 subjects inserted/updated: 34 subjects';

  -- Step 8: Insert subjects into Program Plan 2028
  INSERT INTO public.program_plan_subjects (
    program_plan_id,
    subject_id,
    start_date,
    end_date,
    sequence_order,
    is_prerequisite
  )
  SELECT 
    v_program_plan_2028_id,
    s.id,
    data.start_date::date,
    data.end_date::date,
    data.seq,
    false -- No prerequisites
  FROM (
    VALUES
      ('CPCCWHS2001', '2028-01-31', '2028-02-06', 1),
      ('CPCWHS3001', '2028-02-07', '2028-02-13', 2),
      ('CPCCCA2011', '2028-02-14', '2028-02-20', 3),
      ('CPCCCA2002', '2028-02-21', '2028-03-12', 4),
      ('CPCCOM1012', '2028-03-13', '2028-03-19', 5),
      ('CPCCCA3002', '2028-03-20', '2028-03-26', 6),
      ('CPCCCA3003', '2028-03-27', '2028-04-02', 7),
      ('CPCCCA3004', '2028-04-03', '2028-04-16', 8),
      ('CPCCCA3005', '2028-04-17', '2028-04-23', 9),
      -- Term Break: 2028-04-24 to 2028-04-30 (skip)
      ('CPCCCA3006', '2028-05-01', '2028-05-07', 10),
      ('CPCCCA3007', '2028-05-08', '2028-05-21', 11),
      ('CPCCCA3008', '2028-05-22', '2028-05-28', 12),
      ('CPCCCA3010', '2028-05-29', '2028-06-18', 13),
      ('CPCCCA3016', '2028-06-19', '2028-06-25', 14),
      ('CPCCCA3017', '2028-06-26', '2028-07-02', 15),
      ('CPCCCA3024', '2028-07-03', '2028-07-16', 16),
      ('CPCCCA3025', '2028-07-17', '2028-07-23', 17),
      -- Term Break: 2028-07-24 to 2028-07-30 (skip)
      ('CPCCCA3028', '2028-07-31', '2028-08-13', 18),
      ('CPCCCM2006', '2028-08-14', '2028-08-20', 19),
      ('CPCCCM2008', '2028-08-21', '2028-08-27', 20),
      ('CPCCCO2013', '2028-08-28', '2028-09-03', 21),
      ('CPCCOM1014', '2028-09-04', '2028-09-10', 22),
      ('CPCCOM3001', '2028-09-11', '2028-09-17', 23),
      ('CPCCOM1015', '2028-09-18', '2028-09-24', 24),
      ('CPCCOM3006', '2028-09-25', '2028-10-01', 25),
      ('CPCCCM3005', '2028-10-02', '2028-10-08', 26),
      ('CPCCCA3012', '2028-10-09', '2028-10-15', 27),
      ('CPCCCM2002', '2028-10-16', '2028-10-22', 28),
      -- Term Break: 2028-10-23 to 2028-10-29 (skip)
      ('CPCCCA3014', '2028-10-30', '2028-11-12', 29),
      ('CPCCJN3003', '2028-11-13', '2028-12-03', 30),
      ('CPCCSF2004', '2028-12-04', '2028-12-17', 31),
      -- Term Break: 2028-12-18 to 2028-12-24 (skip)
      ('CPCCCA3001', '2028-12-25', '2029-01-07', 32),
      ('CPCCCM2012', '2029-01-08', '2029-01-21', 33),
      ('CPCCOM1013', '2029-01-22', '2029-01-28', 34)
  ) AS data(code, start_date, end_date, seq)
  JOIN public.subjects s ON s.code = data.code AND s.rto_id = v_rto_id
  ON CONFLICT (program_plan_id, subject_id, start_date) DO UPDATE SET
    end_date = EXCLUDED.end_date,
    sequence_order = EXCLUDED.sequence_order,
    is_prerequisite = EXCLUDED.is_prerequisite;

  RAISE NOTICE 'Program Plan 2028 subjects inserted/updated: 34 subjects';

  -- Step 9: Create Geelong Main Campus location
  INSERT INTO public.delivery_locations (
    rto_id,
    location_id_internal,
    name,
    building_property_name,
    flat_unit_details,
    street_number,
    street_name,
    suburb,
    state,
    postcode
  ) VALUES (
    v_rto_id,
    'GEE-MAIN',
    'Geelong Main Campus',
    NULL,
    'Level 3',
    '65',
    'Brougham St',
    'Geelong',
    'VIC',
    '3220'
  )
  ON CONFLICT (rto_id, location_id_internal) DO UPDATE SET
    name = EXCLUDED.name,
    building_property_name = EXCLUDED.building_property_name,
    flat_unit_details = EXCLUDED.flat_unit_details,
    street_number = EXCLUDED.street_number,
    street_name = EXCLUDED.street_name,
    suburb = EXCLUDED.suburb,
    state = EXCLUDED.state,
    postcode = EXCLUDED.postcode
  RETURNING id INTO v_location_geelong_id;

  RAISE NOTICE 'Geelong Main Campus location created/updated: %', v_location_geelong_id;

  -- Step 10: Create 5 classrooms for Geelong Main Campus
  INSERT INTO public.classrooms (
    rto_id,
    location_id,
    name,
    type,
    capacity,
    status
  ) VALUES
    (v_rto_id, v_location_geelong_id, 'Room 1', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Room 2', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Room 3', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Room 4', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Room 5', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Carpentry Workshop', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Kitchen', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Painting Workshop', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_geelong_id, 'Building Site', 'WORKSHOP', 100, 'AVAILABLE')
  ON CONFLICT (location_id, name) DO UPDATE SET
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    status = EXCLUDED.status;

  RAISE NOTICE 'Created classrooms for Geelong Main Campus';

  -- Step 11: Create 5 groups for Geelong Main Campus
  INSERT INTO public.groups (
    rto_id,
    program_id,
    location_id,
    name,
    max_capacity
  ) VALUES
    (v_rto_id, v_program_id, v_location_geelong_id, 'Carpentry Group 1', 20),
    (v_rto_id, v_program_id, v_location_geelong_id, 'Carpentry Group 2', 20),
    (v_rto_id, v_program_id, v_location_geelong_id, 'Carpentry Group 3', 20),
    (v_rto_id, v_program_id, v_location_geelong_id, 'Carpentry Group 4', 20),
    (v_rto_id, v_program_id, v_location_geelong_id, 'Carpentry Group 5', 20)
  ON CONFLICT (program_id, location_id, name) DO UPDATE SET
    rto_id = EXCLUDED.rto_id,
    program_id = EXCLUDED.program_id,
    location_id = EXCLUDED.location_id,
    max_capacity = EXCLUDED.max_capacity;

  RAISE NOTICE 'Created 5 groups for Geelong Main Campus';

  -- Step 12: Create Melbourne Main Campus location
  INSERT INTO public.delivery_locations (
    rto_id,
    location_id_internal,
    name,
    building_property_name,
    flat_unit_details,
    street_number,
    street_name,
    suburb,
    state,
    postcode
  ) VALUES (
    v_rto_id,
    'MEL-MAIN',
    'Melbourne Main Campus',
    NULL,
    '5G & 6G',
    '427',
    'Docklands Dr',
    'Docklands',
    'VIC',
    '3008'
  )
  ON CONFLICT (rto_id, location_id_internal) DO UPDATE SET
    name = EXCLUDED.name,
    building_property_name = EXCLUDED.building_property_name,
    flat_unit_details = EXCLUDED.flat_unit_details,
    street_number = EXCLUDED.street_number,
    street_name = EXCLUDED.street_name,
    suburb = EXCLUDED.suburb,
    state = EXCLUDED.state,
    postcode = EXCLUDED.postcode
  RETURNING id INTO v_location_melbourne_id;

  RAISE NOTICE 'Melbourne Main Campus location created/updated: %', v_location_melbourne_id;

  -- Step 13: Create 2 classrooms for Melbourne Main Campus
  INSERT INTO public.classrooms (
    rto_id,
    location_id,
    name,
    type,
    capacity,
    status
  ) VALUES
    (v_rto_id, v_location_melbourne_id, 'Room 1', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_melbourne_id, 'Room 2', 'CLASSROOM', 20, 'AVAILABLE'),
    (v_rto_id, v_location_melbourne_id, 'Building Site', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_melbourne_id, 'Painting Workshop', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_melbourne_id, 'Carpentry Workshop', 'WORKSHOP', 100, 'AVAILABLE'),
    (v_rto_id, v_location_melbourne_id, 'Kitchen', 'WORKSHOP', 100, 'AVAILABLE')
  ON CONFLICT (location_id, name) DO UPDATE SET
    type = EXCLUDED.type,
    capacity = EXCLUDED.capacity,
    status = EXCLUDED.status;

  RAISE NOTICE 'Created classrooms for Melbourne Main Campus';

  -- Step 14: Create 5 groups for Melbourne Main Campus
  INSERT INTO public.groups (
    rto_id,
    program_id,
    location_id,
    name,
    max_capacity
  ) VALUES
    (v_rto_id, v_program_id, v_location_melbourne_id, 'Carpentry Group 1', 20),
    (v_rto_id, v_program_id, v_location_melbourne_id, 'Carpentry Group 2', 20),
    (v_rto_id, v_program_id, v_location_melbourne_id, 'Carpentry Group 3', 20),
    (v_rto_id, v_program_id, v_location_melbourne_id, 'Carpentry Group 4', 20),
    (v_rto_id, v_program_id, v_location_melbourne_id, 'Carpentry Group 5', 20)
  ON CONFLICT (program_id, location_id, name) DO UPDATE SET
    rto_id = EXCLUDED.rto_id,
    program_id = EXCLUDED.program_id,
    location_id = EXCLUDED.location_id,
    max_capacity = EXCLUDED.max_capacity;

  RAISE NOTICE 'Created 5 groups for Melbourne Main Campus';

  -- Step 15: Create recurring classes for Intake 2025 (Geelong Carpentry groups)
  -- Resolve Geelong classrooms
  SELECT id INTO v_room2_id
  FROM public.classrooms
  WHERE location_id = v_location_geelong_id AND name = 'Room 2'
  LIMIT 1;

  SELECT id INTO v_room4_id
  FROM public.classrooms
  WHERE location_id = v_location_geelong_id AND name = 'Room 4'
  LIMIT 1;

  SELECT id INTO v_workshop_id
  FROM public.classrooms
  WHERE location_id = v_location_geelong_id AND name = 'Carpentry Workshop'
  LIMIT 1;

  IF v_room2_id IS NULL OR v_room4_id IS NULL OR v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Missing classroom IDs (Room 2, Room 4, Carpentry Workshop)';
  END IF;

  -- Resolve Geelong groups
  SELECT id INTO v_group1_id FROM public.groups WHERE program_id = v_program_id AND location_id = v_location_geelong_id AND name = 'Carpentry Group 1' LIMIT 1;
  SELECT id INTO v_group2_id FROM public.groups WHERE program_id = v_program_id AND location_id = v_location_geelong_id AND name = 'Carpentry Group 2' LIMIT 1;
  SELECT id INTO v_group3_id FROM public.groups WHERE program_id = v_program_id AND location_id = v_location_geelong_id AND name = 'Carpentry Group 3' LIMIT 1;
  SELECT id INTO v_group4_id FROM public.groups WHERE program_id = v_program_id AND location_id = v_location_geelong_id AND name = 'Carpentry Group 4' LIMIT 1;
  SELECT id INTO v_group5_id FROM public.groups WHERE program_id = v_program_id AND location_id = v_location_geelong_id AND name = 'Carpentry Group 5' LIMIT 1;

  IF v_group1_id IS NULL OR v_group2_id IS NULL OR v_group3_id IS NULL OR v_group4_id IS NULL OR v_group5_id IS NULL THEN
    RAISE EXCEPTION 'Missing one or more Carpentry Group IDs for Geelong';
  END IF;

  -- Apply recurring class pattern to all intakes (2025–2028) with identical schedules
  FOREACH v_current_plan_id IN ARRAY ARRAY[
    v_program_plan_2025_id,
    v_program_plan_2026_id,
    v_program_plan_2027_id,
    v_program_plan_2028_id
  ]
  LOOP
    SELECT name INTO v_plan_name
    FROM public.program_plans
    WHERE id = v_current_plan_id
    LIMIT 1;

    SELECT ARRAY_AGG(id ORDER BY sequence_order) INTO v_subject_ids
    FROM public.program_plan_subjects
    WHERE program_plan_id = v_current_plan_id;

    IF v_subject_ids IS NULL OR array_length(v_subject_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'No subjects found for %', COALESCE(v_plan_name, 'unknown plan');
    END IF;

    SELECT MIN(start_date), MAX(end_date) INTO v_start_date, v_end_date
    FROM public.program_plan_subjects
    WHERE program_plan_id = v_current_plan_id;

    -- Helper: weekly pattern builder (Postgres DOW: 0=Sun ... 6=Sat)
    -- CAR 1 (Group 1) – Theory: Sat+Sun 08:00–17:00, Room 2
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(6, 0)),
      v_start_date, v_end_date,
      '08:00', '17:00',
      NULL, v_location_geelong_id, v_room2_id, v_group1_id, 'THEORY', NULL, true
    );

    -- CAR 1 (Group 1) – Workshop: Fri 08:00–12:15, Carpentry Workshop
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(5)),
      v_start_date, v_end_date,
      '08:00', '12:15',
      NULL, v_location_geelong_id, v_workshop_id, v_group1_id, 'WORKSHOP', NULL, true
    );

    -- CAR 2 (Group 2) – Theory: Wed+Thu 08:00–17:00, Room 2
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(3, 4)),
      v_start_date, v_end_date,
      '08:00', '17:00',
      NULL, v_location_geelong_id, v_room2_id, v_group2_id, 'THEORY', NULL, true
    );

    -- CAR 2 (Group 2) – Workshop: Sat 12:45–17:00, Carpentry Workshop
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(6)),
      v_start_date, v_end_date,
      '12:45', '17:00',
      NULL, v_location_geelong_id, v_workshop_id, v_group2_id, 'WORKSHOP', NULL, true
    );

    -- CAR 3 (Group 3) – Theory: Mon+Tue 08:00–17:00, Room 2
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(1, 2)),
      v_start_date, v_end_date,
      '08:00', '17:00',
      NULL, v_location_geelong_id, v_room2_id, v_group3_id, 'THEORY', NULL, true
    );

    -- CAR 3 (Group 3) – Workshop: Sun 08:00–12:15, Carpentry Workshop
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(0)),
      v_start_date, v_end_date,
      '08:00', '12:15',
      NULL, v_location_geelong_id, v_workshop_id, v_group3_id, 'WORKSHOP', NULL, true
    );

    -- CAR 4 (Group 4) – Theory: Sat+Sun 08:00–17:00, Room 4
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(6, 0)),
      v_start_date, v_end_date,
      '08:00', '17:00',
      NULL, v_location_geelong_id, v_room4_id, v_group4_id, 'THEORY', NULL, true
    );

    -- CAR 4 (Group 4) – Workshop: Thu 17:15–21:30, Carpentry Workshop
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(4)),
      v_start_date, v_end_date,
      '17:15', '21:30',
      NULL, v_location_geelong_id, v_workshop_id, v_group4_id, 'WORKSHOP', NULL, true
    );

    -- CAR 5 (Group 5) – Theory: Mon+Tue 17:15–21:30, Room 2
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(1, 2)),
      v_start_date, v_end_date,
      '17:15', '21:30',
      NULL, v_location_geelong_id, v_room2_id, v_group5_id, 'THEORY', NULL, true
    );

    -- CAR 5 (Group 5) – Theory: Fri 08:00–17:00, Room 2
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(5)),
      v_start_date, v_end_date,
      '08:00', '17:00',
      NULL, v_location_geelong_id, v_room2_id, v_group5_id, 'THEORY', NULL, true
    );

    -- CAR 5 (Group 5) – Workshop: Thu 08:00–12:15, Carpentry Workshop
    PERFORM public.create_recurring_classes_batch(
      v_current_plan_id, v_subject_ids,
      'weekly',
      jsonb_build_object('interval', 1, 'days_of_week', jsonb_build_array(4)),
      v_start_date, v_end_date,
      '08:00', '12:15',
      NULL, v_location_geelong_id, v_workshop_id, v_group5_id, 'WORKSHOP', NULL, true
    );

    RAISE NOTICE 'Recurring classes created for %', COALESCE(v_plan_name, v_current_plan_id::text);
  END LOOP;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Program ID: %', v_program_id;
  RAISE NOTICE 'Program Plan IDs: 2025=%, 2026=%, 2027=%, 2028=%', 
    v_program_plan_2025_id, v_program_plan_2026_id, v_program_plan_2027_id, v_program_plan_2028_id;
  RAISE NOTICE 'Location IDs: Geelong=%, Melbourne=%', 
    v_location_geelong_id, v_location_melbourne_id;

END $$;

COMMIT;
