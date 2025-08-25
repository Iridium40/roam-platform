import { supabase } from "@/lib/supabase";
import { 
  ImageType, 
  ImageUploadResult, 
  StorageConfig, 
  STORAGE_BUCKETS 
} from "./imageTypes";

export class ImageStorageService {
  /**
   * Upload image to Supabase storage
   */
  static async uploadImage(
    file: File,
    imageType: ImageType,
    businessId: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `${imageType}_${businessId}_${timestamp}_${randomId}.${fileExtension}`;

      // Determine storage path
      const storagePath = this.getStoragePath(imageType, businessId, userId);
      const fullPath = `${storagePath}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS[imageType])
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS[imageType])
        .getPublicUrl(fullPath);

      return {
        success: true,
        url: fullPath,
        publicUrl: urlData.publicUrl
      };

    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload image with custom configuration
   */
  static async uploadImageWithConfig(
    file: File,
    config: StorageConfig
  ): Promise<ImageUploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(config.bucket)
        .upload(`${config.path}/${config.fileName}`, file, {
          contentType: config.contentType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: data.path,
        publicUrl: urlData.publicUrl
      };

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
        return `business-logos/${businessId}`;
      case 'business_cover':
        return `business-covers/${businessId}`;
      case 'provider_avatar':
        return `provider-avatars/${userId || businessId}`;
      case 'customer_avatar':
        return `customer-avatars/${userId || businessId}`;
      case 'document_image':
        return `business-documents/${businessId}`;
      case 'service_image':
        return `service-images/${businessId}`;
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
      const { error } = await supabase.storage
        .from(bucket)
        .update(imagePath, {
          metadata
        });

      if (error) {
        console.error('Failed to update image metadata:', error);
        return false;
      }

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
}
