"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[rgb(var(--background))] px-4">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-rose-800">dashboard error</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">The operational cockpit could not render.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          The UI failed before loading the synthetic dashboard snapshot. No PHI was exposed.
        </p>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-600">
          {error.message || "Unknown render failure"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-transform active:translate-y-[1px]"
        >
          Retry dashboard
        </button>
      </section>
    </main>
  );
}
