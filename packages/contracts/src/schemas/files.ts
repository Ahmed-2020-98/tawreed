import { z } from 'zod';
import { FilePurpose } from '../enums.js';

export const uploadFileSchema = z.object({ purpose: z.enum(FilePurpose) });
export type UploadFileInput = z.input<typeof uploadFileSchema>;

export interface FileDto {
  id: string;
  url: string;
  thumbUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  originalName: string | null;
  width: number | null;
  height: number | null;
  purpose: FilePurpose;
}

/** Max upload size per purpose group (MB). */
export const FILE_LIMITS_MB = { image: 8, document: 10 } as const;
