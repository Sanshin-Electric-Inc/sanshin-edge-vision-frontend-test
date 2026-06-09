// src/types/places.ts

export interface Place {
  area: number;
  spot: number;
  tenant_id: string;
  place_name: string;
  lat?: number;
  lng?: number;
  display_order?: number;
}

export interface PlaceCreateRequest {
  area: number;
  spot: number;
  place_name: string;
  lat?: number;
  lng?: number;
  display_order?: number;
}

export interface PlaceUpdateRequest {
  place_name: string;
  lat?: number;
  lng?: number;
  display_order?: number;
}

export interface PlacesApiResponse {
  count: number;
  data: Place[];
}