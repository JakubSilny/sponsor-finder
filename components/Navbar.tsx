"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Crown } from "lucide-react"

export const Navbar = () => {
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        setUser(authUser)
        
        // Check premium status
        const { data: userData } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", authUser.id)
          .single()
        
        setIsPremium(userData?.is_premium || false)
      }
      
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold">SponsorFinder</h1>
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/search">
            <Button variant="ghost">Browse</Button>
          </Link>
          {loading ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
          ) : user ? (
            <>
              <div className="flex items-center gap-3">
                {isPremium && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full">
                    <Crown className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                      Premium
                    </span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <form action="/auth/logout" method="post">
                  <Button type="submit" variant="outline">
                    Logout
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

