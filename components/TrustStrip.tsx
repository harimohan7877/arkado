"use client";

import { DownloadIcon, ShieldIcon, FileTextIcon, ClockIcon, MessageSquareIcon } from "@/components/icons";

export default function TrustStrip() {
  const items = [
    {
      icon: <DownloadIcon size={20} />,
      title: "Instant Download",
      desc: "Get your files right away",
    },
    {
      icon: <ShieldIcon size={20} />,
      title: "Secure Payment",
      desc: "Encrypted checkout",
    },
    {
      icon: <FileTextIcon size={20} />,
      title: "High Quality Material",
      desc: "Curated and verified",
    },
    {
      icon: <ClockIcon size={20} />,
      title: "Easy Access",
      desc: "Anytime, anywhere",
    },
    {
      icon: <MessageSquareIcon size={20} />,
      title: "Customer Support",
      desc: "We're here to help",
    },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div key={item.title} className="trust-item">
          <div className="trust-icon">{item.icon}</div>
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