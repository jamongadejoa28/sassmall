import { Category } from "../entities/Category";

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  save(category: Category): Promise<Category>;
  findChildren(parentId: string): Promise<Category[]>;
  findByDepth(depth: number): Promise<Category[]>;
}
