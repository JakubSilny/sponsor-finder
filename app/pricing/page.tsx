"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success/cancel messages
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")

    if (success) {
      // Payment successful - user will be upgraded via webhook
      alert("Payment successful! Your premium access will be activated shortly.")
    }
    if (canceled) {
      alert("Payment canceled. You can try again anytime.")
    }

    // Get current user
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || null)
        setUserId(user.id)
      }
    })
  }, [searchParams])

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          userEmail: userEmail,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(`Error: ${data.error}`)
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        alert("Failed to create checkout session")
        setLoading(false)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold">SponsorFinder</h1>
          </Link>
          <Link href="/search">
            <Button variant="ghost">Browse</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Unlock Premium Access</h1>
          <p className="text-xl text-muted-foreground">
            Get lifetime access to contact information for all sponsor brands.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-center">Lifetime Access</CardTitle>
              <CardDescription className="text-center text-lg">
                <span className="text-4xl font-bold">$27</span>
                <span className="text-muted-foreground"> one-time payment</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Access to all brand contact information</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Direct email addresses and contact names</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Lifetime access - no recurring fees</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Regular database updates</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? "Processing..." : "Get Started"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
