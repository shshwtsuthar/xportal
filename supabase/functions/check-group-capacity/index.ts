/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

interface CapacityCheckResult {
  hasCapacity: boolean;
  groupId: string;
  groupName?: string;
  currentCount?: number;
  maxCapacity?: number;
  alternatives?: Array<{
    id: string;
    name: string;
    current_enrollment_count: number;
    max_capacity: number;
    availableSpots: number;
  }>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient<Db>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch application with group info
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('group_id, program_id, preferred_location_id')
      .eq('id', applicationId)
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (!app.group_id) {
      return new Response(
        JSON.stringify({ error: 'Application has no group assigned' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch group capacity info
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('id, name, current_enrollment_count, max_capacity')
      .eq('id', app.group_id)
      .single();

    if (groupErr || !group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Check if group has capacity
    const hasCapacity = group.current_enrollment_count < group.max_capacity;

    if (hasCapacity) {
      // Group has capacity, return success
      const result: CapacityCheckResult = {
        hasCapacity: true,
        groupId: group.id,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Group is full, fetch alternatives
    const { data: alternatives, error: altErr } = await supabase
      .from('groups')
      .select('id, name, current_enrollment_count, max_capacity')
      .eq('program_id', app.program_id)
      .eq('location_id', app.preferred_location_id)
      .neq('id', app.group_id) // Exclude current group
      .order('name', { ascending: true });

    if (altErr) {
      console.error('Error fetching alternatives:', altErr);
      // Still return the capacity result even if alternatives fail
      const result: CapacityCheckResult = {
        hasCapacity: false,
        groupId: group.id,
        groupName: group.name,
        currentCount: group.current_enrollment_count,
        maxCapacity: group.max_capacity,
        alternatives: [],
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Filter alternatives that have capacity
    const availableAlternatives = (alternatives || [])
      .filter((g) => g.current_enrollment_count < g.max_capacity)
      .map((g) => ({
        id: g.id,
        name: g.name,
        current_enrollment_count: g.current_enrollment_count,
        max_capacity: g.max_capacity,
        availableSpots: g.max_capacity - g.current_enrollment_count,
      }));

    const result: CapacityCheckResult = {
      hasCapacity: false,
      groupId: group.id,
      groupName: group.name,
      currentCount: group.current_enrollment_count,
      maxCapacity: group.max_capacity,
      alternatives: availableAlternatives,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('Error in check-group-capacity:', e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
