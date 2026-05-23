import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const requiredFields = ['full_name', 'whatsapp', 'business_type', 'goal'];

function cleanText(value: unknown) {
  return String(value ?? '').trim().slice(0, 2000);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ownerUserId = Deno.env.get('BURNING_LEAD_OWNER_ID');

  if (!supabaseUrl || !serviceRoleKey || !ownerUserId) {
    return Response.json({ error: 'Lead intake is not configured.' }, { status: 500, headers: corsHeaders });
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400, headers: corsHeaders });
  }

  const lead = {
    user_id: ownerUserId,
    full_name: cleanText(payload.full_name),
    whatsapp: cleanText(payload.whatsapp),
    business_type: cleanText(payload.business_type),
    city: cleanText(payload.city),
    monthly_revenue: cleanText(payload.monthly_revenue),
    monthly_ad_spend: cleanText(payload.monthly_ad_spend),
    goal: cleanText(payload.goal),
    main_objection: cleanText(payload.main_objection),
    stage: 'new_dms',
    outcome: null,
    last_contact: new Date().toISOString(),
  };

  const missing = requiredFields.filter((field) => !lead[field as keyof typeof lead]);

  if (missing.length) {
    return Response.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  const source = cleanText(payload.source) || 'Public intake form';
  const noteLines = [
    `Intake source: ${source}`,
    lead.main_objection ? `Problem: ${lead.main_objection}` : '',
    lead.goal ? `90-day goal: ${lead.goal}` : '',
  ].filter(Boolean);

  if (noteLines.length) {
    await supabase.from('notes').insert({
      lead_id: data.id,
      content: noteLines.join('\n'),
    });
  }

  return Response.json({ ok: true, id: data.id }, { headers: corsHeaders });
});
