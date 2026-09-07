export interface Category {
  id: string;
  name: string;
  name_hi?: string;
  icon: string; // emoji or icon identifier
  logo_url?: string; // custom logo uploaded by admin
  color: string; // tailwind color class e.g. "bg-blue-600"
  priority: number;
  is_active: boolean;
  exam_ids: string[];
  exam_count?: number;
  state_or_group?: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  category_id: string;
  name: string;
  short_name: string;
  board: string;
  logo_url?: string; // custom exam logo uploaded by admin
  description: string;
  status: "upcoming" | "open" | "closed" | "expected";
  form_start?: string;
  last_date?: string;
  expected_notification?: string;
  total_posts?: number;
  priority: number;
  is_active: boolean;
  course_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  exam_id: string;
  title: string;
  slug: string;
  badge: string; // "Complete Kit", "Bestseller", etc.
  short_description: string;
  original_price: number;
  price: number;
  discount_percent: number;
  highlights: string[]; // max 3-4 items
  subjects: string[];
  syllabus_preview: SyllabusSection[];
  pages_count: string;
  format: string;
  language: string;
  cover_image: string;
  show_in_slider: boolean;
  slider_tagline: string;
  sample_pdf_url: string;
  drive_url: string;
  rating: number;
  rating_count: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SyllabusSection {
  subject: string;
  chapters: string[];
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_mode: "whatsapp" | "gmail";
  utr: string;
  amount: number;
  course_id: string;
  course_title: string;
  exam_name: string;
  payment_status: "pending" | "paid" | "failed";
  delivery_status: "pending" | "delivered";
  order_id: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  upi_id: string;
  merchant_name: string;
  whatsapp_support_number: string;
  gmail_support_email?: string;
  site_name: string;
  site_tagline: string;
  currency: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_enabled: boolean;
  brand?: {
    logo_text?: string;
    logo_badge_text?: string;
    logo_accent_color?: string;
    tagline?: string;
    footer_tagline?: string;
  };
  homepage?: {
    hero_badge?: string;
    hero_headline?: string;
    featured_section_title?: string;
    hot_deals_title?: string;
    new_arrivals_title?: string;
    categories_section_title?: string;
    newsletter_title?: string;
    newsletter_subtitle?: string;
    newsletter_placeholder?: string;
    newsletter_button_text?: string;
  };
  social?: {
    whatsapp_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    gmail_url?: string;
    share_enabled?: boolean;
  };
  payment_methods?: string[];
  updated_at: string;
}