"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string
}

export const CategoryFilter = ({
  categories,
  selectedCategory,
}: CategoryFilterProps) => {
  const searchParams = useSearchParams()

  const createCategoryUrl = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (category === "all") {
      params.delete("category")
    } else {
      params.set("category", category.toLowerCase())
    }
    return `/search?${params.toString()}`
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold mb-4">Filter by Category</h3>
      <Link href={createCategoryUrl("all")}>
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="w-full justify-start"
        >
          All Categories
        </Button>
      </Link>
      {categories.map((category) => (
        <Link key={category} href={createCategoryUrl(category)}>
          <Button
            variant={
              selectedCategory.toLowerCase() === category.toLowerCase()
                ? "default"
                : "outline"
            }
            className="w-full justify-start capitalize"
          >
            {category}
          </Button>
        </Link>
      ))}
    </div>
  )
}

