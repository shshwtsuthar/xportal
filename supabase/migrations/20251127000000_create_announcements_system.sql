-- create_announcements_system.sql
-- Purpose: Create comprehensive announcements system with flexible recipient filtering,
-- multi-medium support, read receipts, and advanced features

BEGIN;

-- 1) Enums for announcement status and priority
CREATE TYPE announcement_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');
CREATE TYPE announcement_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

COMMENT ON TYPE announcement_status IS 'Status of an announcement: DRAFT (not sent), SCHEDULED (scheduled for future), SENT (delivered), CANCELLED (cancelled before sending)';
COMMENT ON TYPE announcement_priority IS 'Priority level of an announcement for display and sorting purposes';

-- 2) Main announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    
    -- Content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Filtering & Recipients
    recipient_filter_criteria JSONB NOT NULL, -- Stores flexible filter configuration
    medium_selection JSONB NOT NULL, -- Array of selected mediums: ['announcement', 'sms', 'mail', 'whatsapp']
    
    -- Status & Scheduling
    status announcement_status NOT NULL DEFAULT 'DRAFT',
    scheduled_send_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Advanced Features
    priority announcement_priority NOT NULL DEFAULT 'NORMAL',
    tags TEXT[], -- Array of tag strings
    expiry_date DATE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.announcements IS 'Stores announcements with flexible recipient filtering and multi-medium support.';
COMMENT ON COLUMN public.announcements.recipient_filter_criteria IS 'JSONB structure: { recipientType: "students"|"applications", filters: {...} }';
COMMENT ON COLUMN public.announcements.medium_selection IS 'JSONB array of selected delivery mediums: ["announcement", "sms", "mail", "whatsapp"]';

-- 3) Recipient snapshot table (frozen list at creation time)
CREATE TABLE public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'application')),
    recipient_id UUID NOT NULL, -- References students.id or applications.id
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(announcement_id, recipient_type, recipient_id)
);

COMMENT ON TABLE public.announcement_recipients IS 'Frozen snapshot of recipients at announcement creation time. Ensures recipients do not change even if filter criteria would yield different results later.';
CREATE INDEX idx_announcement_recipients_announcement ON public.announcement_recipients(announcement_id);
CREATE INDEX idx_announcement_recipients_recipient ON public.announcement_recipients(recipient_type, recipient_id);

-- 4) Attachments table
CREATE TABLE public.announcement_attachments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, -- Storage path
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.announcement_attachments IS 'Stores file attachments for announcements.';
CREATE INDEX idx_announcement_attachments_announcement ON public.announcement_attachments(announcement_id);

-- 5) Read receipts table
CREATE TABLE public.announcement_read_receipts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'application')),
    recipient_id UUID NOT NULL,
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(announcement_id, recipient_type, recipient_id)
);

COMMENT ON TABLE public.announcement_read_receipts IS 'Tracks when recipients read announcements.';
CREATE INDEX idx_read_receipts_announcement ON public.announcement_read_receipts(announcement_id);
CREATE INDEX idx_read_receipts_recipient ON public.announcement_read_receipts(recipient_type, recipient_id);

-- 6) Triggers for updated_at
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 7) Trigger to set rto_id on related tables
CREATE TRIGGER trg_announcement_recipients_set_rto
BEFORE INSERT ON public.announcement_recipients
FOR EACH ROW
EXECUTE FUNCTION public.set_rto_id_default();

CREATE TRIGGER trg_announcement_attachments_set_rto
BEFORE INSERT ON public.announcement_attachments
FOR EACH ROW
EXECUTE FUNCTION public.set_rto_id_default();

CREATE TRIGGER trg_announcement_read_receipts_set_rto
BEFORE INSERT ON public.announcement_read_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_rto_id_default();

-- 8) RLS Policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies following existing pattern
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'rls_announcements_all'
  ) THEN
    CREATE POLICY "rls_announcements_all" ON public.announcements FOR ALL 
    USING (rto_id = public.get_my_rto_id())
    WITH CHECK (rto_id = public.get_my_rto_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcement_recipients' AND policyname = 'rls_announcement_recipients_all'
  ) THEN
    CREATE POLICY "rls_announcement_recipients_all" ON public.announcement_recipients FOR ALL 
    USING (rto_id = public.get_my_rto_id())
    WITH CHECK (rto_id = public.get_my_rto_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcement_attachments' AND policyname = 'rls_announcement_attachments_all'
  ) THEN
    CREATE POLICY "rls_announcement_attachments_all" ON public.announcement_attachments FOR ALL 
    USING (rto_id = public.get_my_rto_id())
    WITH CHECK (rto_id = public.get_my_rto_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'announcement_read_receipts' AND policyname = 'rls_announcement_read_receipts_all'
  ) THEN
    CREATE POLICY "rls_announcement_read_receipts_all" ON public.announcement_read_receipts FOR ALL 
    USING (rto_id = public.get_my_rto_id())
    WITH CHECK (rto_id = public.get_my_rto_id());
  END IF;
END $$;

-- 9) Storage bucket for announcement attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-attachments', 'announcement-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 10) Storage RLS policies for announcement attachments
-- Path convention: announcements/{announcementId}/{fileName}
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'r-auth-select-announcement-attachments'
  ) THEN
    CREATE POLICY "r-auth-select-announcement-attachments" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'announcement-attachments'
      AND auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.announcements
        WHERE announcements.id = (storage.foldername(name))[1]::uuid
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'r-auth-insert-announcement-attachments'
  ) THEN
    CREATE POLICY "r-auth-insert-announcement-attachments" ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'announcement-attachments'
      AND auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.announcements
        WHERE announcements.id = (storage.foldername(name))[1]::uuid
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'r-auth-delete-announcement-attachments'
  ) THEN
    CREATE POLICY "r-auth-delete-announcement-attachments" ON storage.objects FOR DELETE
    USING (
      bucket_id = 'announcement-attachments'
      AND auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.announcements
        WHERE announcements.id = (storage.foldername(name))[1]::uuid
      )
    );
  END IF;
END $$;

COMMIT;

