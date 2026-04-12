import { UserRole } from '../types/domain';

export const canEditOrder = (role?: UserRole, orderOwnerId?: string, userId?: string) => {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'dealer') return !!orderOwnerId && !!userId && orderOwnerId === userId;
  return false;
};

export const canAssignWorker = (role?: UserRole) => role === 'admin';
