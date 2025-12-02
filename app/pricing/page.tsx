import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingPage() {
  // Dummy Stripe Checkout link - replace with your actual Stripe checkout URL
  const stripeCheckoutUrl = "https://checkout.stripe.com/test/dummy"

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
                <span className="text-4xl font-bold">$19</span>
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
              <a
                href={stripeCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full" size="lg">
                  Get Started
                </Button>
              </a>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}

