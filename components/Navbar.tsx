import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { Crown } from "lucide-react"

export const Navbar = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("is_premium")
      .eq("id", user.id)
      .single()
    isPremium = userData?.is_premium || false
  }

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
          {user ? (
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

