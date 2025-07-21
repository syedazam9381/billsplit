import { useState } from 'react';
import { apiClient, type UploadedFile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }
      
      const response = await apiClient.uploadReceipt(file);
      
      if (response.success && response.data) {
        setUploadedFile(response.data);
        toast({
          title: "Upload successful",
          description: "Your receipt has been uploaded and processed.",
        });
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const response = await apiClient.deleteFile(fileId);
      
      if (response.success) {
        setUploadedFile(null);
        toast({
          title: "File deleted",
          description: "The uploaded file has been deleted.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setError(null);
  };

  return {
    uploading,
    uploadedFile,
    error,
    uploadFile,
    deleteFile,
    clearUpload,
  };
}