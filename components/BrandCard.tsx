"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Unlock, Mail, User, Briefcase } from "lucide-react"

interface BrandCardProps {
  brand: {
    id: string
    name: string
    category: string
    website_url?: string
    logo_url?: string
  }
  contact?: {
    email: string
    name?: string
    role?: string
  } | null
  isPremium: boolean
}

export const BrandCard = ({ brand, contact, isPremium }: BrandCardProps) => {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUnlock = async () => {
    setIsUnlocking(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/auth/login")
      setIsUnlocking(false)
      return
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_premium")
      .eq("id", user.id)
      .single()

    if (userData?.is_premium) {
      // Premium user - contact info should already be visible via RLS
      // Refresh the page data without full reload
      router.refresh()
    } else {
      // Not premium - redirect to pricing
      router.push("/pricing")
    }
    
    setIsUnlocking(false)
  }

  const shouldBlur = !isPremium

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{brand.name}</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{brand.category}</p>
      </CardHeader>
      <CardContent>
        {brand.website_url && (
          <a
            href={brand.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mb-4 block"
          >
            {brand.website_url}
          </a>
        )}
        
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold text-sm mb-2">Contact Info</h4>
          <div className="relative min-h-[120px] bg-muted/30 rounded-lg p-4">
            {shouldBlur ? (
              <>
                <div className="blur-md pointer-events-none select-none opacity-50">
                  {contact ? (
                    <div className="space-y-2">
                      {contact.name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" />
                          <span>John Doe</span>
                        </div>
                      )}
                      {contact.role && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4" />
                          <span>Marketing Director</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>contact@example.com</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No contact information available
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg">
                  <div className="text-center">
                    <Unlock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Premium Content</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unlock to see contact details
                    </p>
                  </div>
                  <Button
                    onClick={handleUnlock}
                    disabled={isUnlocking}
                    className="flex items-center gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    {isUnlocking ? "Checking..." : "Unlock"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {isPremium && (
                  <div className="flex items-center gap-1 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Premium
                    </span>
                  </div>
                )}
                {contact ? (
                  <div className="space-y-2">
                    {contact.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span>{contact.name}</span>
                      </div>
                    )}
                    {contact.role && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span>{contact.role}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No contact information available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

