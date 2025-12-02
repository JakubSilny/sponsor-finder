import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/Navbar"
import { AdBanner } from "@/components/AdBanner"
import { Check, Search, Mail, Zap, ArrowRight, Users, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  
  // Get stats
  const { count: brandCount } = await supabase
    .from("brands")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm mb-6">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{brandCount || "1000"}+ Active Sponsors</span>
              <Link href="/search" className="flex items-center gap-1 text-primary hover:underline ml-2">
                See sponsors
                <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Find sponsors ready to invest in your channel
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover companies that sponsor YouTubers. Get direct contact information 
            to reach out and grow your channel.
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/search">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Searching
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Free account · No credit card needed · Instant access
            </p>
          </div>
        </section>

        {/* Ad Banner */}
        <AdBanner />

        {/* Problem/Solution Section */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Too much time wasted looking for sponsors?
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4 text-destructive">Without SponsorFinder</h3>
                  <ul className="space-y-2">
                    {[
                      "Wasting time with manual searches",
                      "Too many unsponsored videos = missed opportunities",
                      "Spending time with uninterested sponsors",
                      "Difficulty finding immediate sponsorship opportunities",
                      "Wasting hours searching for brand contacts online",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-destructive mt-0.5">✗</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-primary">With SponsorFinder</h3>
                  <ul className="space-y-2">
                    {[
                      "Access the entire up-to-date sponsor database",
                      "Quick and efficient search with advanced filters",
                      "Personalized brand recommendations",
                      "Get decision-maker contacts in 1 click",
                      "No more endless searches, everything at your fingertips",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">
                More sponsors than slots in your videos
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                From research to prospecting, SponsorFinder guides you every step of the way
              </p>
              
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    icon: Search,
                    title: "Find the perfect sponsors for your niche",
                    description: "Use our advanced search tools to quickly find sponsors in your niche. Filter by category and much more.",
                  },
                  {
                    icon: Mail,
                    title: "Contact key decision-makers directly",
                    description: "Access key brand contacts, eliminate intermediaries, and negotiate directly with the right people.",
                  },
                  {
                    icon: Users,
                    title: "Target brands that sponsor similar channels",
                    description: "Identify brands that sponsor similar YouTubers and maximize your collaboration chances.",
                  },
                  {
                    icon: Zap,
                    title: "Target the most active sponsors",
                    description: "Easily identify brands active in YouTube sponsorship, and focus your efforts where real opportunities exist.",
                  },
                ].map((benefit, i) => (
                  <div key={i} className="p-6 border rounded-lg">
                    <benefit.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Finding new sponsors has never been easier
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "Search for sponsors",
                    description: "Browse our database and filter by category to find sponsors that match your content.",
                  },
                  {
                    step: "2",
                    title: "View contact information",
                    description: "Get direct access to decision-maker contacts with names, roles, and email addresses.",
                  },
                  {
                    step: "3",
                    title: "Reach out and collaborate",
                    description: "Contact sponsors directly and start building partnerships for your channel.",
                  },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ad Banner */}
        <AdBanner />

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">
                Ready to find your perfect sponsors?
              </h2>
              <p className="text-muted-foreground mb-8">
                Get immediate access to relevant sponsors and never miss an opportunity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search">
              <Button size="lg">Start Searching</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>
        </div>
          </div>
        </section>
      </main>
    </div>
  )
}

