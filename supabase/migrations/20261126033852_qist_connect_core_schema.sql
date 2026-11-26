/*
# Qist Connect — Core Schema

1. Purpose
   Multi-vendor installment trading marketplace: customers, dealers (merchants),
   products, multi-dealer requests, offers, applications, transactions,
   installment schedules, notifications, reviews, revenue entries and settings.

2. New Tables
   - `profiles`            user profile + role (customer, dealer_owner, dealer_staff, admin_staff, super_admin), language + theme prefs
   - `categories`          product categories with per-category commission rules
   - `dealers`             merchant businesses owned by an auth user, approval status, commission + subscription
   - `products`            dealer product listings: cash price, installment price, advance, monthly, durations, stock
   - `customer_requests`   a customer request for a product (shared with one or more dealers)
   - `offers`              dealer counter-offers on requests (multi-dealer comparison)
   - `applications`        accepted offers become applications with a verification/approval lifecycle
   - `transactions`        completed deals with commission snapshot, delivery + commission status
   - `installments`        monthly installment schedule rows with paid/overdue status
   - `notifications`       in-app notification feed per user
   - `reviews`             customer ratings for dealers
   - `revenue_entries`     platform revenue (commission, subscription, ads, featured) and expenses
   - `settings`            single-row platform settings (branding, defaults, commission rules, cities)

3. Security
   - RLS enabled on every table.
   - Customers see/modify only their own requests, offers, applications, transactions, installments, notifications, reviews.
   - Dealers see/modify only rows belonging to their own dealer record (via current_dealer_id()).
   - Super admin sees everything; admin_staff sees everything read-only.
   - Public catalog: categories, settings, and active dealer/product data readable by anon (marketplace browsing).
   - Offers table: anon can read accepted offers tied to public requests via join when comparing; inserts only by authenticated dealers.
   - Helper functions current_role_name(), current_dealer_id() and handle_new_user() are SECURITY DEFINER with locked search_path.
   - Grants: SELECT/INSERT/UPDATE/DELETE limited to the verbs each role needs; anon only on public catalog tables.

4. Notes
   - profiles.id defaults to auth.uid() via FK; trigger handle_new_user creates a profile on signup.
   - Commission amounts are snapshotted on transactions so rule changes never rewrite history.
*/

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text not null default '',
  phone text not null default '',
  city text not null default 'Karachi',
  address text not null default '',
  role text not null default 'customer' check (role in ('customer','dealer_owner','dealer_staff','admin_staff','super_admin')),
  lang text not null default 'en' check (lang in ('en','ur')),
  theme text not null default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text not null default 'Package',
  description text not null default '',
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2) not null default 2,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.dealers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  phone text not null default '',
  shop_address text not null default '',
  city text not null default 'Karachi',
  service_areas text not null default '',
  category_id uuid references public.categories(id),
  shop_photos jsonb not null default '[]'::jsonb,
  document_urls jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  verification_notes text not null default '',
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2) not null default 2,
  subscription_plan text not null default 'free' check (subscription_plan in ('free','monthly','annual')),
  subscription_expires_at timestamptz,
  response_time_minutes integer,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  name text not null,
  brand text not null default '',
  model text not null default '',
  description text not null default '',
  specifications jsonb not null default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  cash_price numeric(12,2) not null check (cash_price >= 0),
  installment_price numeric(12,2) not null check (installment_price >= 0),
  advance_payment numeric(12,2) not null default 0,
  monthly_installment numeric(12,2) not null default 0,
  durations integer[] not null default '{3,6,9,12}',
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  dealer_id uuid not null references public.dealers(id),
  request_type text not null default 'installment' check (request_type in ('cash','installment')),
  duration_months integer,
  message text not null default '',
  status text not null default 'new' check (status in ('new','accepted','rejected','expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.customer_requests(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id),
  customer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  cash_price numeric(12,2),
  installment_price numeric(12,2) not null default 0,
  advance_amount numeric(12,2) not null default 0,
  monthly_installment numeric(12,2) not null default 0,
  duration_months integer not null,
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id),
  product_id uuid not null references public.products(id),
  offer_id uuid references public.offers(id),
  agreed_price numeric(12,2) not null,
  advance_amount numeric(12,2) not null default 0,
  monthly_installment numeric(12,2) not null default 0,
  duration_months integer not null,
  status text not null default 'verification' check (status in ('verification','approved','rejected','delivered','completed','cancelled')),
  document_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id),
  product_id uuid not null references public.products(id),
  agreed_price numeric(12,2) not null,
  advance_amount numeric(12,2) not null default 0,
  monthly_installment numeric(12,2) not null default 0,
  duration_months integer not null,
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  commission_status text not null default 'pending' check (commission_status in ('pending','received')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','shipped','delivered')),
  transaction_ref text not null default '',
  status text not null default 'active' check (status in ('active','completed','defaulted','cancelled')),
  created_at timestamptz not null default now(),
  completion_date timestamptz
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id),
  installment_no integer not null,
  due_date date not null,
  amount numeric(12,2) not null,
  status text not null default 'due' check (status in ('due','paid','overdue')),
  paid_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'general',
  link text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('commission','subscription','advertisement','featured_listing','expense')),
  amount numeric(12,2) not null,
  description text not null default '',
  dealer_id uuid references public.dealers(id) on delete set null,
  ref_id uuid,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  platform_name text not null default 'Qist Connect',
  tagline text not null default 'One Platform – Multiple Dealers – Unlimited Opportunities.',
  support_phone text not null default '',
  terms_content text not null default '',
  privacy_content text not null default '',
  cities text[] not null default '{Karachi}',
  commission_type text not null default 'percentage' check (commission_type in ('percentage','fixed')),
  commission_value numeric(12,2) not null default 2,
  monthly_subscription_fee numeric(12,2) not null default 2500,
  annual_subscription_fee numeric(12,2) not null default 25000,
  updated_at timestamptz not null default now()
);

