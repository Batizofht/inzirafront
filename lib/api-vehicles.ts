import { apiRequest } from "./api-client";
import type { Vehicle } from "@/types/vehicle";

export type VehicleListResponse = {
  status: number;
  data: {
    vehicles: Array<
      Vehicle & { sellerName?: string; sellerPhone?: string; category?: string }
    >;
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
};

export type VehicleDetailResponse = {
  status: number;
  data: {
    vehicle: Vehicle & {
      sellerName?: string;
      sellerPhone?: string;
      sellerEmail?: string;
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
  batteryRange?: string;
  driveType?: string;
  vehicleIdentificationDoc?: string;
  isBrokered?: boolean;
  providesAssurance?: boolean;
  status?: "active" | "pending" | "sold" | "rejected";
  /** Total units (business sellers listing several identical cars). */
  quantity?: number;
  /** Optional per-colour breakdown for multi-unit listings. */
  colorLabels?: { color: string; count: number }[];
};

export async function fetchVehicles(filters?: {
  q?: string;
  type?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  brand?: string[];
  color?: string[];
  usageStatus?: string[];
  bodyType?: string[];
  model?: string[];
  minMileage?: number;
  maxMileage?: number;
}): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.fuelType) params.append("fuelType", filters.fuelType);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));
  if (filters?.location) params.append("location", filters.location);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.sort) params.append("sort", filters.sort);
  if (filters?.brand?.length) params.append("brand", filters.brand.join(","));
  if (filters?.color?.length) params.append("color", filters.color.join(","));
  if (filters?.usageStatus?.length) params.append("usageStatus", filters.usageStatus.join(","));
  if (filters?.bodyType?.length) params.append("bodyType", filters.bodyType.join(","));
  if (filters?.model?.length) params.append("model", filters.model.join(","));
  if (filters?.minMileage != null) params.append("minMileage", String(filters.minMileage));
  if (filters?.maxMileage != null) params.append("maxMileage", String(filters.maxMileage));

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
    page?: number;
    limit?: number;
    sort?: string;
    brand?: string[];
    color?: string[];
    usageStatus?: string[];
    bodyType?: string[];
    model?: string[];
    minMileage?: number;
    maxMileage?: number;
  },
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  if (filters?.q) params.append("q", filters.q);
  if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
  if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));
  if (filters?.location) params.append("location", filters.location);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.sort) params.append("sort", filters.sort);
  if (filters?.brand?.length) params.append("brand", filters.brand.join(","));
  if (filters?.color?.length) params.append("color", filters.color.join(","));
  if (filters?.usageStatus?.length) params.append("usageStatus", filters.usageStatus.join(","));
  if (filters?.bodyType?.length) params.append("bodyType", filters.bodyType.join(","));
  if (filters?.model?.length) params.append("model", filters.model.join(","));
  if (filters?.minMileage != null) params.append("minMileage", String(filters.minMileage));
  if (filters?.maxMileage != null) params.append("maxMileage", String(filters.maxMileage));

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
  excludeIds?: string[],
): Promise<VehicleListResponse> {
  const params = new URLSearchParams();
  params.append("limit", String(limit));
  if (excludeIds && excludeIds.length > 0) {
    params.append("excludeIds", excludeIds.join(","));
  }
  return apiRequest(`/vehicles/recent?${params.toString()}`);
}

export async function fetchDailyPicks(): Promise<VehicleListResponse & { data: { ids: string[] } }> {
  return apiRequest(`/vehicles/daily-picks`);
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
  if (payload.batteryRange) formData.append("batteryRange", payload.batteryRange);
  if (payload.driveType) formData.append("driveType", payload.driveType);
  if (payload.isBrokered) formData.append("isBrokered", "true");
  if (payload.providesAssurance) formData.append("providesAssurance", "true");
  if (payload.quantity != null) formData.append("quantity", String(payload.quantity));
  if (payload.colorLabels) formData.append("colorLabels", JSON.stringify(payload.colorLabels));

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
    if (payload.batteryRange) formData.append("batteryRange", payload.batteryRange);
    if (payload.driveType) formData.append("driveType", payload.driveType);
    if (payload.isBrokered !== undefined) formData.append("isBrokered", String(payload.isBrokered));
    if (payload.providesAssurance !== undefined) formData.append("providesAssurance", String(payload.providesAssurance));
    if (payload.quantity != null) formData.append("quantity", String(payload.quantity));
    if (payload.colorLabels) formData.append("colorLabels", JSON.stringify(payload.colorLabels));

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
        } else if (
          docUri.startsWith("/uploads/") ||
          docUri.startsWith("/vehicles/") ||
          docUri.startsWith("http://") ||
          docUri.startsWith("https://") ||
          !docUri.includes("/")
        ) {
          // Existing server URL — pass as-is, no re-fetch
          formData.append("vehicleIdentificationDoc", docUri);
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
    if (payload.batteryRange) formData.append("batteryRange", payload.batteryRange);
    if (payload.driveType) formData.append("driveType", payload.driveType);
    if (payload.isBrokered !== undefined) formData.append("isBrokered", String(payload.isBrokered));
    if (payload.providesAssurance !== undefined) formData.append("providesAssurance", String(payload.providesAssurance));
    if (payload.quantity != null) formData.append("quantity", String(payload.quantity));
    if (payload.colorLabels) formData.append("colorLabels", JSON.stringify(payload.colorLabels));
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
      } else if (
        docUri.startsWith("/uploads/") ||
        docUri.startsWith("/vehicles/") ||
        docUri.startsWith("http://") ||
        docUri.startsWith("https://") ||
        !docUri.includes("/")
      ) {
        // Existing server URL — pass as-is, no re-fetch
        formData.append("vehicleIdentificationDoc", docUri);
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

/**
 * Seller-only manual stock reduction. Decrements remaining by one (and the
 * given colour's count when supplied). Backend auto-marks the listing sold at
 * 0 remaining. Returns the updated vehicle.
 */
export async function reduceVehicleStock(
  id: string,
  color?: string,
): Promise<VehicleDetailResponse> {
  return apiRequest(`/vehicles/${id}/reduce-stock`, {
    method: "POST",
    auth: true,
    body: color ? { color } : {},
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

// Fetch body types with counts
export async function fetchBodyTypes(): Promise<{
  status: number;
  data: {
    bodyTypes: Array<{ name: string; count: number }>;
  };
}> {
  return apiRequest("/vehicles/body-types");
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
