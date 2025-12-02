import { createClient } from "@/lib/supabase/server"
import { BrandCard } from "@/components/BrandCard"
import { CategoryFilter } from "@/components/CategoryFilter"
import { Navbar } from "@/components/Navbar"

const CATEGORIES = ["Gaming", "Beauty", "Tech"]

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const supabase = await createClient()
  const selectedCategory = searchParams.category || "all"

  // Get current user and premium status in parallel with brands query
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch brands and user premium status in parallel for better performance
  const [brandsResult, userDataResult] = await Promise.all([
    (async () => {
      let query = supabase.from("brands").select("*").eq("is_active", true)
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory.toLowerCase())
      }
      return query.order("name")
    })(),
    user
      ? supabase
          .from("users")
          .select("is_premium")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const brands = brandsResult.data || []
  const isPremium = userDataResult.data?.is_premium || false

  // Fetch contacts for premium users (only if premium and brands exist)
  let contacts: Record<string, any> = {}
  if (isPremium && brands.length > 0) {
    const brandIds = brands.map((b) => b.id)
    const { data: contactsData } = await supabase
      .from("contacts")
      .select("*")
      .in("brand_id", brandIds)

    if (contactsData) {
      contactsData.forEach((contact) => {
        if (!contacts[contact.brand_id]) {
          contacts[contact.brand_id] = []
        }
        contacts[contact.brand_id].push(contact)
      })
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64">
            <CategoryFilter
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
            />
          </aside>

          <main className="flex-1">
            <h2 className="text-2xl font-bold mb-6">
              {selectedCategory === "all"
                ? "All Brands"
                : `${selectedCategory} Brands`}
            </h2>
            {brands && brands.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brand) => (
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    contact={
                      contacts[brand.id]?.[0] || null
                    }
                    isPremium={isPremium}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No brands found in this category.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

