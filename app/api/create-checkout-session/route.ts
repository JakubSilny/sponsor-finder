import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json()

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "SponsorFinder - Lifetime Access",
              description: "Get lifetime access to contact information for all sponsor brands",
            },
            unit_amount: 2700, // $27.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pricing?canceled=true`,
      customer_email: userEmail || undefined,
      metadata: {
        userId: userId || "",
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

