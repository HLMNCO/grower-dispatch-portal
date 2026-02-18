import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured, skipping email')
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FreshDock <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error(`Resend error [${res.status}]:`, err)
    } else {
      console.log(`Email sent to ${to}`)
    }
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

function buildItemsTable(items: any[]) {
  const rows = items.map((item: any) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.product}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.variety || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.size || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.tray_type || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
    </tr>`
  ).join('')

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 12px;text-align:left;font-size:13px;">Product</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;">Variety</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;">Size</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;">Tray Type</th>
          <th style="padding:8px 12px;text-align:right;font-size:13px;">Qty</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function growerEmailHtml(displayId: string, growerName: string, receiverName: string, dispatchDate: string, carrier: string | null, conNote: string | null, totalPallets: number, items: any[], notes: string | null) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:#16a34a;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">✅ Dispatch Submitted Successfully</h1>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>Hi <strong>${growerName}</strong>,</p>
        <p>Your dispatch <strong>${displayId}</strong> has been submitted to <strong>${receiverName}</strong>.</p>
        
        <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;">DISPATCH DETAILS</h3>
          <p style="margin:4px 0;"><strong>Dispatch Date:</strong> ${dispatchDate}</p>
          ${carrier ? `<p style="margin:4px 0;"><strong>Carrier:</strong> ${carrier}</p>` : ''}
          ${conNote ? `<p style="margin:4px 0;"><strong>Con Note:</strong> ${conNote}</p>` : ''}
          <p style="margin:4px 0;"><strong>Total Pallets:</strong> ${totalPallets}</p>
        </div>

        <h3 style="font-size:14px;color:#6b7280;">ITEMS</h3>
        ${buildItemsTable(items)}

        ${notes ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;"><strong>Notes:</strong> ${notes}</div>` : ''}

        <p style="color:#6b7280;font-size:13px;margin-top:24px;">This is an automated notification from FreshDock. Please keep this for your records.</p>
      </div>
    </div>
  `
}

function receiverEmailHtml(displayId: string, growerName: string, growerCode: string | null, dispatchDate: string, expectedArrival: string | null, carrier: string | null, conNote: string | null, totalPallets: number, items: any[], notes: string | null, growerEmail: string | null, growerPhone: string | null) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">📦 New Inbound Dispatch — ${displayId}</h1>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p>A new dispatch has been submitted via your public intake link.</p>
        
        <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;">GROWER / SUPPLIER</h3>
          <p style="margin:4px 0;"><strong>Name:</strong> ${growerName}</p>
          ${growerCode ? `<p style="margin:4px 0;"><strong>Code:</strong> ${growerCode}</p>` : ''}
          ${growerEmail ? `<p style="margin:4px 0;"><strong>Email:</strong> ${growerEmail}</p>` : ''}
          ${growerPhone ? `<p style="margin:4px 0;"><strong>Phone:</strong> ${growerPhone}</p>` : ''}
        </div>

        <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:16px 0;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;">DISPATCH DETAILS</h3>
          <p style="margin:4px 0;"><strong>Dispatch Date:</strong> ${dispatchDate}</p>
          ${expectedArrival ? `<p style="margin:4px 0;"><strong>Expected Arrival:</strong> ${expectedArrival}</p>` : ''}
          ${carrier ? `<p style="margin:4px 0;"><strong>Carrier:</strong> ${carrier}</p>` : ''}
          ${conNote ? `<p style="margin:4px 0;"><strong>Con Note:</strong> ${conNote}</p>` : ''}
          <p style="margin:4px 0;"><strong>Total Pallets:</strong> ${totalPallets}</p>
        </div>

        <h3 style="font-size:14px;color:#6b7280;">ITEMS</h3>
        ${buildItemsTable(items)}

        ${notes ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;"><strong>Notes:</strong> ${notes}</div>` : ''}

        <p style="color:#6b7280;font-size:13px;margin-top:24px;">Log in to FreshDock to manage this dispatch.</p>
      </div>
    </div>
  `
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
      con_note_number,
      con_note_photo_url,
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
      .select('id, name, owner_id, email')
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

    // Create the dispatch
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
        transporter_con_note_number: con_note_number || '',
        transporter_con_note_photo_url: con_note_photo_url || null,
        receiver_business_id: receiverBiz.id,
        supplier_id: receiverBiz.owner_id,
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

    // Generate DA number
    const { data: daNumber } = await supabase.rpc('generate_delivery_advice_number', { p_dispatch_id: dispatch.id })

    // Log events
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

    await supabase.from('dispatch_events').insert({
      dispatch_id: dispatch.id,
      event_type: 'submitted',
      triggered_by_role: 'external_supplier',
      metadata: { source: 'public_intake' },
    })

    // Send emails (non-blocking — don't fail the response if emails fail)
    const emailPromises: Promise<void>[] = []

    // Email to grower
    if (grower_email?.trim()) {
      emailPromises.push(
        sendEmail(
          grower_email.trim(),
          `Dispatch ${dispatch.display_id} Submitted — Confirmation`,
          growerEmailHtml(
            dispatch.display_id,
            grower_name.trim(),
            receiverBiz.name,
            dispatch_date,
            carrier?.trim() || null,
            con_note_number || null,
            total_pallets || 1,
            items,
            notes?.trim() || null
          )
        )
      )
    }

    // Email to receiver
    // First try business email, fallback to owner's auth email
    let receiverEmail = receiverBiz.email
    if (!receiverEmail) {
      const { data: ownerData } = await supabase.auth.admin.getUserById(receiverBiz.owner_id)
      receiverEmail = ownerData?.user?.email || null
    }

    if (receiverEmail) {
      emailPromises.push(
        sendEmail(
          receiverEmail,
          `📦 New Inbound Dispatch ${dispatch.display_id} from ${grower_name.trim()}`,
          receiverEmailHtml(
            dispatch.display_id,
            grower_name.trim(),
            grower_code?.trim() || null,
            dispatch_date,
            expected_arrival || null,
            carrier?.trim() || null,
            con_note_number || null,
            total_pallets || 1,
            items,
            notes?.trim() || null,
            grower_email?.trim() || null,
            grower_phone?.trim() || null
          )
        )
      )
    }

    // Fire emails without blocking the response
    await Promise.allSettled(emailPromises)

    return new Response(
      JSON.stringify({
        success: true,
        dispatch_id: dispatch.display_id,
        da_number: daNumber || dispatch.display_id,
        message: `Dispatch ${daNumber || dispatch.display_id} submitted successfully to ${receiverBiz.name}`,
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
