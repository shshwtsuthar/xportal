-- Add documentation comment to the function
COMMENT ON FUNCTION approve_application_atomic IS 
  'Atomically approves an application by creating student, enrollment, and copying all related data. 
   All operations are in a single transaction. External operations (files, auth, email) must be done separately.';