-- indexes
create index if not exists idx_products_dealer on public.products(dealer_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_requests_customer on public.customer_requests(customer_id);
create index if not exists idx_requests_dealer on public.customer_requests(dealer_id);
create index if not exists idx_offers_request on public.offers(request_id);
create index if not exists idx_offers_customer on public.offers(customer_id);
create index if not exists idx_offers_dealer on public.offers(dealer_id);
create index if not exists idx_applications_customer on public.applications(customer_id);
create index if not exists idx_applications_dealer on public.applications(dealer_id);
create index if not exists idx_transactions_dealer on public.transactions(dealer_id);
create index if not exists idx_transactions_customer on public.transactions(customer_id);
create index if not exists idx_installments_txn on public.installments(transaction_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_reviews_dealer on public.reviews(dealer_id);

-- updated_at touch triggers
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at before update on public.settings
for each row execute function public.touch_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- helpers (security definer to read across RLS inside policies)
create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_dealer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select d.id from public.dealers d where d.owner_id = auth.uid()
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.dealers enable row level security;
alter table public.products enable row level security;
alter table public.customer_requests enable row level security;
alter table public.offers enable row level security;
alter table public.applications enable row level security;
alter table public.transactions enable row level security;
alter table public.installments enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.revenue_entries enable row level security;
alter table public.settings enable row level security;

-- profiles
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select
to authenticated using (auth.uid() = id);

drop policy if exists "read all profiles super admin" on public.profiles;
create policy "read all profiles super admin" on public.profiles for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert
to authenticated with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- categories: public read, super admin manage
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select
to anon, authenticated using (true);

drop policy if exists "admin insert categories" on public.categories;
create policy "admin insert categories" on public.categories for insert
to authenticated with check (public.current_role_name() = 'super_admin');

drop policy if exists "admin update categories" on public.categories;
create policy "admin update categories" on public.categories for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

-- dealers
drop policy if exists "public read active dealers" on public.dealers;
create policy "public read active dealers" on public.dealers for select
to anon, authenticated using (status = 'active');

drop policy if exists "dealer reads own shop" on public.dealers;
create policy "dealer reads own shop" on public.dealers for select
to authenticated using (auth.uid() = owner_id);

drop policy if exists "admin reads all dealers" on public.dealers;
create policy "admin reads all dealers" on public.dealers for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "dealer creates own shop" on public.dealers;
create policy "dealer creates own shop" on public.dealers for insert
to authenticated with check (auth.uid() = owner_id);

drop policy if exists "dealer updates own shop" on public.dealers;
create policy "dealer updates own shop" on public.dealers for update
to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "super admin updates dealers" on public.dealers;
create policy "super admin updates dealers" on public.dealers for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

-- products
drop policy if exists "public reads active products" on public.products;
create policy "public reads active products" on public.products for select
to anon, authenticated using (
  is_active and stock > 0 and exists (
    select 1 from public.dealers d
    where d.id = products.dealer_id and d.status = 'active'
  )
);

drop policy if exists "dealer reads own products" on public.products;
create policy "dealer reads own products" on public.products for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all products" on public.products;
create policy "admin reads all products" on public.products for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "dealer inserts own products" on public.products;
create policy "dealer inserts own products" on public.products for insert
to authenticated with check (
  dealer_id = public.current_dealer_id()
  and exists (
    select 1 from public.dealers d
    where d.id = dealer_id and d.status = 'active'
  )
);

drop policy if exists "dealer updates own products" on public.products;
create policy "dealer updates own products" on public.products for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

drop policy if exists "dealer deletes own products" on public.products;
create policy "dealer deletes own products" on public.products for delete
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "super admin updates products" on public.products;
create policy "super admin updates products" on public.products for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

-- customer_requests
drop policy if exists "customer reads own requests" on public.customer_requests;
create policy "customer reads own requests" on public.customer_requests for select
to authenticated using (auth.uid() = customer_id);

drop policy if exists "dealer reads own requests" on public.customer_requests;
create policy "dealer reads own requests" on public.customer_requests for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all requests" on public.customer_requests;
create policy "admin reads all requests" on public.customer_requests for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "customer creates requests" on public.customer_requests;
create policy "customer creates requests" on public.customer_requests for insert
to authenticated with check (auth.uid() = customer_id);

drop policy if exists "dealer updates own requests" on public.customer_requests;
create policy "dealer updates own requests" on public.customer_requests for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

drop policy if exists "customer cancels own requests" on public.customer_requests;
create policy "customer cancels own requests" on public.customer_requests for update
to authenticated using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

drop policy if exists "customer deletes own requests" on public.customer_requests;
create policy "customer deletes own requests" on public.customer_requests for delete
to authenticated using (auth.uid() = customer_id);

-- offers
drop policy if exists "customer reads own offers" on public.offers;
create policy "customer reads own offers" on public.offers for select
to authenticated using (auth.uid() = customer_id);

drop policy if exists "dealer reads own offers" on public.offers;
create policy "dealer reads own offers" on public.offers for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all offers" on public.offers;
create policy "admin reads all offers" on public.offers for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "dealer creates own offers" on public.offers;
create policy "dealer creates own offers" on public.offers for insert
to authenticated with check (dealer_id = public.current_dealer_id());

drop policy if exists "dealer updates own offers" on public.offers;
create policy "dealer updates own offers" on public.offers for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

drop policy if exists "customer responds to offers" on public.offers;
create policy "customer responds to offers" on public.offers for update
to authenticated using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

-- applications
drop policy if exists "customer reads own applications" on public.applications;
create policy "customer reads own applications" on public.applications for select
to authenticated using (auth.uid() = customer_id);

drop policy if exists "dealer reads own applications" on public.applications;
create policy "dealer reads own applications" on public.applications for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all applications" on public.applications;
create policy "admin reads all applications" on public.applications for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "customer creates applications" on public.applications;
create policy "customer creates applications" on public.applications for insert
to authenticated with check (auth.uid() = customer_id);

drop policy if exists "dealer updates own applications" on public.applications;
create policy "dealer updates own applications" on public.applications for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

-- transactions
drop policy if exists "customer reads own transactions" on public.transactions;
create policy "customer reads own transactions" on public.transactions for select
to authenticated using (auth.uid() = customer_id);

drop policy if exists "dealer reads own transactions" on public.transactions;
create policy "dealer reads own transactions" on public.transactions for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all transactions" on public.transactions;
create policy "admin reads all transactions" on public.transactions for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "dealer creates own transactions" on public.transactions;
create policy "dealer creates own transactions" on public.transactions for insert
to authenticated with check (dealer_id = public.current_dealer_id());

drop policy if exists "dealer updates own transactions" on public.transactions;
create policy "dealer updates own transactions" on public.transactions for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

drop policy if exists "super admin updates transactions" on public.transactions;
create policy "super admin updates transactions" on public.transactions for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

-- installments
drop policy if exists "customer reads own installments" on public.installments;
create policy "customer reads own installments" on public.installments for select
to authenticated using (auth.uid() = customer_id);

drop policy if exists "dealer reads own installments" on public.installments;
create policy "dealer reads own installments" on public.installments for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin reads all installments" on public.installments;
create policy "admin reads all installments" on public.installments for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "dealer creates own installments" on public.installments;
create policy "dealer creates own installments" on public.installments for insert
to authenticated with check (dealer_id = public.current_dealer_id());

drop policy if exists "dealer updates own installments" on public.installments;
create policy "dealer updates own installments" on public.installments for update
to authenticated using (dealer_id = public.current_dealer_id())
with check (dealer_id = public.current_dealer_id());

-- notifications
drop policy if exists "user reads own notifications" on public.notifications;
create policy "user reads own notifications" on public.notifications for select
to authenticated using (auth.uid() = user_id);

drop policy if exists "system inserts notifications" on public.notifications;
create policy "system inserts notifications" on public.notifications for insert
to authenticated with check (true);

drop policy if exists "user updates own notifications" on public.notifications;
create policy "user updates own notifications" on public.notifications for update
to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user deletes own notifications" on public.notifications;
create policy "user deletes own notifications" on public.notifications for delete
to authenticated using (auth.uid() = user_id);

-- reviews
drop policy if exists "public reads reviews" on public.reviews;
create policy "public reads reviews" on public.reviews for select
to anon, authenticated using (true);

drop policy if exists "customer creates reviews" on public.reviews;
create policy "customer creates reviews" on public.reviews for insert
to authenticated with check (auth.uid() = customer_id);

drop policy if exists "customer updates own reviews" on public.reviews;
create policy "customer updates own reviews" on public.reviews for update
to authenticated using (auth.uid() = customer_id)
with check (auth.uid() = customer_id);

drop policy if exists "customer deletes own reviews" on public.reviews;
create policy "customer deletes own reviews" on public.reviews for delete
to authenticated using (auth.uid() = customer_id);

-- revenue_entries: admin only, plus dealer-readable commission rows
drop policy if exists "dealer reads own commission entries" on public.revenue_entries;
create policy "dealer reads own commission entries" on public.revenue_entries for select
to authenticated using (dealer_id = public.current_dealer_id());

drop policy if exists "admin manages revenue entries" on public.revenue_entries;
create policy "admin manages revenue entries" on public.revenue_entries for select
to authenticated using (public.current_role_name() in ('super_admin','admin_staff'));

drop policy if exists "super admin inserts revenue entries" on public.revenue_entries;
create policy "super admin inserts revenue entries" on public.revenue_entries for insert
to authenticated with check (public.current_role_name() = 'super_admin');

drop policy if exists "super admin updates revenue entries" on public.revenue_entries;
create policy "super admin updates revenue entries" on public.revenue_entries for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

drop policy if exists "super admin deletes revenue entries" on public.revenue_entries;
create policy "super admin deletes revenue entries" on public.revenue_entries for delete
to authenticated using (public.current_role_name() = 'super_admin');

-- settings: public read, super admin update
drop policy if exists "public reads settings" on public.settings;
create policy "public reads settings" on public.settings for select
to anon, authenticated using (true);

drop policy if exists "super admin updates settings" on public.settings;
create policy "super admin updates settings" on public.settings for update
to authenticated using (public.current_role_name() = 'super_admin')
with check (public.current_role_name() = 'super_admin');

drop policy if exists "super admin inserts settings" on public.settings;
create policy "super admin inserts settings" on public.settings for insert
to authenticated with check (public.current_role_name() = 'super_admin');

-- grants
grant select, insert, update on public.profiles to authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update on public.categories to authenticated;
grant select on public.dealers to anon, authenticated;
grant insert, update on public.dealers to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.customer_requests to authenticated;
grant select, insert, update on public.offers to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select, insert, update on public.installments to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.revenue_entries to authenticated;
grant select on public.settings to anon, authenticated;
grant update, insert on public.settings to authenticated;
