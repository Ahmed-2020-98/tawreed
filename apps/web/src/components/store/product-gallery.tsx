'use client';

import type { ImageRef } from '@tawreed/contracts';
import { cn } from '@tawreed/ui';
import { useState } from 'react';

export function ProductGallery({ images, name }: { images: ImageRef[]; name: string }) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div className="space-y-3">
      <div className="group relative aspect-square overflow-hidden rounded-3xl border border-gray-200 bg-white">
        {current && <img src={current.url.replace('_md.', '.')} alt={current.alt ?? name} className="size-full object-cover transition duration-500 group-hover:scale-110" />}
      </div>
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, idx) => (
            <button key={img.url} type="button" onClick={() => setI(idx)} aria-label={`${idx + 1}`} className={cn('size-20 overflow-hidden rounded-2xl border-2 transition', idx === i ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100')}>
              <img src={img.thumbUrl ?? img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
