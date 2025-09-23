ALTER TABLE sms_op.application_documents
  DROP CONSTRAINT IF EXISTS application_documents_doc_type_check;

ALTER TABLE sms_op.application_documents
  ADD CONSTRAINT application_documents_doc_type_check
  CHECK (doc_type IN ('OFFER_LETTER','COE','EVIDENCE','OTHER'));