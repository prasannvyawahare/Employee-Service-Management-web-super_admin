export type Tone = "good" | "warn" | "bad" | "neutral" | "accent";

export const COMPANY_STATUS = {
  pending: { label: "Pending", tone: "warn" },
  approved: { label: "Approved", tone: "good" },
  blocked: { label: "Blocked", tone: "bad" },
  suspended: { label: "Suspended", tone: "bad" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const SUBSCRIPTION_STATUS = {
  trial: { label: "Trial", tone: "accent" },
  active: { label: "Active", tone: "good" },
  payment_pending: { label: "Payment pending", tone: "warn" },
  expired: { label: "Expired", tone: "bad" },
  suspended: { label: "Suspended", tone: "bad" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export type CompanyStatus = keyof typeof COMPANY_STATUS;
export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;

export const SUBSCRIPTION_PLAN_OPTIONS = ["basic", "professional", "enterprise"] as const;
