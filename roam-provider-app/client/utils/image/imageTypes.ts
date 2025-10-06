export type ImageType = 
  | "business_logo"
  | "business_cover"
  | "provider_avatar"
  | "provider_cover"
  | "customer_avatar"
  | "document_image"
  | "service_image";

export interface ImageRequirements {
  maxSize: number; // in bytes
  maxWidth: number;
  maxHeight: number;
  formats: string[];
  aspectRatio?: number; // width/height
  quality?: number; // 0-100
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
  error?: string;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  aspectRatio?: number;
}

export interface StorageConfig {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
}

// Image requirements configuration
export const IMAGE_REQUIREMENTS: Record<ImageType, ImageRequirements> = {
  business_logo: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 800,
    maxHeight: 800,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 1, // Square
    quality: 85,
  },
  business_cover: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 1920,
    maxHeight: 1080,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 16 / 9, // 16:9
    quality: 80,
  },
  provider_avatar: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 400,
    maxHeight: 400,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 1, // Square
    quality: 90,
  },
  provider_cover: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 1200,
    maxHeight: 400,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 3, // 3:1
    quality: 85,
  },
  customer_avatar: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 400,
    maxHeight: 400,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 1, // Square
    quality: 90,
  },
  document_image: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 2048,
    maxHeight: 2048,
    formats: ["jpg", "jpeg", "png", "pdf"],
    quality: 85,
  },
  service_image: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxWidth: 1200,
    maxHeight: 800,
    formats: ["jpg", "jpeg", "png", "webp"],
    aspectRatio: 3 / 2, // 3:2
    quality: 85,
  },
};

// Storage bucket configuration
export const STORAGE_BUCKETS: Record<ImageType, string> = {
  business_logo: "roam-file-storage",
  business_cover: "roam-file-storage",
  provider_avatar: "roam-file-storage",
  provider_cover: "roam-file-storage",
  customer_avatar: "roam-file-storage",
  document_image: "provider-documents",
  service_image: "roam-file-storage",
};

// File type validation
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];
