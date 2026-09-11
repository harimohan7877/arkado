"use client";

import { useSettings } from "@/lib/store-hooks";
import { DownloadIcon, ShieldIcon, FileTextIcon, ClockIcon, MessageSquareIcon } from "@/components/icons";

export default function TrustStrip() {
  const { settings } = useSettings();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "download":
        return <DownloadIcon size={20} />;
      case "shield":
        return <ShieldIcon size={20} />;
      case "file":
        return <FileTextIcon size={20} />;
      case "clock":
        return <ClockIcon size={20} />;
      case "support":
      default:
        return <MessageSquareIcon size={20} />;
    }
  };

  const defaultItems = [
    { title: "Instant Download", desc: "Get your files right away", icon: "download" },
    { title: "Secure Payment", desc: "Direct UPI & UTR Verification", icon: "shield" },
    { title: "High Quality Material", desc: "Curated & pattern-decoded", icon: "file" },
    { title: "Easy Access", desc: "Anytime, anywhere on Google Drive", icon: "clock" },
    { title: "Customer Support", desc: "Quick WhatsApp response", icon: "support" },
  ];

  const items = settings?.homepage?.trust_features && settings.homepage.trust_features.length > 0
    ? settings.homepage.trust_features
    : defaultItems;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div key={item.title} className="trust-item">
          <div className="trust-icon">{getIcon(item.icon)}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate">
              {item.title}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}