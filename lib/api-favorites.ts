import { apiRequest } from './api-client';

export type Favorite = {
  id: string;
  userId: string;
  vehicleId: string;
  createdAt: string;
  vehicle?: {
    id: string;
    title: string;
    brand: string;
    model: string;
    year: string;
    price: string;
    images: string[];
    location: string;
    mileage: string;
    fuelType: string;
    transmission: string;
    sellerName?: string;
    sellerPhone?: string;
  } | null;
};

export type FavoritesResponse = {
  status: number;
  data: {
    favorites: Favorite[];
  };
};

export async function fetchFavorites(): Promise<FavoritesResponse> {
  return apiRequest('/favorites', { auth: true });
}

export async function addFavorite(vehicleId: string): Promise<FavoritesResponse> {
  return apiRequest('/favorites', {
    method: 'POST',
    body: { vehicleId },
    auth: true,
  });
}

export async function removeFavorite(vehicleId: string): Promise<FavoritesResponse> {
  return apiRequest(`/favorites/${vehicleId}`, {
    method: 'DELETE',
    auth: true,
  });
}
