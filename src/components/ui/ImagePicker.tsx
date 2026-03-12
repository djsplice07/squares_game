/**
 * ImagePicker Component
 *
 * Provides a complete image selection UI with:
 * - Thumbnail preview of the currently selected image
 * - Text input for manual URL entry
 * - Direct upload button
 * - Gallery modal with unified view of all images (uploads + stock)
 * - In-gallery upload and per-image delete with confirmation
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Modal } from './Modal';

interface GalleryImage {
  url: string;
  name: string;
}

interface ImagePickerProps {
  /** Field label displayed above the picker */
  label: string;
  /** Currently selected image URL */
  value: string;
  /** Callback when the selected image changes */
  onChange: (url: string) => void;
}

export function ImagePicker({ label, value, onChange }: ImagePickerProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file upload from either the inline button or the gallery modal.
   * Sends the file to POST /api/upload and updates the selected value on success.
   *
   * @param e - File input change event
   * @param fromGallery - If true, refreshes the gallery list after upload
   */
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fromGallery = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      onChange(data.url);

      // If uploaded from inside the gallery modal, refresh the list
      // so the new image appears immediately
      if (fromGallery) {
        await fetchGallery();
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  /**
   * Fetches the full image list from GET /api/upload and updates local state.
   */
  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        setGallery(data.images || []);
      }
    } catch {
      // Silently fail — the gallery will show as empty
    }
  };

  /**
   * Opens the gallery modal and loads the image list.
   */
  const openGallery = async () => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    await fetchGallery();
    setGalleryLoading(false);
  };

  /**
   * Deletes an image via DELETE /api/upload?url=... after user confirmation.
   * Removes the image from local gallery state on success. If the deleted
   * image was the currently selected value, clears the selection.
   *
   * @param imageUrl - The URL path of the image to delete (e.g., /uploads/foo.png)
   */
  const handleDelete = async (imageUrl: string) => {
    if (!window.confirm(`Delete this image?\n${imageUrl}`)) {
      return;
    }

    try {
      const res = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Delete failed');
        return;
      }

      // Remove from local state without re-fetching
      setGallery((prev) => prev.filter((img) => img.url !== imageUrl));

      // Clear selection if the deleted image was active
      if (value === imageUrl) {
        onChange('');
      }
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      <div className="flex items-center gap-3">
        {/* Thumbnail preview */}
        <div className="w-14 h-14 rounded-lg bg-gray-800 border border-gray-700/60 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <Image
              src={value}
              alt={label}
              width={56}
              height={56}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-gray-600 text-xs">None</span>
          )}
        </div>

        {/* URL text input */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field text-sm"
            placeholder="/images/example.png"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-xs py-1 px-3"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={openGallery}
          className="btn-secondary text-xs py-1 px-3"
        >
          Browse Gallery
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-gray-500 hover:text-gray-300 py-1 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Hidden file input for inline upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={(e) => handleUpload(e)}
        className="hidden"
      />

      {/* Gallery Modal */}
      <Modal open={galleryOpen} onClose={() => setGalleryOpen(false)} title="Image Gallery">
        {/* Upload button inside modal */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => galleryFileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs py-1 px-3"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
          <input
            ref={galleryFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            onChange={(e) => handleUpload(e, true)}
            className="hidden"
          />
        </div>

        {/* Image grid */}
        {galleryLoading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : gallery.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No images found</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
            {gallery.map((img) => (
              <div
                key={img.url}
                className="relative group"
              >
                {/* Clickable image tile */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(img.url);
                    setGalleryOpen(false);
                  }}
                  className={`w-full p-1 rounded-lg border transition-all hover:border-primary-500 ${
                    value === img.url
                      ? 'border-primary-500 bg-primary-900/30'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  {/* Use regular <img> to avoid Next.js optimization issues with dynamic uploads */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full aspect-square object-contain rounded"
                  />
                  <span className="text-[9px] text-gray-500 truncate block mt-0.5">
                    {img.name}
                  </span>
                </button>

                {/* Delete button — appears on hover in top-right corner */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.url);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs
                             flex items-center justify-center opacity-0 group-hover:opacity-100
                             transition-opacity hover:bg-red-500"
                  title="Delete image"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
