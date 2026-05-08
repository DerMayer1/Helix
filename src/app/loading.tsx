export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-[rgb(var(--background))] px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8">
          <div className="h-4 w-36 rounded-full bg-slate-200" />
          <div className="mt-8 h-16 max-w-3xl rounded-3xl bg-slate-200" />
          <div className="mt-4 h-5 max-w-2xl rounded-full bg-slate-200" />
        </section>
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="mt-5 h-10 w-28 rounded-2xl bg-slate-200" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
