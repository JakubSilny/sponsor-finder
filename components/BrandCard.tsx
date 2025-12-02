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
      return
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_premium")
      .eq("id", user.id)
      .single()

    if (userData?.is_premium) {
      // Premium user - contact info should already be visible via RLS
      // Just reload to show the contact
      window.location.reload()
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
          <div className="relative min-h-[100px]">
            <div className={`${shouldBlur ? "blur-sm pointer-events-none" : ""}`}>
              {contact ? (
                <div className="space-y-2">
                  {contact.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>{contact.name}</span>
                    </div>
                  )}
                  {contact.role && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4" />
                      <span>{contact.role}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    <span>{contact.email}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No contact information available
                </div>
              )}
            </div>
            
            {shouldBlur && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  className="flex items-center gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  {isUnlocking ? "Checking..." : "Unlock"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

