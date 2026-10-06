import { createBffRoutes } from '@tawreed/next-kit/server';
import { bff } from '@/lib/config';

const { proxy } = createBffRoutes(bff);

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
