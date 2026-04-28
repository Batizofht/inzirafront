import { apiRequest } from './api-client';

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoriesResponse = {
  status: number;
  data: {
    categories: Category[];
  };
};

export async function fetchCategories(): Promise<CategoriesResponse> {
  return apiRequest('/categories');
}
