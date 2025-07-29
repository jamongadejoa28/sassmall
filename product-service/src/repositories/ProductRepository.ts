import { Product } from "../entities/Product";

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
  delete(id: string): Promise<boolean>;
  findByCategory(
    categoryId: string,
    limit?: number,
    offset?: number
  ): Promise<Product[]>;
  search(
    query: string,
    filters?: any,
    limit?: number,
    offset?: number
  ): Promise<Product[]>;
}
