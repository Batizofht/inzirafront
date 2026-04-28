import { apiRequest } from "./api-client";
import type { Vehicle } from "@/types/vehicle";

export type VehicleListResponse = {
  status: number;
  data: {
    vehicles: Array<
      Vehicle & { sellerName?: string; sellerPhone?: string; category?: string }
    >;
  };
};

export type VehicleDetailResponse = {
  status: number;
  data: {
    vehicle: Vehicle & {
      sellerName?: string;
      sellerPhone?: string;
      category?: string;
    };
  };
};

export type CreateVehiclePayload = {
  title: string;
  brand: string;
  model: string;
  year: string;
  categoryId: string;
  categorySlug?: string;
  vehicleType: string;
  bodyType?: string;
  fuelType: string;
  color: string;
  usageStatus: "Brand New" | "Imported Used" | "Used In Rwanda";
  mileage: string;
  transmission: string;
  price: number;
  description: string;
  location: string;
  images: string[];
  engineSize?: string;
  driveType?: string;
  vehicleIdentificationDoc?: string;
  status?: "active" | "pending" | "sold" | "rejected";
};

export async function fetchVehicles(filters?: {
  q?: string;
  type?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  status?: string;
}): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.fuelType) params.append("fuelType", filters.fuelType);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));
  if (filters?.location) params.append("location", filters.location);
  if (filters?.status) params.append("status", filters.status);

  const query = params.toString();
  return apiRequest(`/vehicles${query ? `?${query}` : ""}`);
}

export async function fetchVehiclesByCategory(
  slug: string,
  filters?: {
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    status?: string;
  },
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));
  if (filters?.location) params.append("location", filters.location);
  if (filters?.status) params.append("status", filters.status);

  const query = params.toString();
  return apiRequest(`/vehicles/category/${slug}${query ? `?${query}` : ""}`);
}

export async function fetchFeaturedVehicles(
  limit = 10,
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  return apiRequest(`/vehicles/featured?${params.toString()}`);
}

export async function fetchRecentVehicles(
  limit = 25,
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  return apiRequest(`/vehicles/recent?${params.toString()}`);
}

export async function fetchVehicleById(
  id: string,
): Promise<VehicleDetailResponse> {
  return apiRequest(`/vehicles/${id}`);
}

export async function fetchMyVehicles(): Promise<VehicleListResponse> {
  return apiRequest("/vehicles/mine", { auth: true });
}

