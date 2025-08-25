import { 
  ImageType, 
  ImageRequirements, 
  ImageProcessingOptions, 
  IMAGE_REQUIREMENTS 
} from "./imageTypes";

export class ImageProcessingService {
  /**
   * Resize and optimize image
   */
  static resizeImage(file: File, imageType: ImageType): Promise<File> {
    return new Promise((resolve, reject) => {
      const requirements = IMAGE_REQUIREMENTS[imageType];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            requirements.maxWidth, 
            requirements.maxHeight,
            requirements.aspectRatio
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File([blob], file.name, {
                  type: this.getOptimizedMimeType(file.type),
                  lastModified: Date.now(),
                });
                resolve(processedFile);
              } else {
                reject(new Error('Failed to process image'));
              }
            },
            this.getOptimizedMimeType(file.type),
            requirements.quality ? requirements.quality / 100 : 0.85
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process image with custom options
   */
  static processImage(file: File, options: ImageProcessingOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate dimensions
          let { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            options.width || img.width,
            options.height || img.height,
            options.aspectRatio
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw processed image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          const mimeType = options.format ? `image/${options.format}` : file.type;
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File([blob], file.name, {
                  type: mimeType,
                  lastModified: Date.now(),
                });
                resolve(processedFile);
              } else {
                reject(new Error('Failed to process image'));
              }
            },
            mimeType,
            options.quality ? options.quality / 100 : 0.85
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Crop image to specific aspect ratio
   */
  static cropImage(file: File, aspectRatio: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height, x, y } = this.calculateCropDimensions(
            img.width,
            img.height,
            aspectRatio
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw cropped image
          ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const croppedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(croppedFile);
              } else {
                reject(new Error('Failed to crop image'));
              }
            },
            file.type,
            0.9
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail
   */
  static generateThumbnail(file: File, maxSize: number = 150): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate thumbnail dimensions
          const { width, height } = this.calculateThumbnailDimensions(
            img.width,
            img.height,
            maxSize
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw thumbnail
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(thumbnailFile);
              } else {
                reject(new Error('Failed to generate thumbnail'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    targetAspectRatio?: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if too large
    if (width > maxWidth || height > maxHeight) {
      const scaleX = maxWidth / width;
      const scaleY = maxHeight / height;
      const scale = Math.min(scaleX, scaleY);
      
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // Apply target aspect ratio if specified
    if (targetAspectRatio) {
      const currentRatio = width / height;
      if (Math.abs(currentRatio - targetAspectRatio) > 0.01) {
        if (currentRatio > targetAspectRatio) {
          // Image is too wide, crop width
          width = Math.round(height * targetAspectRatio);
        } else {
          // Image is too tall, crop height
          height = Math.round(width / targetAspectRatio);
        }
      }
    }

    return { width, height };
  }

  /**
   * Calculate crop dimensions for specific aspect ratio
   */
  private static calculateCropDimensions(
    width: number,
    height: number,
    aspectRatio: number
  ): { width: number; height: number; x: number; y: number } {
    const currentRatio = width / height;
    
    if (currentRatio > aspectRatio) {
      // Image is too wide, crop from center
      const newWidth = Math.round(height * aspectRatio);
      const x = Math.round((width - newWidth) / 2);
      return { width: newWidth, height, x, y: 0 };
    } else {
      // Image is too tall, crop from center
      const newHeight = Math.round(width / aspectRatio);
      const y = Math.round((height - newHeight) / 2);
      return { width, height: newHeight, x: 0, y };
    }
  }

  /**
   * Calculate thumbnail dimensions
   */
  private static calculateThumbnailDimensions(
    width: number,
    height: number,
    maxSize: number
  ): { width: number; height: number } {
    if (width <= maxSize && height <= maxSize) {
      return { width, height };
    }

    const scale = Math.min(maxSize / width, maxSize / height);
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }

  /**
   * Get optimized MIME type
   */
  private static getOptimizedMimeType(originalType: string): string {
    // Prefer WebP for better compression
    if (originalType === 'image/png' || originalType === 'image/jpeg') {
      return 'image/webp';
    }
    return originalType;
  }

  /**
   * Compress image data URL
   */
  static compressDataUrl(dataUrl: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = dataUrl;
    });
  }
}
