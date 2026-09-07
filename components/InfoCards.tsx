"use client";

import Link from "next/link";

export default function InfoCards() {
  const cards = [
    {
      icon: "📖",
      title: "About Us",
      desc: "Sarkari Saathi is a premium study resource platform for Rajasthan government exam aspirants.",
      link: "#",
    },
    {
      icon: "📞",
      title: "Contact Us",
      desc: "Get in touch via WhatsApp or email for orders, support, and inquiries.",
      link: "https://wa.me/917852004401",
    },
    {
      icon: "❓",
      title: "FAQ",
      desc: "Find answers to common questions about ordering, delivery, and study materials.",
      link: "#",
    },
    {
      icon: "✍️",
      title: "Blog",
      desc: "Read latest exam updates, tips, and study strategies for Rajasthan state exams.",
      link: "#",
    },
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.link}
            className="bg-white border border-gray-100 rounded-sm p-5 hover:shadow-halo transition-shadow group"
          >
            <span className="text-xl block mb-2">{card.icon}</span>
            <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider mb-1.5 group-hover:opacity-70 transition-opacity">
              {card.title}
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {card.desc}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
