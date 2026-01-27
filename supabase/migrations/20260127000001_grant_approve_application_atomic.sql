-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_application_atomic(UUID, UUID) TO authenticated;
