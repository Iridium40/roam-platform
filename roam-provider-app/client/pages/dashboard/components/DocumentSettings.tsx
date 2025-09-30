import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Upload, Eye } from "lucide-react";
import BusinessDocumentUploadForm from "../../../components/BusinessDocumentUploadForm";

interface BusinessDocument {
  id: string;
  document_name: string;
  document_type: string;
  verification_status: string;
  file_size_bytes?: number;
  expiry_date?: string;
  rejection_reason?: string;
  created_at: string;
}

interface DocumentSettingsProps {
  businessDocuments: BusinessDocument[];
  documentsLoading: boolean;
  businessId: string;
  showDocumentUploadModal: boolean;
  onShowDocumentUploadModal: (show: boolean) => void;
  onDocumentUpload: () => void;
  onViewDocument: (document: BusinessDocument) => void;
  getStatusBadge: (status: string) => { label: string; color: string };
  getDocumentTypeLabel: (type: string) => string;
}

export default function DocumentSettings({
  businessDocuments,
  documentsLoading,
  businessId,
  showDocumentUploadModal,
  onShowDocumentUploadModal,
  onDocumentUpload,
  onViewDocument,
  getStatusBadge,
  getDocumentTypeLabel
}: DocumentSettingsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Business Documents
            </div>
            <Button 
              onClick={() => onShowDocumentUploadModal(true)} 
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Update Documents
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-roam-blue mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading documents...</p>
            </div>
          ) : businessDocuments.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Documents</h3>
              <p className="text-gray-600 mb-4">
                Upload and manage your business verification documents including licenses, 
                insurance certificates, and professional credentials.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Professional licenses and certifications</p>
                <p>• Business registration documents</p>
                <p>• Liability insurance certificates</p>
                <p>• Proof of address and identification</p>
              </div>
              <Button 
                onClick={() => onShowDocumentUploadModal(true)}
                className="mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {businessDocuments.map((document) => (
                <div key={document.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {document.document_name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(document.verification_status).color}`}>
                          {getStatusBadge(document.verification_status).label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <p><strong>Type:</strong> {getDocumentTypeLabel(document.document_type)}</p>
                        {document.file_size_bytes && (
                          <p><strong>Size:</strong> {(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                        {document.expiry_date && (
                          <p><strong>Expires:</strong> {new Date(document.expiry_date).toLocaleDateString()}</p>
                        )}
                        {document.rejection_reason && (
                          <p className="text-red-600"><strong>Rejection Reason:</strong> {document.rejection_reason}</p>
                        )}
                        <p><strong>Uploaded:</strong> {new Date(document.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDocument(document)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload Modal */}
      {showDocumentUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Business Documents</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowDocumentUploadModal(false)}
              >
                ×
              </Button>
            </div>
            
            <BusinessDocumentUploadForm
              businessId={businessId}
              existingDocuments={businessDocuments}
              onUploadComplete={onDocumentUpload}
              onCancel={() => onShowDocumentUploadModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}