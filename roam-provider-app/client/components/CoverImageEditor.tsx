import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  ChevronUp, 
  ChevronDown, 
  Upload, 
  Trash2, 
  Loader2,
  CheckCircle 
} from 'lucide-react';

interface CoverImageEditorProps {
  imageUrl?: string;
  imagePosition?: number; // 0-100 percentage, 50 is center
  onImageChange?: (url: string) => void;
  onPositionChange?: (position: number) => void;
  onFileSelect?: (file: File) => void;
  onRemove?: () => void;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
  preview?: string | null;
  label?: string;
  helpText?: string;
  height?: string;
  disabled?: boolean;
  className?: string;
}

export default function CoverImageEditor({
  imageUrl,
  imagePosition = 50, // Default to center
  onImageChange,
  onPositionChange,
  onFileSelect,
  onRemove,
  uploading = false,
  uploaded = false,
  error,
  preview,
  label = "Cover Image",
  helpText = "Recommended size: 1200x400px • Max 3MB • JPG, PNG, WebP",
  // Match customer app BusinessProfile cover frame sizing
  height = "h-44 sm:h-56 lg:h-64",
  disabled = false,
  className = "",
}: CoverImageEditorProps) {
  const [position, setPosition] = useState(imagePosition);
  const inputId = `cover-image-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    setPosition(imagePosition);
  }, [imagePosition]);

  const displayImage = preview || imageUrl;

  const handlePositionChange = (direction: 'up' | 'down') => {
    const step = 10; // Move by 10% each click
    let newPosition: number;
    
    if (direction === 'up') {
      // Moving image up means showing more of the bottom (increase object-position)
      newPosition = Math.min(100, position + step);
    } else {
      // Moving image down means showing more of the top (decrease object-position)
      newPosition = Math.max(0, position - step);
    }
    
    setPosition(newPosition);
    onPositionChange?.(newPosition);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div>
          <Label className="text-base font-semibold">{label}</Label>
          {helpText && (
            <p className="text-sm text-muted-foreground">{helpText}</p>
          )}
        </div>
      )}

      <div className="relative">
        {/* Image Container */}
        <div 
          className={`relative ${height} rounded-lg overflow-hidden ${
            displayImage 
              ? 'bg-gray-100' 
              : 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-2 border-dashed border-gray-300'
          }`}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt="Cover"
              className="w-full h-full object-cover transition-all duration-200"
              style={{ objectPosition: `center ${position}%` }}
            />
          ) : (
            <div 
              className="flex items-center justify-center h-full cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => !disabled && document.getElementById(inputId)?.click()}
            >
              <div className="text-center text-gray-500">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Click to add cover image</p>
                <p className="text-xs text-gray-400 mt-1">{helpText}</p>
              </div>
            </div>
          )}

          {/* Position Controls - Only show when image exists */}
          {displayImage && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                onClick={() => handlePositionChange('up')}
                disabled={disabled || position >= 100}
                title="Move image up"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-md"
                onClick={() => handlePositionChange('down')}
                disabled={disabled || position <= 0}
                title="Move image down"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Action Buttons - Overlay on image */}
          {displayImage && (
            <div className="absolute top-2 left-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white/90 hover:bg-white shadow-md"
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={disabled || uploading}
              >
                <Camera className="w-4 h-4 mr-1" />
                Change
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white shadow-md text-red-600 hover:text-red-700"
                  onClick={onRemove}
                  disabled={disabled || uploading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* Uploading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Uploading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* Status Messages */}
      {uploaded && !uploading && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Image uploaded successfully</span>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Position Indicator */}
      {displayImage && (
        <p className="text-xs text-muted-foreground">
          Use the arrows on the right to adjust the image position. Current: {position}%
        </p>
      )}
    </div>
  );
}
