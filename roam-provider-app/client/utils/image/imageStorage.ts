import { supabase } from "@/lib/supabase";
import { 
  ImageType, 
  ImageUploadResult, 
  StorageConfig, 
  STORAGE_BUCKETS 
} from "./imageTypes";
import { ImageProcessingService } from "./imageProcessing";

// Create service role client for admin operations
const createServiceRoleClient = () => {
  // In the browser environment, we can't directly use service role key for security reasons
  // Instead, we'll use a server endpoint that handles the upload with service role
  // The service role operations should be handled on the server side
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not available, falling back to anon client');
    return supabase;
  }
  
  // Note: In production, service role operations should be handled server-side
  return supabase;
};

export class ImageStorageService {
  /**
   * Upload image to Supabase storage via server endpoint (uses service role)
   */
  static async uploadImage(
    file: File,
    imageType: ImageType,
    businessId: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Compress and resize image before upload to avoid Vercel 4.5MB limit
      // Base64 encoding increases size by ~33%, so we need to keep files under ~1.5MB
      // Target: 1.5MB raw = ~2MB base64 + ~0.5MB JSON overhead = ~2.5MB total (safe under 4.5MB)
      const maxSafeSize = 1.5 * 1024 * 1024; // 1.5MB - very conservative
      let processedFile = file;
      
      try {
        // For business cover images, compress aggressively from the start
        if (imageType === 'business_cover') {
          // Compress business cover to 1280x720 at 75% quality (good balance)
          processedFile = await ImageProcessingService.processImage(
            file,
            {
              width: 1280,
              height: 720,
              aspectRatio: 16 / 9,
              quality: 75,
              format: 'jpeg'
            }
          );
        } else {
          // For other image types, resize according to requirements first
          processedFile = await ImageProcessingService.resizeImage(file, imageType);
        }
        
        // If still too large after initial compression, compress further with lower quality
        if (processedFile.size > maxSafeSize) {
          console.log(`Image still too large (${(processedFile.size / 1024 / 1024).toFixed(2)}MB), compressing further...`);
          
          // Determine aggressive compression settings
          let targetWidth: number;
          let targetHeight: number;
          let quality: number;
          
          if (imageType === 'business_cover') {
            // Already at 1280x720, reduce quality further or resize more
            if (processedFile.size > maxSafeSize * 2) {
              targetWidth = 1024;
              targetHeight = 576;
              quality = 60;
            } else {
              targetWidth = 1280;
              targetHeight = 720;
              quality = 65;
            }
          } else {
            // For other types, resize more aggressively
            targetWidth = processedFile.size > maxSafeSize * 2 ? 1024 : 1280;
            quality = processedFile.size > maxSafeSize * 2 ? 60 : 70;
          }
          
          processedFile = await ImageProcessingService.processImage(
            processedFile,
            {
              width: targetWidth,
              height: imageType === 'business_cover' ? targetHeight : undefined,
              aspectRatio: imageType === 'business_cover' ? 16 / 9 : undefined,
              quality: quality,
              format: 'jpeg'
            }
          );
          
          // If still too large after second pass, one more aggressive compression
          if (processedFile.size > maxSafeSize) {
            console.log(`Image still too large after second pass (${(processedFile.size / 1024 / 1024).toFixed(2)}MB), final compression...`);
            
            const finalWidth = imageType === 'business_cover' ? 1024 : 800;
            const finalHeight = imageType === 'business_cover' ? 576 : undefined;
            
            processedFile = await ImageProcessingService.processImage(
              processedFile,
              {
                width: finalWidth,
                height: finalHeight,
                aspectRatio: imageType === 'business_cover' ? 16 / 9 : undefined,
                quality: 55,
                format: 'jpeg'
              }
            );
          }
        }
        
        console.log(`Final image size: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB (original: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Final safety check - if still too large, reject
        if (processedFile.size > 2 * 1024 * 1024) { // 2MB absolute max
          return {
            success: false,
            error: `Unable to compress image below safe limit. Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Please use a smaller image file.`
          };
        }
      } catch (compressError) {
        console.error('Image compression failed:', compressError);
        // If compression fails, reject large files
        if (file.size > 2 * 1024 * 1024) {
          return {
            success: false,
            error: `Image compression failed and file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a smaller image file (under 2MB recommended).`
          };
        }
        // For smaller files, try to proceed
        processedFile = file;
      }
      
      // Convert processed file to base64 for server transmission
      const base64 = await this.fileToBase64(processedFile);
      
      // Estimate total payload size (base64 is ~33% larger than original)
      const estimatedPayloadSize = base64.length + JSON.stringify({
        imageType,
        businessId,
        userId,
        fileName: processedFile.name,
        fileType: processedFile.type,
        fileSize: processedFile.size
      }).length;
      
      // Vercel limit is 4.5MB, stay well below
      const maxPayloadSize = 3.5 * 1024 * 1024; // 3.5MB - conservative limit
      
      if (estimatedPayloadSize > maxPayloadSize) {
        console.error(`Payload size (${(estimatedPayloadSize / 1024 / 1024).toFixed(2)}MB) exceeds safe limit`);
        return {
          success: false,
          error: `Image is too large even after compression (${(processedFile.size / 1024 / 1024).toFixed(2)}MB). Please use a smaller image file.`
        };
      }
      
      // Upload via server endpoint that uses service role
      const response = await fetch('/api/onboarding/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64,
          imageType,
          businessId,
          userId,
          fileName: processedFile.name,
          fileType: processedFile.type,
          fileSize: processedFile.size
        }),
      });

      if (!response.ok) {
        // Handle 413 (Payload Too Large) specifically
        if (response.status === 413) {
          throw new Error('Image is too large even after compression. Please try using a smaller image file (under 2MB recommended).');
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Check if server returned actual URLs (production mode)
        if (result.url || result.publicUrl) {
          return {
            success: true,
            url: result.url,
            publicUrl: result.publicUrl || result.url
          };
        }
        
        // If server is in test mode, throw error to trigger fallback
        if (result.testMode) {
          throw new Error('Server is in test mode - no actual upload performed');
        }
        
        throw new Error('Server did not return image URL');
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload image with custom configuration (uses server endpoint)
   */
  static async uploadImageWithConfig(
    file: File,
    config: StorageConfig
  ): Promise<ImageUploadResult> {
    try {
      // Compress image if needed to avoid Vercel limit
      let processedFile = file;
      const maxSafeSize = 2.5 * 1024 * 1024; // 2.5MB
      
      if (file.size > maxSafeSize) {
        try {
          // Determine target dimensions for aggressive compression
          let targetWidth: number | undefined;
          let targetHeight: number | undefined;
          
          if (file.size > maxSafeSize * 2) {
            targetWidth = 1280;
            targetHeight = 720; // Maintain 16:9 aspect ratio
          }
          
          processedFile = await ImageProcessingService.processImage(
            file,
            {
              width: targetWidth,
              height: targetHeight,
              quality: 70,
              format: 'jpeg'
            }
          );
        } catch (compressError) {
          console.warn('Image compression failed, using original file:', compressError);
          if (file.size > 3.5 * 1024 * 1024) {
            return {
              success: false,
              error: `Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a smaller image.`
            };
          }
        }
      }
      
      // Convert processed file to base64 for server transmission
      const base64 = await this.fileToBase64(processedFile);
      
      // Upload via server endpoint that uses service role
      const response = await fetch('/api/onboarding/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64,
          imageType: 'custom',
          businessId: 'custom',
          userId: 'custom',
          fileName: processedFile.name,
          fileType: processedFile.type,
          fileSize: processedFile.size,
          customConfig: config
        }),
      });

      if (!response.ok) {
        // Handle 413 (Payload Too Large) specifically
        if (response.status === 413) {
          throw new Error('Image is too large even after compression. Please try using a smaller image file (under 2MB recommended).');
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Check if server returned actual URLs
        if (result.url || result.publicUrl) {
          return {
            success: true,
            url: result.url,
            publicUrl: result.publicUrl || result.url
          };
        }
        
        throw new Error('Server did not return image URL');
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete image from storage
   */
  static async deleteImage(imagePath: string, bucket: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([imagePath]);

      if (error) {
        console.error('Failed to delete image:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Image deletion error:', error);
      return false;
    }
  }

  /**
   * Delete image by type and business ID
   */
  static async deleteImageByType(
    imageType: ImageType,
    businessId: string,
    fileName: string
  ): Promise<boolean> {
    const storagePath = this.getStoragePath(imageType, businessId);
    const fullPath = `${storagePath}/${fileName}`;
    
    return this.deleteImage(fullPath, STORAGE_BUCKETS[imageType]);
  }

  /**
   * Get public URL for image
   */
  static getImageUrl(imagePath: string, bucket: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(imagePath);

    return data.publicUrl;
  }

  /**
   * Get public URL by type
   */
  static getImageUrlByType(imagePath: string, imageType: ImageType): string {
    return this.getImageUrl(imagePath, STORAGE_BUCKETS[imageType]);
  }

  /**
   * List images for a business
   */
  static async listBusinessImages(
    businessId: string,
    imageType: ImageType
  ): Promise<string[]> {
    try {
      const storagePath = this.getStoragePath(imageType, businessId);
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS[imageType])
        .list(storagePath);

      if (error) {
        console.error('Failed to list images:', error);
        return [];
      }

      return data?.map(item => item.name) || [];
    } catch (error) {
      console.error('List images error:', error);
      return [];
    }
  }

  /**
   * Check if image exists
   */
  static async imageExists(imagePath: string, bucket: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(imagePath);

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage path for image type
   */
  private static getStoragePath(imageType: ImageType, businessId: string, userId?: string): string {
    switch (imageType) {
      case 'business_logo':
        return `businesses/${businessId}/logo`;
      case 'business_cover':
        return `businesses/${businessId}/cover`;
      case 'provider_avatar':
        return `avatar-provider-user/${userId || businessId}`;
      case 'provider_cover':
        return `cover-provider-user/${userId || businessId}`;
      case 'customer_avatar':
        return `avatar-customer-user/${userId || businessId}`;
      case 'document_image':
        return `provider-documents/${businessId}`;
      case 'service_image':
        return `image-services/${businessId}`;
      default:
        return `images/${businessId}`;
    }
  }

  /**
   * Generate signed URL for private images
   */
  static async getSignedUrl(
    imagePath: string,
    bucket: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(imagePath, expiresIn);

      if (error) {
        console.error('Failed to create signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL error:', error);
      return null;
    }
  }

  /**
   * Download image as blob
   */
  static async downloadImage(imagePath: string, bucket: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(imagePath);

      if (error) {
        console.error('Failed to download image:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Download image error:', error);
      return null;
    }
  }

  /**
   * Update image metadata
   */
  static async updateImageMetadata(
    imagePath: string,
    bucket: string,
    metadata: Record<string, string>
  ): Promise<boolean> {
    try {
      // Note: Supabase storage doesn't support direct metadata updates
      // This would require re-uploading the file with new metadata
      // For now, return true as this is a placeholder implementation
      console.warn('Metadata update not supported in current Supabase version');
      return true;
    } catch (error) {
      console.error('Update metadata error:', error);
      return false;
    }
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(
    imagePath: string,
    bucket: string
  ): Promise<Record<string, string> | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(imagePath);

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0].metadata || null;
    } catch (error) {
      console.error('Get metadata error:', error);
      return null;
    }
  }

  /**
   * Generate preview URL for file input
   */
  static generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup preview URL to prevent memory leaks
   */
  static cleanupPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Validate image file against requirements
   */
  static async validateImage(file: File, imageType: ImageType): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size - use 50MB for all types
    const maxSize = 50 * 1024 * 1024; // 50MB for all images
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('File must be JPG, PNG, or WebP format');
    }

    // Check dimensions (basic check - could be enhanced with actual image loading)
    if (file.size > 0) {
      // For now, just check if it's a reasonable size
      // In production, you might want to load the image and check actual dimensions
      if (file.size < 1024) { // Less than 1KB might be too small
        warnings.push('Image file seems very small - may be low quality');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Fallback upload method that tries alternative storage or converts to base64
   */
  static async uploadImageWithFallback(
    file: File,
    imageType: ImageType,
    businessId: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // First try the normal upload
      const result = await this.uploadImage(file, imageType, businessId, userId);
      if (result.success) {
        return result;
      }

      // If normal upload fails due to policy issues, try alternative approach
      console.log('Normal upload failed, trying fallback method...');
      
      // For development/testing, we can store images as base64 in localStorage
      // In production, this would fall back to a different storage service
      if (process.env.NODE_ENV === 'development' || 
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1') {
        
        const base64 = await this.fileToBase64(file);
        const fallbackUrl = `data:${file.type};base64,${base64}`;
        
        console.log('Using fallback base64 storage for development');
        return {
          success: true,
          url: `fallback_${imageType}_${businessId}`,
          publicUrl: fallbackUrl
        };
      }

      // If all else fails, return the original error
      return result;
    } catch (error) {
      console.error('Fallback upload error:', error);
      return {
        success: false,
        error: 'All upload methods failed'
      };
    }
  }

  /**
   * Convert file to base64 for fallback storage
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix to get just the base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }
}
