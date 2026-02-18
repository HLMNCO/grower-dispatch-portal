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

    const body = await req.json()
    const {
      intake_token,
      grower_name,
      grower_code,
      dispatch_date,
      expected_arrival,
      carrier,
      items,
      notes,
      total_pallets,
      grower_email,
      grower_phone,
    } = body

    // Validate required fields
    if (!intake_token || !grower_name || !dispatch_date || !items?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: intake_token, grower_name, dispatch_date, and at least one item' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up receiver business by intake token
    const { data: receiverBiz, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .eq('public_intake_token', intake_token)
      .eq('business_type', 'receiver')
      .single()

    if (bizError || !receiverBiz) {
      return new Response(
        JSON.stringify({ error: 'Invalid intake link. Please check the URL.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return new Response(
          JSON.stringify({ error: 'Each item must have a product name and quantity >= 1' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Validate string lengths
    if (grower_name.length > 200 || (grower_code && grower_code.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Input too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the dispatch using the receiver's owner_id as a placeholder supplier_id
    // (since there's no authenticated supplier, we use a system approach)
    const { data: dispatch, error: dispatchError } = await supabase
      .from('dispatches')
      .insert({
        grower_name: grower_name.trim(),
        grower_code: grower_code?.trim() || null,
        dispatch_date,
        expected_arrival: expected_arrival || null,
        carrier: carrier?.trim() || null,
        notes: notes?.trim() || null,
        total_pallets: total_pallets || 1,
        transporter_con_note_number: '',
        receiver_business_id: receiverBiz.id,
        supplier_id: receiverBiz.owner_id, // placeholder — public submissions owned by receiver
        status: 'pending',
      })
      .select('id, display_id, qr_code_token')
      .single()

    if (dispatchError) {
      console.error('Dispatch insert error:', dispatchError)
      return new Response(
        JSON.stringify({ error: 'Failed to create dispatch. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert line items
    const itemRows = items.map((item: any) => ({
      dispatch_id: dispatch.id,
      product: item.product.trim(),
      variety: item.variety?.trim() || '',
      size: item.size?.trim() || '',
      tray_type: item.tray_type?.trim() || '',
      quantity: Number(item.quantity),
      unit_weight: item.unit_weight ? Number(item.unit_weight) : null,
    }))

    const { error: itemsError } = await supabase
      .from('dispatch_items')
      .insert(itemRows)

    if (itemsError) {
      console.error('Items insert error:', itemsError)
    }

    // Log event
    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'created',
      triggered_by_role: 'external_supplier',
      metadata: {
        source: 'public_intake',
        grower_name: grower_name.trim(),
        grower_email: grower_email?.trim() || null,
        grower_phone: grower_phone?.trim() || null,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        dispatch_id: dispatch.display_id,
        message: `Dispatch ${dispatch.display_id} submitted successfully to ${receiverBiz.name}`,
      }),
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
