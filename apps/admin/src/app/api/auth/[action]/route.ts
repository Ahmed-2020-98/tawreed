import { createBffRoutes } from '@tawreed/next-kit/server';
import { bff } from '@/lib/config';

export const { auth: POST } = createBffRoutes(bff);
