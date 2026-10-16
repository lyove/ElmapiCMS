export type ShopSort = "newest" | "price-asc" | "price-desc" | "title";

export type ShopSearchParams = {
  category?: string;
  material?: string;
  min?: string;
  max?: string;
  stock?: "in" | "out";
  featured?: boolean;
  sort?: ShopSort;
};
