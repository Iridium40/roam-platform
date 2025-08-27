import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface BusinessDocumentUploadFormProps {
  businessId: string;
  existingDocuments?: any[];
  onUploadComplete?: () => void;
  onCancel?: () => void;
}

type DocumentType = 'drivers_license' | 'proof_of_address' | 'liability_insurance' | 'professional_license' | 'professional_certificate' | 'business_license';

interface Document {
  id: string;
  file: File;
  documentType: DocumentType;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  drivers_license: 'Driver\'s License',
  proof_of_address: 'Proof of Address',
  liability_insurance: 'Liability Insurance',
  professional_license: 'Professional License',
  professional_certificate: 'Professional Certificate',
  business_license: 'Business License'
};

export default function BusinessDocumentUploadForm({
  businessId,
  existingDocuments = [],
  onUploadComplete,
  onCancel
}: BusinessDocumentUploadFormProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const hasExistingDocument = (documentType: DocumentType) => {
    return existingDocuments.some(doc => doc.document_type === documentType);
  };

  const getExistingDocument = (documentType: DocumentType) => {
    return existingDocuments.find(doc => doc.document_type === documentType);
  };

  const handleFileSelect = async (files: FileList, documentType: DocumentType) => {
    const newDocuments: Document[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      documentType,
      status: 'uploading',
      progress: 0
    }));

    setDocuments(prev => [...prev, ...newDocuments]);

    // Upload each document
    for (const doc of newDocuments) {
      await uploadDocument(doc);
    }
  };

  const uploadDocument = async (document: Document) => {
    try {
      setUploading(true);

      // Upload file to Supabase Storage
      const fileName = `${businessId}/${document.documentType}/${Date.now()}_${document.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-documents')
        .upload(fileName, document.file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('business-documents')
        .getPublicUrl(fileName);

      // Create database record
      const response = await fetch('/api/business/upload-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          documentType: document.documentType,
          documentName: document.file.name,
          fileUrl: urlData.publicUrl,
          fileSizeBytes: document.file.size
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document record');
      }

      // Update document status
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: 'success', progress: 100, url: urlData.publicUrl }
          : doc
      ));

      toast({
        title: "Document uploaded successfully",
        description: `${document.file.name} has been uploaded.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : doc
      ));

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const retryUpload = async (docId: string) => {
    const document = documents.find(doc => doc.id === docId);
    if (document) {
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { ...doc, status: 'uploading', progress: 0, error: undefined }
          : doc
      ));
      await uploadDocument(document);
    }
  };

  const handleSubmit = () => {
    if (documents.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload at least one document.",
        variant: "destructive",
      });
      return;
    }

    const hasErrors = documents.some(doc => doc.status === 'error');
    if (hasErrors) {
      toast({
        title: "Upload errors",
        description: "Please fix upload errors before continuing.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Documents uploaded",
      description: "All documents have been uploaded successfully.",
    });

    onUploadComplete?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Business Documents</h3>
        <p className="text-gray-600 mb-6">
          Upload your business verification documents. All documents will be reviewed by our team.
        </p>
      </div>

      {/* Document Type Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(documentTypeLabels).map(([type, label]) => {
          const existingDoc = getExistingDocument(type as DocumentType);
          const hasExisting = hasExistingDocument(type as DocumentType);
          
          return (
            <Card 
              key={type} 
              className={`border-2 transition-colors ${
                hasExisting 
                  ? 'border-green-300 bg-green-50 hover:border-green-400' 
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="relative">
                    <FileText className={`w-8 h-8 mx-auto mb-2 ${
                      hasExisting ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    {hasExisting && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
                  {hasExisting ? (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ Document uploaded
                      </p>
                      <p className="text-xs text-gray-500">
                        {existingDoc?.document_name}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {existingDoc?.verification_status || 'pending'}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">
                      Upload your {label.toLowerCase()}
                    </p>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files, type as DocumentType)}
                    className="hidden"
                    id={`file-${type}`}
                  />
                  <label htmlFor={`file-${type}`}>
                    <Button 
                      variant={hasExisting ? "outline" : "outline"} 
                      size="sm" 
                      className={`cursor-pointer ${
                        hasExisting ? 'border-green-300 text-green-700 hover:bg-green-50' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {hasExisting ? 'Update File' : 'Choose File'}
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{doc.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {documentTypeLabels[doc.documentType]}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {doc.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                      </div>
                    )}
                    
                    {doc.status === 'success' && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Uploaded</span>
                      </div>
                    )}
                    
                    {doc.status === 'error' && (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">{doc.error}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(doc.id)}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={uploading || documents.length === 0}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Documents'
          )}
        </Button>
      </div>
    </div>
  );
}
