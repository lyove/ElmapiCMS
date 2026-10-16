import type { CategoryFields, ContentEntry, ProductFields } from "@/lib/types";

/** Pure category helpers. Safe for client components (no Elmapi client). */

export type CategoryTreeNode = {
  root: ContentEntry<CategoryFields>;
  children: ContentEntry<CategoryFields>[];
};

function categoryParentUuid(
  category: ContentEntry<CategoryFields>,
): string | null {
  return category.fields.parent?.uuid ?? null;
}

export function getRootCategories(
  categories: ContentEntry<CategoryFields>[],
): ContentEntry<CategoryFields>[] {
  return categories.filter((category) => !categoryParentUuid(category));
}

export function getSubcategories(
  categories: ContentEntry<CategoryFields>[],
  parentSlugOrUuid: string,
): ContentEntry<CategoryFields>[] {
  const parent = categories.find(
    (category) =>
      category.uuid === parentSlugOrUuid ||
      category.fields.slug === parentSlugOrUuid,
  );
  if (!parent) return [];
  return categories.filter(
    (category) => categoryParentUuid(category) === parent.uuid,
  );
}

export function getCategoryTree(
  categories: ContentEntry<CategoryFields>[],
): CategoryTreeNode[] {
  return getRootCategories(categories).map((root) => ({
    root,
    children: getSubcategories(categories, root.uuid),
  }));
}

export function productMatchesCategory(
  product: ContentEntry<ProductFields>,
  categorySlug: string,
  allCategories: ContentEntry<CategoryFields>[],
): boolean {
  const productCategory = product.fields.category;
  if (!productCategory?.fields.slug) return false;

  const productSlug = productCategory.fields.slug;
  if (productSlug === categorySlug) return true;

  const filterCategory = allCategories.find(
    (category) => category.fields.slug === categorySlug,
  );

  if (!filterCategory) {
    const parentSlug = productCategory.fields.parent?.fields.slug;
    return parentSlug === categorySlug;
  }

  if (categoryParentUuid(filterCategory)) {
    return false;
  }

  const productEntry =
    allCategories.find((category) => category.uuid === productCategory.uuid) ??
    productCategory;
  const parentUuid = categoryParentUuid(productEntry);

  if (parentUuid === filterCategory.uuid) return true;
  if (productCategory.fields.parent?.uuid === filterCategory.uuid) return true;
  if (productCategory.fields.parent?.fields.slug === categorySlug) return true;

  return getSubcategories(allCategories, filterCategory.uuid).some(
    (child) =>
      child.fields.slug === productSlug || child.uuid === productCategory.uuid,
  );
}
