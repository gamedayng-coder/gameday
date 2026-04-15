export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-zinc-950 px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          BrandPost Inc.
        </h1>
        <p className="text-xl text-zinc-500 dark:text-zinc-300 mb-8">
          Online and social media communications, powered by modern tooling.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="#"
            className="rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-6 py-3 font-medium hover:opacity-90 transition-opacity"
          >
            Get started
          </a>
          <a
            href="#"
            className="rounded-full border border-zinc-200 dark:border-zinc-700 px-6 py-3 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Learn more
          </a>
        </div>
      </div>
    </main>
  );
}
