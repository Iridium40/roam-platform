import { supabase } from "./index";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export interface StorageConfig {
  bucket: string;
  path: string;
  file: File;
  options?: {
    upsert?: boolean;
    contentType?: string;
  };
}

export class StorageAPI {
  // Upload file to storage
  static async uploadFile(config: StorageConfig): Promise<UploadResult> {
    const { bucket, path, file, options = {} } = config;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { 
        upsert: options.upsert ?? true,
        contentType: options.contentType
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      path,
      publicUrl: urlData.publicUrl,
    };
  }

  // Delete file from storage
  static async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.warn(`Failed to delete file ${path}:`, error);
      // Don't throw error for delete failures, just warn
    }
  }

  // Get public URL for file
  static getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Upload customer avatar
  static async uploadCustomerAvatar(customerId: string, file: File): Promise<UploadResult> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${customerId}-${Date.now()}.${fileExt}`;
    const filePath = `customer_avatars/${fileName}`;

    return this.uploadFile({
      bucket: "customer-avatars",
      path: filePath,
      file,
      options: { upsert: true }
    });
  }

  // Upload provider image
  static async uploadProviderImage(providerId: string, file: File): Promise<UploadResult> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${providerId}-${Date.now()}.${fileExt}`;
    const filePath = `provider_images/${fileName}`;

    return this.uploadFile({
      bucket: "provider-images",
      path: filePath,
      file,
      options: { upsert: true }
    });
  }

  // Upload business logo
  static async uploadBusinessLogo(businessId: string, file: File): Promise<UploadResult> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${businessId}-logo-${Date.now()}.${fileExt}`;
    const filePath = `business_logos/${fileName}`;

    return this.uploadFile({
      bucket: "business-logos",
      path: filePath,
      file,
      options: { upsert: true }
    });
  }

  // Upload business cover image
  static async uploadBusinessCoverImage(businessId: string, file: File): Promise<UploadResult> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${businessId}-cover-${Date.now()}.${fileExt}`;
    const filePath = `business_covers/${fileName}`;

    return this.uploadFile({
      bucket: "business-covers",
      path: filePath,
      file,
      options: { upsert: true }
    });
  }

  // Upload business documents
  static async uploadBusinessDocument(
    businessId: string, 
    documentType: string, 
    file: File
  ): Promise<UploadResult> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${businessId}-${documentType}-${Date.now()}.${fileExt}`;
    const filePath = `business_documents/${fileName}`;

    return this.uploadFile({
      bucket: "business-documents",
      path: filePath,
      file,
      options: { upsert: false } // Don't overwrite existing documents
    });
  }

  // Test bucket access
  static async testBucketAccess(bucket: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list("", { limit: 1 });

      if (error) {
        console.error(`Bucket access test failed for ${bucket}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Bucket access test error for ${bucket}:`, error);
      return false;
    }
  }

  // List files in bucket
  static async listFiles(bucket: string, path: string = ""): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data?.map(file => file.name) || [];
  }

  // Download file
  static async downloadFile(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data received from download");
    }

    return data;
  }
}
