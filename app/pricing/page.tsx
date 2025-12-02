"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Crown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/Navbar"

function PricingContent() {
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success/cancel messages
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")

    // Get current user and premium status
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || null)
        setUserId(user.id)
        
        // Check premium status
        const { data: userData } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", user.id)
          .single()
        setIsPremium(userData?.is_premium || false)
      }

      // Show appropriate message based on login status
      if (success) {
        if (user) {
          // User is logged in - premium will be activated via webhook
          // Refresh after a short delay to show updated premium status
          setTimeout(() => {
            router.push("/search")
            router.refresh()
          }, 1500)
          alert("Payment successful! Your premium access will be activated shortly. Redirecting...")
        } else {
          // User is not logged in - need to login to activate premium
          alert("Payment successful! Please log in with the same email address to activate your premium access.")
          setTimeout(() => {
            router.push("/auth/login")
          }, 500)
        }
      }
      if (canceled) {
        alert("Payment canceled. You can try again anytime.")
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
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Unlock Premium Access</h1>
          {isPremium ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                You already have Premium access!
              </p>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">
              Get lifetime access to contact information for all sponsor brands.
            </p>
          )}
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
              {isPremium ? (
                <div className="w-full text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      Premium Active
                    </span>
                  </div>
                  <Link href="/search">
                    <Button className="w-full" size="lg" variant="outline">
                      Browse Brands
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Get Started"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
