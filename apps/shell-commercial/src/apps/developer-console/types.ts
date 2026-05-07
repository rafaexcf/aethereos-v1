/**
 * Super Sprint F — Developer Console types compartilhados.
 */

export interface DeveloperAccount {
  id: string;
  user_id: string;
  display_name: string;
  company_name: string | null;
  website: string | null;
  email: string;
  bio: string;
  avatar_url: string | null;
  api_key: string;
  status: "active" | "suspended" | "banned";
  accepted_terms_at: string | null;
  bank_account_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type AppSubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "published"
  | "removed";

export type EntryMode = "iframe" | "weblink";

export type PricingModel = "free" | "freemium" | "paid" | "subscription";

export interface AppSubmission {
  id: string;
  developer_id: string;
  app_slug: string;
  version: string;
  name: string;
  description: string;
  long_description: string;
  icon: string;
  color: string;
  category: string;
  entry_mode: EntryMode;
  entry_url: string;
  external_url: string | null;
  manifest_json: Record<string, unknown>;
  screenshots: string[];
  tags: string[];
  pricing_model: PricingModel;
  price_cents: number;
  currency: string;
  license: string;
  status: AppSubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  rejection_reason: string | null;
  changelog: string;
  created_at: string;
  updated_at: string;
}

export interface AppInstallation {
  id: string;
  app_slug: string;
  company_id: string;
  installed_by: string;
  installed_at: string;
  uninstalled_at: string | null;
}

export interface AppReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  action: "approve" | "reject" | "request_changes";
  notes: string;
  checklist: Record<string, boolean>;
  created_at: string;
}

export interface DeveloperEarning {
  id: string;
  developer_id: string;
  app_slug: string;
  company_id: string;
  amount_cents: number;
  developer_share_cents: number;
  platform_share_cents: number;
  status: "pending" | "paid" | "cancelled";
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}

export const APP_CATEGORIES = [
  "productivity",
  "dev-tools",
  "design",
  "ai",
  "utilities",
  "games",
  "finance",
  "education",
  "communication",
  "media",
  "maps",
  "data",
] as const;

export type AppCategory = (typeof APP_CATEGORIES)[number];
