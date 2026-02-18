'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Modal } from './Modal';

interface GalleryImage {
  url: string;
  name: string;
  category: string;
}

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export function ImagePicker({ label, value, onChange }: ImagePickerProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'uploads' | 'stock'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openGallery = async () => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        setGallery(data.images || []);
      }
    } catch {
      // ignore
    } finally {
      setGalleryLoading(false);
    }
  };

  const filteredGallery = filter === 'all'
    ? gallery
    : gallery.filter((img) => img.category === filter);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      <div className="flex items-center gap-3">
        {/* Thumbnail preview */}
        <div className="w-14 h-14 rounded-lg bg-gray-800 border border-gray-700/60 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <Image src={value} alt={label} width={56} height={56} className="object-contain w-full h-full" />
          ) : (
            <span className="text-gray-600 text-xs">None</span>
          )}
        </div>

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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={handleUpload}
        className="hidden"
      />

      <Modal open={galleryOpen} onClose={() => setGalleryOpen(false)} title="Image Gallery">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'uploads', 'stock'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'uploads' ? 'Uploads' : 'Stock'}
            </button>
          ))}
        </div>

        {galleryLoading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : filteredGallery.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No images found</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
            {filteredGallery.map((img) => (
              <button
                key={img.url}
                onClick={() => {
                  onChange(img.url);
                  setGalleryOpen(false);
                }}
                className={`p-1 rounded-lg border transition-all hover:border-primary-500 ${
                  value === img.url
                    ? 'border-primary-500 bg-primary-900/30'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.name}
                  width={80}
                  height={80}
                  className="w-full aspect-square object-contain rounded"
                />
                <span className="text-[9px] text-gray-500 truncate block mt-0.5">
                  {img.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
