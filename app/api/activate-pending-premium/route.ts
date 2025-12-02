import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json()

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: "userId and userEmail are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check for pending premium payments for this email (case-insensitive match)
    const { data: pendingPayments, error: fetchError } = await supabase
      .from("pending_premium_payments")
      .select("*")
      .eq("email", userEmail.toLowerCase())
      .eq("is_processed", false)

    if (fetchError) {
      console.error("Error fetching pending payments:", fetchError)
      return NextResponse.json(
        { error: "Failed to check pending payments" },
        { status: 500 }
      )
    }

    if (pendingPayments && pendingPayments.length > 0) {
      // Activate premium for this user
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_premium: true })
        .eq("id", userId)

      if (updateError) {
        console.error("Error activating premium:", updateError)
        return NextResponse.json(
          { error: "Failed to activate premium" },
          { status: 500 }
        )
      }

      // Mark pending payments as processed
      const paymentIds = pendingPayments.map((p) => p.id)
      const { error: markError } = await supabase
        .from("pending_premium_payments")
        .update({ 
          is_processed: true,
          processed_at: new Date().toISOString()
        })
        .in("id", paymentIds)

      if (markError) {
        console.error("Error marking payments as processed:", markError)
        // Don't fail the request, premium is already activated
      }

      return NextResponse.json({ 
        success: true, 
        premiumActivated: true,
        message: "Premium access activated!" 
      })
    }

    return NextResponse.json({ 
      success: true, 
      premiumActivated: false,
      message: "No pending payments found" 
    })
  } catch (error: any) {
    console.error("Error activating pending premium:", error)
    return NextResponse.json(
      { error: error.message || "Failed to activate pending premium" },
      { status: 500 }
    )
  }
}

