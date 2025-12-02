import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover",
  })
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 }
    )
  }
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const customerEmail = session.customer_email || session.customer_details?.email

      try {
      const supabase = createAdminClient()

      if (userId) {
        // User was logged in - update premium status directly
        const { error } = await supabase
          .from("users")
          .update({ is_premium: true })
          .eq("id", userId)

        if (error) {
          console.error("Error updating premium status:", error)
          return NextResponse.json(
            { error: "Failed to update premium status" },
            { status: 500 }
          )
        }

        console.log(`Premium access granted to user: ${userId}`)
      } else if (customerEmail) {
        // User was not logged in - check if user exists by email
        // Use optimized SQL function to find user by email
        const { data: userResult, error: findError } = await supabase
          .rpc('find_user_by_email', { search_email: customerEmail.toLowerCase() })

        if (findError) {
          console.error("Error finding user by email:", findError)
          // Fallback: store as pending payment if lookup fails
          const { error: insertError } = await supabase
            .from("pending_premium_payments")
            .insert({
              email: customerEmail.toLowerCase(),
              stripe_session_id: session.id,
              stripe_customer_id: session.customer as string | null,
            })
          if (!insertError) {
            console.log(`Pending premium payment stored for email (fallback): ${customerEmail}`)
          }
          // Continue processing - don't fail the webhook
        }

        const matchingUser = userResult && Array.isArray(userResult) && userResult.length > 0 ? userResult[0] : null

        if (matchingUser) {
          // User exists - ensure user record exists in users table, then activate premium
          // First, check if user record exists in users table
          const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("id")
            .eq("id", matchingUser.id)
            .single()

          if (checkError && checkError.code === 'PGRST116') {
            // User doesn't exist in users table - create it
            const { error: createError } = await supabase
              .from("users")
              .insert({
                id: matchingUser.id,
                email: matchingUser.email,
                is_premium: true, // Set premium immediately
              })

            if (createError) {
              console.error("Error creating user record:", createError)
              return NextResponse.json(
                { error: "Failed to create user record" },
                { status: 500 }
              )
            }
            console.log(`User record created and premium activated for: ${matchingUser.id} (${customerEmail})`)
          } else if (!checkError) {
            // User exists - activate premium
            const { error: updateError } = await supabase
              .from("users")
              .update({ is_premium: true })
              .eq("id", matchingUser.id)

            if (updateError) {
              console.error("Error updating premium status for existing user:", updateError)
              return NextResponse.json(
                { error: "Failed to update premium status" },
                { status: 500 }
              )
            }
            console.log(`Premium access granted to existing user: ${matchingUser.id} (${customerEmail})`)
          }
        } else {
          // User doesn't exist yet - store payment info for later activation
          const { error: insertError } = await supabase
            .from("pending_premium_payments")
            .insert({
              email: customerEmail.toLowerCase(),
              stripe_session_id: session.id,
              stripe_customer_id: session.customer as string | null,
            })

          if (insertError) {
            console.error("Error storing pending payment:", insertError)
            return NextResponse.json(
              { error: "Failed to store pending payment" },
              { status: 500 }
            )
          }

          console.log(`Pending premium payment stored for email: ${customerEmail}`)
        }
      } else {
        console.warn("No userId or customerEmail found in checkout session")
      }
    } catch (error: any) {
      console.error("Error processing webhook:", error)
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}

