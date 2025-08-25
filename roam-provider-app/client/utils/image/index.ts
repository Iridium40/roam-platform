// Export types
export * from "./imageTypes";

// Export services
export { ImageValidationService } from "./imageValidation";
export { ImageProcessingService } from "./imageProcessing";
export { ImageStorageService } from "./imageStorage";

// Re-export commonly used types for convenience
export type {
  ImageType,
  ImageRequirements,
  ImageValidationResult,
  ImageUploadResult,
  ImageProcessingOptions,
  StorageConfig,
} from "./imageTypes";

// Export constants
export {
  IMAGE_REQUIREMENTS,
  STORAGE_BUCKETS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
} from "./imageTypes";
