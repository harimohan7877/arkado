"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { scoreFreeMock, type FreeMock } from "@/lib/free-mocks/scoring";

const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 active:scale-[0.98]";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 active:scale-[0.98] disabled:opacity-50";
const scoreFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export default function FreeMockAttempt({ mock }: { mock: FreeMock }) {
  const [phase, setPhase] = useState<"ready" | "running" | "result">("ready");
  const [secondsLeft, setSecondsLeft] = useState(mock.minutes * 60);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [review, setReview] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [expired, setExpired] = useState(false);
  const deadline = useRef(0);
  const stage = useRef<HTMLHeadingElement>(null);
  const questionTitle = useRef<HTMLHeadingElement>(null);
  const submitDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (phase === "ready") return;
    stage.current?.focus();
    if (phase !== "running") return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) return;
      submitDialog.current?.close();
      setExpired(true);
      setPhase("result");
    };
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);

  const start = () => {
    deadline.current = Date.now() + mock.minutes * 60_000;
    setSecondsLeft(mock.minutes * 60);
    setAnswers({});
    setReview([]);
    setCurrent(0);
    setExpired(false);
    setPhase("running");
  };

  const finish = () => {
    submitDialog.current?.close();
    setExpired(Date.now() >= deadline.current);
    setPhase("result");
  };

  const changeQuestion = (target: number) => {
    if (target === current) return;
    setCurrent(target);
    window.requestAnimationFrame(() => questionTitle.current?.focus());
  };

  const answered = Object.keys(answers).length;
  const question = mock.questions[current];
  const duration = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const total = mock.questions.length;
  const result = phase === "result" ? scoreFreeMock(mock, answers) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {phase !== "running" && (
        <Link href="/free-mock-tests" className="inline-flex min-h-11 items-center font-semibold text-amber-900 hover:underline">← All free mocks</Link>
      )}
      <header className="my-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Free CBT mock test</p>
          <h1 ref={stage} tabIndex={-1} className="mt-1 text-2xl font-black text-stone-950 outline-none sm:text-4xl">
            {phase === "result" ? "Your results" : mock.name}
          </h1>
        </div>
        {phase === "running" && (
          <div className={`rounded-lg px-3 py-2 text-sm font-bold tabular-nums ${secondsLeft <= 60 ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-950"}`}>
            <span className="sr-only">Time remaining </span><span role="timer">{duration}</span>
            <span className="sr-only" role="status">{secondsLeft === 60 ? "One minute remaining" : ""}</span>
          </div>
        )}
      </header>

      {phase === "ready" && (
        <section className="max-w-2xl rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold">Before you start</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-6 text-stone-700">
            <li>{total} questions · {mock.minutes} minutes.</li>
            <li>Correct answer: +{mock.correctUnits / 12}. Wrong answer: {mock.penaltyLabel}. Unanswered: 0.</li>
            <li>Jump between questions, flag questions for review, or clear an answer.</li>
            <li>The test submits when time runs out. Keep this page open during the attempt.</li>
          </ul>
          <p className="mt-4 text-sm text-stone-600">This compact practice set uses one overall timer.</p>
          <button type="button" className={`mt-5 ${primary}`} onClick={start}>Start test</button>
        </section>
      )}

      {phase === "running" && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-6" aria-labelledby="mock-question-title">
            <p className="text-sm font-semibold text-amber-900">{question.topic}</p>
            <h2 ref={questionTitle} id="mock-question-title" tabIndex={-1} className="mt-2 text-lg font-bold outline-none">
              <span className="mb-1 block text-sm font-medium text-stone-600">Question {current + 1} of {total}</span>
              {question.prompt}
            </h2>
            <fieldset key={current} aria-labelledby="mock-question-title" className="mt-4 grid gap-2">
              {question.options.map((option, index) => (
                <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${answers[current] === index ? "border-amber-800 bg-amber-50" : "border-stone-200 hover:border-stone-400"}`}>
                  <input type="radio" name="mock-answer" checked={answers[current] === index} className="shrink-0 accent-amber-800"
                    onChange={() => {
                      if (Date.now() < deadline.current) setAnswers((previous) => ({ ...previous, [current]: index }));
                    }} />
                  {option}
                </label>
              ))}
            </fieldset>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={secondary} aria-pressed={review.includes(current)} onClick={() => setReview((previous) => previous.includes(current) ? previous.filter((item) => item !== current) : [...previous, current])}>
                {review.includes(current) ? "Remove review flag" : "Mark for review"}
              </button>
              <button type="button" className={secondary} disabled={answers[current] === undefined} onClick={() => {
                if (Date.now() >= deadline.current) return;
                setAnswers((previous) => {
                  const next = { ...previous };
                  delete next[current];
                  return next;
                });
              }}>Clear answer</button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
              <button type="button" className={secondary} disabled={current === 0} onClick={() => changeQuestion(current - 1)}>Previous</button>
              {current < total - 1 ? (
                <button type="button" className={primary} onClick={() => changeQuestion(current + 1)}>Next question</button>
              ) : (
                <button type="button" className={primary} onClick={() => submitDialog.current?.showModal()}>Submit test</button>
              )}
            </div>
          </section>

          <nav aria-label="Question palette" className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="font-bold">Question palette</p>
            <p className="mt-1 text-sm text-stone-600">{answered} answered · {review.length} flagged</p>
            <div className="my-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {mock.questions.map((_, index) => {
                const flagged = review.includes(index);
                const completed = answers[index] !== undefined;
                return (
                  <button key={index} type="button" onClick={() => changeQuestion(index)} aria-current={index === current ? "step" : undefined}
                    aria-label={`Question ${index + 1}, ${completed ? "answered" : "unanswered"}${flagged ? ", marked for review" : ""}`}
                    className={`relative grid min-h-11 min-w-0 place-items-center rounded-lg border text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 active:scale-[0.98] ${index === current ? "border-amber-800 bg-amber-800 text-white" : completed ? "border-green-300 bg-green-50 text-green-950" : "border-stone-200 text-stone-800 hover:border-amber-800"}`}>
                    {index + 1}
                    {flagged && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-violet-600" />}
                  </button>
                );
              })}
            </div>
            <button type="button" className={`w-full ${secondary}`} onClick={() => submitDialog.current?.showModal()}>Submit test</button>
          </nav>

          <dialog ref={submitDialog} aria-labelledby="mock-submit-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-white p-5 shadow-lg backdrop:bg-stone-950/60">
            <h2 id="mock-submit-title" className="text-lg font-bold">Submit this attempt?</h2>
            <p className="mt-2 text-stone-700">{total - answered} unanswered · {review.length} marked for review</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className={secondary} type="button" autoFocus onClick={() => submitDialog.current?.close()}>Keep working</button>
              <button className={primary} type="button" onClick={finish}>Confirm submit</button>
            </div>
          </dialog>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="font-semibold text-stone-700">{mock.name}</p>
            {expired && <p role="status" className="mt-2 text-sm text-amber-900">Time is up. Your test was submitted automatically.</p>}
            <p className="mt-3 text-3xl font-black text-stone-950">{scoreFormat.format(result.score)} / {result.maximum} <span className="text-base font-semibold">marks</span></p>
            <p className="mt-2 text-sm text-stone-700">{result.correct} correct · {result.incorrect} incorrect · {result.unanswered} unanswered</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={mock.catalogue} className={primary}>Explore study kits</Link>
              <button type="button" className={secondary} onClick={start}>Retake test</button>
            </div>
          </section>
          <section aria-labelledby="mock-review-title">
            <h2 id="mock-review-title" className="text-xl font-bold">Answers and explanations</h2>
            <ol className="mt-3 space-y-2">
              {mock.questions.map((item, index) => {
                const answer = answers[index];
                return (
                  <li key={item.prompt} className="rounded-xl border border-stone-200 bg-white p-4">
                    <details>
                      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">
                        <span>{index + 1}. {item.prompt}</span>
                        <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold">{answer === undefined ? "Unanswered" : answer === item.answer ? "Correct" : "Incorrect"}</span>
                      </summary>
                      <p className="mt-2 text-sm text-stone-700">Your answer: {answer === undefined ? "Unanswered" : item.options[answer]}</p>
                      <p className="mt-1 text-sm font-bold text-green-900">Correct answer: {item.options[item.answer]}</p>
                      <p className="mt-2 text-sm leading-6 text-stone-700">{item.explanation}</p>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </main>
  );
}
