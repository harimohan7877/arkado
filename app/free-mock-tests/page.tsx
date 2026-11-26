import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { FREE_MOCKS } from "@/lib/free-mocks";

export const metadata: Metadata = {
  title: "Free CBT Mock Tests",
  description: "Try a free 20-question practice test for SSC, Railways, Banking or Rajasthan CET. See your score and explanations after submitting.",
};

export default function FreeMockTestsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-amber-900 hover:underline">← Back to Arkado</Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">Free CBT Mock Tests</h1>
      <p className="mt-3 max-w-2xl leading-7 text-stone-700">Choose your exam and attempt 20 timed questions. See your score, correct answers and explanations after you submit. No sign-in required.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {FREE_MOCKS.map((mock) => (
          <li key={mock.id}>
            <Link href={`/free-mock-tests/${mock.id}`} className="group flex h-full min-h-28 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 transition hover:border-amber-700 focus-visible:outline-2 focus-visible:outline-amber-800 active:scale-[0.99]">
              <div>
                <p className="text-sm font-semibold text-amber-900">{mock.group}</p>
                <h2 className="mt-1 text-lg font-bold text-stone-950">{mock.name}</h2>
                <p className="mt-1 text-sm text-stone-600">{mock.questions.length} questions · {mock.minutes} minutes</p>
              </div>
              <ArrowRightIcon size={18} className="shrink-0 text-amber-800" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
