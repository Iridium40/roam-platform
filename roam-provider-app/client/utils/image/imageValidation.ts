import { 
  ImageType, 
  ImageRequirements, 
  ImageValidationResult, 
  IMAGE_REQUIREMENTS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES 
} from "./imageTypes";

export class ImageValidationService {
  /**
   * Validate image file against requirements
   */
  static validateImage(file: File, imageType: ImageType): Promise<ImageValidationResult> {
    return new Promise((resolve) => {
      const requirements = IMAGE_REQUIREMENTS[imageType];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check file size
      if (file.size > requirements.maxSize) {
        errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.formatFileSize(requirements.maxSize)})`);
      }

      // Check file format
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !requirements.formats.includes(fileExtension)) {
        errors.push(`File format not supported. Allowed formats: ${requirements.formats.join(', ')}`);
      }

      // Check MIME type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`File type not supported. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      }

      // Check image dimensions and aspect ratio
      const img = new Image();
      img.onload = () => {
        // Check dimensions
        if (img.width > requirements.maxWidth || img.height > requirements.maxHeight) {
          warnings.push(`Image will be resized from ${img.width}x${img.height} to fit ${requirements.maxWidth}x${requirements.maxHeight}`);
        }

        // Check aspect ratio
        if (requirements.aspectRatio) {
          const actualRatio = img.width / img.height;
          const expectedRatio = requirements.aspectRatio;
          const tolerance = 0.1;
          
          if (Math.abs(actualRatio - expectedRatio) > tolerance) {
            warnings.push(`Image aspect ratio (${actualRatio.toFixed(2)}:1) differs from recommended (${expectedRatio}:1). Image may be cropped.`);
          }
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      };

      img.onerror = () => {
        errors.push('Invalid image file');
        resolve({
          isValid: false,
          errors,
          warnings
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate document image
   */
  static validateDocumentImage(file: File): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size (10MB limit for documents)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.formatFileSize(maxSize)})`);
    }

    // Check file type
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      errors.push(`File type not supported. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
    }

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension not supported. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.name)) {
      warnings.push('File name may be suspicious');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple images
   */
  static async validateImages(files: File[], imageType: ImageType): Promise<ImageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      const validation = await this.validateImage(file, imageType);
      errors.push(...validation.errors.map(error => `${file.name}: ${error}`));
      warnings.push(...validation.warnings.map(warning => `${file.name}: ${warning}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if file is an image
   */
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  static isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Check if file is a document (image or PDF)
   */
  static isDocumentFile(file: File): boolean {
    return this.isImageFile(file) || this.isPdfFile(file);
  }

  /**
   * Get file extension
   */
  static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file name is suspicious
   */
  private static isSuspiciousFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,
      /[<>:"/\\|?*]/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get image dimensions
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate aspect ratio
   */
  static calculateAspectRatio(width: number, height: number): number {
    return width / height;
  }

  /**
   * Check if aspect ratio is within tolerance
   */
  static isAspectRatioValid(
    actualRatio: number, 
    expectedRatio: number, 
    tolerance: number = 0.1
  ): boolean {
    return Math.abs(actualRatio - expectedRatio) <= tolerance;
  }
}
