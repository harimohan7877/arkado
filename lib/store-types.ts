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
  slug?: string;
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
  demo_html_mock_enabled?: boolean;
  demo_html_mock_url?: string;
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
  delivery_mode: "whatsapp" | "gmail" | "both";
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

export interface SectionConfig {
  enabled?: boolean;
  show_on_mobile?: boolean;
  show_on_desktop?: boolean;
  title?: string;
  subtitle?: string;
}

export interface HomepageSections {
  hero?: SectionConfig;
  trust_strip?: SectionConfig;
  featured_bundles?: SectionConfig;
  promo_banner?: SectionConfig;
  categories?: SectionConfig;
  all_products?: SectionConfig;
  hot_deals?: SectionConfig;
  new_arrivals?: SectionConfig;
  faq?: SectionConfig;
}

export interface BundleCardStyle {
  // Mobile settings
  mobile_cover_height?: number; // e.g. 110 to 260px, default 150px
  mobile_aspect_ratio?: "3/4" | "4/5" | "1/1" | "16/9" | "custom"; // default "custom" or "3/4"
  mobile_grid_cols?: 2 | 3; // default 2
  mobile_card_padding?: number; // e.g. 4 to 14px, default 8px
  mobile_title_size?: "xs" | "sm" | "base"; // default "xs"
  mobile_title_lines?: 1 | 2; // default 2

  // Desktop settings
  desktop_cover_height?: number; // e.g. 180 to 320px, default 240px
  desktop_aspect_ratio?: "3/4" | "4/5" | "1/1" | "16/9" | "custom"; // default "custom" or "4/5"
  desktop_grid_cols?: 3 | 4 | 5 | 6; // default 5
  desktop_card_padding?: number; // e.g. 8 to 18px, default 14px

  // Shared visual settings
  cover_fit?: "cover" | "contain"; // default "cover"
  card_gap?: number; // e.g. 6 to 20px, default 12px
  card_border_radius?: "rounded-none" | "rounded-lg" | "rounded-xl" | "rounded-2xl"; // default "rounded-xl"
  card_shadow?: "none" | "sm" | "md" | "lg"; // default "sm"

  // Element visibility toggles
  show_discount_badge?: boolean; // default true
  show_exam_tag?: boolean; // default true
  show_rating?: boolean; // default true
  show_pages_format?: boolean; // default true
  show_instant_access?: boolean; // default true

  // Action button settings
  button_style?: "full" | "compact" | "minimal"; // default "full"
  button_text?: string; // default "Grab This Deal"
}

export interface Settings {
  upi_id: string;
  merchant_name: string;
  whatsapp_support_number: string;
  gmail_support_email?: string;
  custom_qr_url?: string;
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
    sections?: HomepageSections;
    section_order?: string[];
    hero_badge?: string;
    hero_headline?: string;
    featured_section_title?: string;
    hot_deals_title?: string;
    new_arrivals_title?: string;
    categories_section_title?: string;
    products_section_title?: string;
    faq_section_title?: string;
    category_card_style?: {
      logo_size?: number; // e.g. 40 to 300, default 110
      logo_shape?: "circle" | "square" | "rounded-xl" | "rounded-2xl"; // default "circle"
      container_padding?: number; // e.g. 0 to 20, default 0
      show_inner_border?: boolean; // default false (no inner border/ring around logo)
      show_card_border?: boolean; // default false (whether outer card has border or borderless)
      card_gap?: number; // e.g. 4 to 32px spacing between category cards, default 10
      card_padding?: number; // e.g. 2 to 24px inner padding of each card, default 8
      text_gap?: number; // e.g. 0 to 32px spacing between logo and text, default 6
      card_shadow?: "none" | "sm" | "md" | "lg"; // default "sm"
      card_bg_style?: "white" | "stone" | "glass"; // default "white"
      container_bg?: string; // e.g. "bg-stone-50" or custom
      text_position?: "below" | "above"; // default "below"
      text_size?: "xs" | "sm" | "base"; // default "xs"
      show_exam_count?: boolean; // default true
      card_border_radius?: "rounded-xl" | "rounded-2xl" | "rounded-3xl" | "rounded-none"; // default "rounded-2xl"
    };
    bundle_card_style?: BundleCardStyle;
    sections_card_styles?: Record<string, BundleCardStyle>;
    newsletter_title?: string;
    newsletter_subtitle?: string;
    newsletter_placeholder?: string;
    newsletter_button_text?: string;
    promo_banner?: {
      enabled?: boolean;
      title?: string;
      subtitle?: string;
      bullets?: string[];
    };
    trust_features?: {
      title: string;
      desc: string;
      icon: string;
    }[];
    faqs?: {
      question: string;
      answer: string;
    }[];
  };
  contact?: {
    phone?: string;
    whatsapp_number?: string;
    email?: string;
    address?: string;
    support_hours?: string;
  };
  order_messages?: {
    whatsapp_order_template?: string;
    whatsapp_after_payment_template?: string;
    gmail_subject?: string;
    gmail_body?: string;
  };
  trending_searches?: string[];
  policies?: {
    refund_policy?: string;
    privacy_policy?: string;
    terms_of_service?: string;
  };
  about?: {
    title?: string;
    subtitle?: string;
    story?: string;
    founder_name?: string;
    founder_location?: string;
    experience_years?: string;
    highlights?: string[];
  };
  course_page?: {
    instant_delivery_badge?: string;
    guarantees?: string[];
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