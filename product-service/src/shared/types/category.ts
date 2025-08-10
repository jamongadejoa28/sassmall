// Category Types
export interface CategoryRequestParams {
  id?: string;
  name?: string;
  parentId?: string | null;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  children?: CategoryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string | null;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  categoryId: string;
  name?: string;
  description?: string;
  parentId?: string | null;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface GetCategoryListRequest {
  page?: number;
  limit?: number;
  parentId?: string | null;
  isActive?: boolean;
  sortBy?: 'sort_order' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetCategoryDetailRequest {
  categoryId: string;
}

export interface DeleteCategoryRequest {
  categoryId: string;
}