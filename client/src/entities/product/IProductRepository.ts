export interface ProductFilter {
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface IProductRepository {
  findByFilter(
    filter: ProductFilter,
    page: number,
    limit: number
  ): Promise<any>;
  findById(id: string): Promise<any>;
  search(query: string, page: number, limit: number): Promise<any>;
}
