export type Role = 'customer' | 'dealer_owner' | 'dealer_staff' | 'admin_staff' | 'super_admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  role: Role;
  lang: 'en' | 'ur';
  theme: 'light' | 'dark';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  sort_order: number;
  is_active: boolean;
}

export interface Dealer {
  id: string;
  owner_id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  shop_address: string;
  city: string;
  service_areas: string;
  category_id: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  subscription_plan: 'free' | 'monthly' | 'annual';
  subscription_expires_at: string | null;
  response_time_minutes: number | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  category?: Category;
}

export interface Product {
  id: string;
  dealer_id: string;
  category_id: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  specifications: { k: string; v: string }[];
  image_urls: string[];
  cash_price: number;
  installment_price: number;
  advance_payment: number;
  monthly_installment: number;
  durations: number[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  dealer?: Dealer;
  category?: Category;
}

export interface CustomerRequest {
  id: string;
  customer_id: string;
  product_id: string;
  dealer_id: string;
  request_type: 'cash' | 'installment';
  duration_months: number | null;
  message: string;
  status: 'new' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  product?: Product;
  dealer?: Dealer;
}

export interface Offer {
  id: string;
  request_id: string;
  dealer_id: string;
  customer_id: string;
  product_id: string;
  cash_price: number | null;
  installment_price: number;
  advance_amount: number;
  monthly_installment: number;
  duration_months: number;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  dealer?: Dealer;
  product?: Product;
}

export interface Application {
  id: string;
  customer_id: string;
  dealer_id: string;
  product_id: string;
  offer_id: string | null;
  agreed_price: number;
  advance_amount: number;
  monthly_installment: number;
  duration_months: number;
  status: 'verification' | 'approved' | 'rejected' | 'delivered' | 'completed' | 'cancelled';
  document_urls: string[];
  created_at: string;
  completed_at: string | null;
  product?: Product;
  dealer?: Dealer;
}

export interface Transaction {
  id: string;
  application_id: string;
  customer_id: string;
  dealer_id: string;
  product_id: string;
  agreed_price: number;
  advance_amount: number;
  monthly_installment: number;
  duration_months: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  commission_amount: number;
  commission_status: 'pending' | 'received';
  delivery_status: 'pending' | 'shipped' | 'delivered';
  transaction_ref: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  created_at: string;
  completion_date: string | null;
  product?: Product;
  dealer?: Dealer;
  application?: Application;
}

export interface Installment {
  id: string;
  transaction_id: string;
  customer_id: string;
  dealer_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: 'due' | 'paid' | 'overdue';
  paid_date: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  customer_id: string;
  dealer_id: string;
  transaction_id: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface RevenueEntry {
  id: string;
  type: 'commission' | 'subscription' | 'advertisement' | 'featured_listing' | 'expense';
  amount: number;
  description: string;
  dealer_id: string | null;
  ref_id: string | null;
  entry_date: string;
  created_at: string;
  dealer?: Dealer;
}

export interface Settings {
  id: number;
  platform_name: string;
  tagline: string;
  support_phone: string;
  terms_content: string;
  privacy_content: string;
  cities: string[];
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  monthly_subscription_fee: number;
  annual_subscription_fee: number;
}
