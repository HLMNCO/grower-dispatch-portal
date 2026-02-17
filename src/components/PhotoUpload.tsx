import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PhotoUploadProps {
  /** Existing photo URLs */
  photos: string[];
  /** Called with updated list of URLs */
  onPhotosChange: (urls: string[]) => void;
  /** Subfolder within the user's directory */
  folder?: string;
  /** Max number of photos allowed */
  max?: number;
  /** Compact mode for inline forms */
  compact?: boolean;
}

export function PhotoUpload({ photos, onPhotosChange, folder = 'general', max = 5, compact = false }: PhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (photos.length + newUrls.length >= max) break;
      
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('dispatch-photos')
        .upload(path, file, { contentType: file.type });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('dispatch-photos')
          .getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }

    onPhotosChange([...photos, ...newUrls]);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 p-1 rounded-full bg-foreground/70 text-background opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {photos.length < max && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={compact ? '' : 'w-full border-dashed'}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" /> {compact ? 'Add Photo' : `Add Photos (${photos.length}/${max})`}</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
