import { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/lib/imageCompression';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
  compact?: boolean;
}

export function PhotoUpload({ photos, onPhotosChange, folder = 'general', max = 5, compact = false }: PhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    const newUrls: string[] = [];
    const toUpload = Array.from(files).slice(0, max - photos.length);
    setProgress({ done: 0, total: toUpload.length });

    for (const file of toUpload) {
      const compressed = await compressImage(file);
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage
        .from('dispatch-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' });

      if (!error) {
        const { data: urlData } = supabase.storage.from('dispatch-photos').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      setProgress(p => p ? { ...p, done: p.done + 1 } : null);
    }

    onPhotosChange([...photos, ...newUrls]);
    setUploading(false);
    setProgress(null);
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 p-1.5 rounded-full bg-foreground/70 text-background opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < max && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={compact ? '' : 'w-full border-dashed min-h-[44px]'}
          >
            {uploading && progress ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading {progress.done}/{progress.total}…</>
            ) : uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" />{compact ? 'Add Photo' : `Add Photos (${photos.length}/${max})`}</>
            )}
          </Button>
          {!compact && photos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">Photos are compressed automatically for fast upload</p>
          )}
        </>
      )}
    </div>
  );
}
