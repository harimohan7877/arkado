"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PhoneIcon, MailIcon, MapPinIcon, WhatsappIcon } from "@/components/icons";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Contact Us</h1>
        <p className="text-sm text-slate-500 mt-2">
          Orders, support या किसी भी inquiry के लिए हमसे संपर्क करें।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <a
            href="tel:+917852004401"
            className="card-base p-5 hover:border-amber-700 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <PhoneIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">Phone</h3>
            <p className="text-sm text-slate-600 mt-1">+91 7852004401</p>
          </a>

          <a
            href="mailto:support@arkado.in"
            className="card-base p-5 hover:border-amber-700 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <MailIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">Email</h3>
            <p className="text-sm text-slate-600 mt-1">support@arkado.in</p>
          </a>

          <a
            href="https://wa.me/917852004401"
            target="_blank"
            rel="noopener noreferrer"
            className="card-base p-5 hover:border-emerald-600 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <WhatsappIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">WhatsApp</h3>
            <p className="text-sm text-slate-600 mt-1">Quick response</p>
          </a>
        </div>

        <div className="card-base p-6 mt-8 flex items-start gap-3">
          <MapPinIcon size={20} className="text-amber-700 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-slate-900">Address</h3>
            <p className="text-sm text-slate-600 mt-1">
              Ward No 14, Sardarshahar, Churu, Rajasthan - 331403
            </p>
          </div>
        </div>

        <div className="card-base p-6 mt-4">
          <h3 className="font-bold text-slate-900 mb-3">Send us a message</h3>
          <form className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
            />
            <textarea
              placeholder="Your message"
              rows={4}
              className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-amber-700"
            />
            <button type="submit" className="btn-primary">
              Send Message
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
