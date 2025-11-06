import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname.replace('/backup-operations', '');

    if (path === '/volumes' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('volumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/volumes' && req.method === 'POST') {
      const { name, path: volumePath } = await req.json();

      const { data, error } = await supabase
        .from('volumes')
        .insert({ name, path: volumePath })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/volumes/') && req.method === 'DELETE') {
      const id = path.split('/')[2];

      const { error } = await supabase
        .from('volumes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/backups' && req.method === 'GET') {
      const volumeId = url.searchParams.get('volume_id');
      
      let query = supabase
        .from('backups')
        .select('*, volumes(name, path)')
        .order('created_at', { ascending: false });

      if (volumeId) {
        query = query.eq('volume_id', volumeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/backups/trigger' && req.method === 'POST') {
      const { volume_id } = await req.json();

      const { data: volume, error: volumeError } = await supabase
        .from('volumes')
        .select('*')
        .eq('id', volume_id)
        .single();

      if (volumeError) throw volumeError;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/backups/${volume.name}_${timestamp}.tar.gz`;

      const { data: backup, error: backupError } = await supabase
        .from('backups')
        .insert({
          volume_id,
          backup_path: backupPath,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (backupError) throw backupError;

      return new Response(JSON.stringify(backup), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/schedules' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, volumes(name, path)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/schedules' && req.method === 'POST') {
      const { volume_id, cron_expression } = await req.json();

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          volume_id,
          cron_expression,
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/schedules/') && req.method === 'PUT') {
      const id = path.split('/')[2];
      const { enabled } = await req.json();

      const { data, error } = await supabase
        .from('schedules')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/schedules/') && req.method === 'DELETE') {
      const id = path.split('/')[2];

      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});