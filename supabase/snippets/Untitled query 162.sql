-- Applications that have student_id_display generated (submitted)
SELECT 
  id,
  application_id_display,
  student_id_display,
  status,
  created_at,
  updated_at
FROM public.applications
WHERE student_id_display IS NOT NULL
ORDER BY created_at DESC;