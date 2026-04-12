export type UserRole = 'admin' | 'dealer' | 'worker';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  credit_limit?: number;
  debt?: number;
};

export type OrderStatus =
  | 'kutilmoqda'
  | 'tasdiqlangan'
  | 'tayyorlanmoqda'
  | 'tayyor'
  | 'yetkazilmoqda'
  | 'yetkazildi'
  | 'rad_etilgan';

export type OrderItem = {
  material_name: string;
  width: number;
  height: number;
  quantity?: number;
};

export type Order = {
  id: string;
  order_code: string;
  status: OrderStatus;
  created_at: string;
  total_sqm: number;
  total_price: number;
  items?: OrderItem[];
  dealer_name?: string;
  rejection_reason?: string;
};
