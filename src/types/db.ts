import type { CompanyStatus, SubscriptionStatus } from "@/lib/status";

export type PlatformStats = {
  total_companies: number;
  pending_companies: number;
  approved_companies: number;
  blocked_companies: number;
  suspended_companies: number;
  total_employees: number;
};

export type SubscriptionPlan = "basic" | "professional" | "enterprise";

export type Subscription = {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  employee_limit: number;
  start_date: string | null;
  expiry_date: string | null;
  trial_end_date: string | null;
  payment_status: string | null;
  amount: number | null;
};

export type Company = {
  id: string;
  name: string;
  owner_name: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  company_code: string | null;
  employee_limit: number | null;
  status: CompanyStatus;
  created_at: string;
  subscriptions: Subscription | Subscription[] | null;
};

export type Feature = {
  key: string;
  label: string;
  description: string | null;
  category: "core" | "optional";
  sort_order: number;
};

export type CompanyFeature = {
  company_id: string;
  feature_key: string;
  enabled: boolean;
};

export type CompanyDetail = Company & {
  company_features: CompanyFeature[];
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: "monthly" | "yearly";
  is_active: boolean;
  created_at: string;
  plan_features: { feature_key: string }[];
};

export type UserRole = "super_admin" | "company_admin" | "manager" | "employee";

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  role: UserRole;
  is_active: boolean;
  companies: { name: string } | null;
};
