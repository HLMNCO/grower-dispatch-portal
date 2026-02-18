import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const intake_token = url.searchParams.get('intake_token')
    const grower_name = url.searchParams.get('grower_name')

    if (!intake_token || !grower_name) {
      return new Response(
        JSON.stringify({ error: 'Missing intake_token or grower_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the intake token belongs to a receiver
    const { data: receiverBiz, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('public_intake_token', intake_token)
      .eq('business_type', 'receiver')
      .single()

    if (bizError || !receiverBiz) {
      return new Response(
        JSON.stringify({ error: 'Invalid intake token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch dispatches for this grower + receiver combo
    const { data: dispatches, error: dispError } = await supabase
      .from('dispatches')
      .select(`
        display_id,
        dispatch_date,
        status,
        total_pallets,
        carrier,
        transporter_con_note_number,
        created_at,
        dispatch_items (
          product,
          variety,
          quantity
        )
      `)
      .eq('receiver_business_id', receiverBiz.id)
      .ilike('grower_name', grower_name.trim())
      .order('dispatch_date', { ascending: false })
      .limit(20)

    if (dispError) {
      console.error('Fetch dispatches error:', dispError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch dispatches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ dispatches: dispatches || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
