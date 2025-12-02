import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Find your next Sponsor.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover companies that sponsor YouTubers. Get direct contact information 
            to reach out and grow your channel.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/search">
              <Button size="lg">Start Searching</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