export async function createVehicle(
  payload: CreateVehiclePayload,
): Promise<VehicleDetailResponse> {
  const formData = new FormData();

  // Add all text fields
  formData.append("title", payload.title);
  formData.append("brand", payload.brand);
  formData.append("model", payload.model);
  formData.append("year", payload.year);
  formData.append("categoryId", payload.categoryId);
  if (payload.categorySlug)
    formData.append("categorySlug", payload.categorySlug);
  formData.append("vehicleType", payload.vehicleType);
  if (payload.bodyType) formData.append("bodyType", payload.bodyType);
  formData.append("fuelType", payload.fuelType);
  formData.append("color", payload.color);
  formData.append("transmission", payload.transmission);
  formData.append("usageStatus", payload.usageStatus);
  formData.append("mileage", payload.mileage);
  formData.append("price", payload.price.toString());
  formData.append("description", payload.description);
  formData.append("location", payload.location);
  if (payload.engineSize) formData.append("engineSize", payload.engineSize);
  if (payload.driveType) formData.append("driveType", payload.driveType);

  // Handle images - prefer file-based uploads, keep base64 as fallback
  if (payload.images && payload.images.length > 0) {
    // We must support multiple environments (RN/web). Append appropriately.
    // - data:image/*;base64,...  -> convert to Blob
    // - blob:... (web)           -> fetch and append Blob
    // - file:/content:... (RN)   -> append as { uri, name, type }
    for (let index = 0; index < payload.images.length; index++) {
      const imageUri = payload.images[index];
      if (!imageUri) continue;

      try {
        if (imageUri.startsWith("data:image/")) {
          const base64Data = imageUri.split(",")[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/jpeg" });
          formData.append("images", blob, `image_${index}.jpg`);
        } else if (imageUri.startsWith("blob:")) {
          // Web blob URL
          const resp = await fetch(imageUri);
          const blob = await resp.blob();
          const nameFromBlob = `image_${index}.jpg`;
          formData.append("images", blob, nameFromBlob);
        } else if (
          imageUri.startsWith("file:") ||
          imageUri.startsWith("content:")
        ) {
          // React Native local file
          const filename = imageUri.split("/").pop() || `image_${index}.jpg`;
          const lower = filename.toLowerCase();
          const type = lower.endsWith(".png")
            ? "image/png"
            : lower.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";
          const file: any = { uri: imageUri, name: filename, type };
          (formData as any).append("images", file);
        } else {
          // Unknown format; try to fetch and append as blob (web), otherwise skip
          try {
            const resp = await fetch(imageUri);
            const blob = await resp.blob();
            formData.append("images", blob, `image_${index}.jpg`);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore bad image and continue
      }
    }
  }

  // Handle vehicle identification document
  if (payload.vehicleIdentificationDoc) {
    const docUri = payload.vehicleIdentificationDoc;
    try {
      if (docUri.startsWith("data:image/")) {
        const base64Data = docUri.split(",")[1];
        const binary = atob(base64Data);
        const bytes = new Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
        formData.append("vehicleIdentificationDoc", blob, "vehicle_id_doc.jpg");
      } else if (docUri.startsWith("blob:")) {
        const resp = await fetch(docUri);
        const blob = await resp.blob();
        formData.append("vehicleIdentificationDoc", blob, "vehicle_id_doc.jpg");
      } else if (docUri.startsWith("file:") || docUri.startsWith("content:")) {
        const filename = docUri.split("/").pop() || "vehicle_id_doc.jpg";
        formData.append("vehicleIdentificationDoc", {
          uri: docUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      } else {
        try {
          const resp = await fetch(docUri);
          const blob = await resp.blob();
          formData.append(
            "vehicleIdentificationDoc",
            blob,
            "vehicle_id_doc.jpg",
          );
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  return apiRequest("/vehicles", {
    method: "POST",
    body: formData,
    auth: true,
    isFormData: true,
  });
}

export async function updateVehicle(
  id: string,
  payload: Partial<CreateVehiclePayload>,
): Promise<VehicleDetailResponse> {
  // Check if we have images to handle as FormData
  if (payload.images && payload.images.length > 0) {
    const formData = new FormData();

    // Add all text fields that are provided
    if (payload.title) formData.append("title", payload.title);
    if (payload.brand) formData.append("brand", payload.brand);
    if (payload.model) formData.append("model", payload.model);
    if (payload.year) formData.append("year", payload.year);
    if (payload.categoryId) formData.append("categoryId", payload.categoryId);
    if (payload.categorySlug)
      formData.append("categorySlug", payload.categorySlug);
    if (payload.vehicleType)
      formData.append("vehicleType", payload.vehicleType);
    if (payload.bodyType) formData.append("bodyType", payload.bodyType);
    if (payload.fuelType) formData.append("fuelType", payload.fuelType);
    if (payload.color) formData.append("color", payload.color);
    if (payload.transmission)
      formData.append("transmission", payload.transmission);
    if (payload.usageStatus)
      formData.append("usageStatus", payload.usageStatus);
    if (payload.mileage) formData.append("mileage", payload.mileage);
    if (payload.price !== undefined)
      formData.append("price", payload.price.toString());
    if (payload.description)
      formData.append("description", payload.description);
    if (payload.location) formData.append("location", payload.location);
    if (payload.engineSize) formData.append("engineSize", payload.engineSize);
    if (payload.driveType) formData.append("driveType", payload.driveType);

    // Handle images - append new uploads and keep existing file paths
    if (payload.images && payload.images.length > 0) {
      for (let index = 0; index < payload.images.length; index++) {
        const imageUri = payload.images[index] as string;
        if (!imageUri) continue;

        // Existing server images (keep)
        if (
          imageUri.startsWith("/uploads/") ||
          imageUri.startsWith("/vehicles/image/") ||
          imageUri.startsWith("http://") ||
          imageUri.startsWith("https://") ||
          // Also treat bare filenames (no slash) as existing server files
          !imageUri.includes("/")
        ) {
          formData.append("existingImages", imageUri);
          continue;
        }

        try {
          if (imageUri.startsWith("data:image/")) {
            const base64Data = imageUri.split(",")[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "image/jpeg" });
            formData.append("images", blob, `image_${index}.jpg`);
          } else if (imageUri.startsWith("blob:")) {
            const resp = await fetch(imageUri);
            const blob = await resp.blob();
            formData.append("images", blob, `image_${index}.jpg`);
          } else if (
            imageUri.startsWith("file:") ||
            imageUri.startsWith("content:")
          ) {
            const filename = imageUri.split("/").pop() || `image_${index}.jpg`;
            const lower = filename.toLowerCase();
            const type = lower.endsWith(".png")
              ? "image/png"
              : lower.endsWith(".webp")
                ? "image/webp"
                : "image/jpeg";
            const file: any = { uri: imageUri, name: filename, type };
            (formData as any).append("images", file);
          } else {
            try {
              const resp = await fetch(imageUri);
              const blob = await resp.blob();
              formData.append("images", blob, `image_${index}.jpg`);
            } catch {
              // fallback to existingImages if upload fails
              formData.append("existingImages", imageUri);
            }
          }
        } catch {
          // ignore failures per-image
        }
      }
    }

    // Handle vehicle identification document
    if (payload.vehicleIdentificationDoc) {
      const docUri = payload.vehicleIdentificationDoc;
      try {
        if (docUri.startsWith("data:image/")) {
          const base64Data = docUri.split(",")[1];
          const binary = atob(base64Data);
          const bytes = new Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([new Uint8Array(bytes)], {
            type: "image/jpeg",
          });
          formData.append(
            "vehicleIdentificationDoc",
            blob,
            "vehicle_id_doc.jpg",
          );
        } else if (docUri.startsWith("blob:")) {
          const resp = await fetch(docUri);
          const blob = await resp.blob();
          formData.append(
            "vehicleIdentificationDoc",
            blob,
            "vehicle_id_doc.jpg",
          );
        } else if (
          docUri.startsWith("file:") ||
          docUri.startsWith("content:")
        ) {
          const filename = docUri.split("/").pop() || "vehicle_id_doc.jpg";
          formData.append("vehicleIdentificationDoc", {
            uri: docUri,
            name: filename,
            type: "image/jpeg",
          } as any);
        } else {
          try {
            const resp = await fetch(docUri);
            const blob = await resp.blob();
            formData.append(
              "vehicleIdentificationDoc",
              blob,
              "vehicle_id_doc.jpg",
            );
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    }

    return apiRequest(`/vehicles/${id}`, {
      method: "PATCH",
      body: formData,
      auth: true,
      isFormData: true,
    });
  } else if (payload.vehicleIdentificationDoc) {
    // No new images but have a vehicle identification doc - still need FormData
    const formData = new FormData();
    if (payload.title) formData.append("title", payload.title);
    if (payload.brand) formData.append("brand", payload.brand);
    if (payload.model) formData.append("model", payload.model);
    if (payload.year) formData.append("year", payload.year);
    if (payload.categoryId) formData.append("categoryId", payload.categoryId);
    if (payload.categorySlug)
      formData.append("categorySlug", payload.categorySlug);
    if (payload.vehicleType)
      formData.append("vehicleType", payload.vehicleType);
    if (payload.fuelType) formData.append("fuelType", payload.fuelType);
    if (payload.color) formData.append("color", payload.color);
    if (payload.transmission)
      formData.append("transmission", payload.transmission);
    if (payload.usageStatus)
      formData.append("usageStatus", payload.usageStatus);
    if (payload.mileage) formData.append("mileage", payload.mileage);
    if (payload.price !== undefined)
      formData.append("price", payload.price.toString());
    if (payload.description)
      formData.append("description", payload.description);
    if (payload.location) formData.append("location", payload.location);
    if (payload.engineSize) formData.append("engineSize", payload.engineSize);
    if (payload.driveType) formData.append("driveType", payload.driveType);
    const docUri = payload.vehicleIdentificationDoc;
    try {
      if (docUri.startsWith("data:image/")) {
        const base64Data = docUri.split(",")[1];
        const binary = atob(base64Data);
        const bytes = new Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
        formData.append("vehicleIdentificationDoc", blob, "vehicle_id_doc.jpg");
      } else if (docUri.startsWith("blob:")) {
        const resp = await fetch(docUri);
        const blob = await resp.blob();
        formData.append("vehicleIdentificationDoc", blob, "vehicle_id_doc.jpg");
      } else if (docUri.startsWith("file:") || docUri.startsWith("content:")) {
        const filename = docUri.split("/").pop() || "vehicle_id_doc.jpg";
        formData.append("vehicleIdentificationDoc", {
          uri: docUri,
          name: filename,
          type: "image/jpeg",
        } as any);
      } else {
        try {
          const resp = await fetch(docUri);
          const blob = await resp.blob();
          formData.append(
            "vehicleIdentificationDoc",
            blob,
            "vehicle_id_doc.jpg",
          );
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    return apiRequest(`/vehicles/${id}`, {
      method: "PATCH",
      body: formData,
      auth: true,
      isFormData: true,
    });
  } else {
    // No new images or docs, use regular JSON
    return apiRequest(`/vehicles/${id}`, {
      method: "PATCH",
      body: payload,
      auth: true,
    });
  }
}

export async function deleteVehicle(
  id: string,
): Promise<{ status: number; message: string }> {
  return apiRequest(`/vehicles/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

// Dedicated search function - comprehensive backend search
export async function searchVehicles(filters?: {
  q?: string;
  type?: string;
  fuelType?: string;
  year?: string;
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  status?: string;
  sortBy?:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "newest"
    | "oldest"
    | "views";
}): Promise<VehicleListResponse & { data: { count: number } }> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.fuelType) params.append("fuelType", filters.fuelType);
  if (filters?.year) params.append("year", filters.year);
  if (filters?.brand) params.append("brand", filters.brand);
  if (filters?.model) params.append("model", filters.model);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));
  if (filters?.location) params.append("location", filters.location);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.sortBy) params.append("sortBy", filters.sortBy);

  const query = params.toString();
  return apiRequest(`/vehicles/search${query ? `?${query}` : ""}`);
}

// Live search for autocomplete - fast and lightweight
export async function liveSearchVehicles(
  query: string,
  limit = 10,
): Promise<{
  status: number;
  data: {
    vehicles: Array<{
      id: string;
      title: string;
      brand: string;
      model: string;
      year: string;
      price: number;
      location: string;
      image: string | null;
      vehicleType?: string;
      sellerName: string;
    }>;
    suggestions: {
      brands: string[];
      models: string[];
      locations: string[];
    };
  };
}> {
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("limit", String(limit));
  return apiRequest(`/vehicles/live-search?${params.toString()}`);
}

// Fetch unique models for a specific brand
export async function fetchModelsByBrand(brand: string): Promise<{
  status: number;
  data: {
    models: string[];
  };
}> {
  return apiRequest(`/vehicles/models?brand=${encodeURIComponent(brand)}`);
}

// Fetch unique brands with representative images
export async function fetchBrandsWithImages(): Promise<{
  status: number;
  data: {
    brands: Array<{ name: string; image: string | null; count: number }>;
  };
}> {
  return apiRequest("/vehicles/brands");
}

// Suggested featured vehicles from subscribed sellers
export async function fetchSuggestedFeaturedVehicles(
  limit = 8,
  excludeId?: string,
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  if (excludeId) params.append("excludeId", excludeId);
  return apiRequest(`/vehicles/suggested-featured?${params.toString()}`);
}
