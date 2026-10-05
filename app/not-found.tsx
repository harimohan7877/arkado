import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <p className="text-7xl font-black text-amber-700">404</p>
          <h1 className="text-2xl font-black text-slate-900 mt-4">Page not found</h1>
          <p className="text-sm text-slate-500 mt-2">
            The page you&apos;re looking for doesn&apos;t exist or was moved.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition"
            >
              Back to Home
            </Link>
            <Link
              href="/exams"
              className="px-6 py-3 border border-stone-300 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-100 transition"
            >
              Browse Study Material
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
