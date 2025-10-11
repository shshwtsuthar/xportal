-- Create ENUM types for classroom properties
CREATE TYPE public.classroom_type AS ENUM (
    'CLASSROOM',
    'COMPUTER_LAB',
    'WORKSHOP',
    'KITCHEN',
    'MEETING_ROOM',
    'OTHER'
);

CREATE TYPE public.classroom_status AS ENUM (
    'AVAILABLE',
    'MAINTENANCE',
    'DECOMMISSIONED'
);

-- Create the classrooms table
CREATE TABLE public.classrooms (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.delivery_locations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    type public.classroom_type NOT NULL,
    capacity INT NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    status public.classroom_status NOT NULL DEFAULT 'AVAILABLE',
    description TEXT,
    
    -- A classroom name must be unique within a single location
    UNIQUE(location_id, name)
);

COMMENT ON TABLE public.classrooms IS 'Stores information about specific, bookable rooms or spaces within a delivery location.';
COMMENT ON COLUMN public.classrooms.name IS 'The unique identifier for the room within its location (e.g., Room 1A, Workshop 3).';
COMMENT ON COLUMN public.classrooms.type IS 'Classification of the rooms purpose for scheduling activities.';
COMMENT ON COLUMN public.classrooms.capacity IS 'Maximum number of students that can be taught in this room.';
