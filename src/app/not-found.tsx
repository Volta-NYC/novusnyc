import Link from "next/link";

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-v-bg px-5">
      <div className="text-center max-w-md">
        <p className="font-display font-bold text-v-green text-6xl mb-4">404</p>
        <h1 className="font-display font-bold text-v-ink text-2xl md:text-3xl mb-3">
          Page not found
        </h1>
        <p className="font-body text-v-muted mb-8">
          This page doesn&apos;t exist or may have moved. Try one of the links below.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="bg-v-green text-v-ink font-display font-bold text-sm px-6 py-3 rounded-full hover:bg-v-green-dark transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/partners"
            className="border border-v-border text-v-ink font-display font-bold text-sm px-6 py-3 rounded-full hover:border-v-ink/40 transition-colors"
          >
            For Businesses
          </Link>
          <Link
            href="/join"
            className="border border-v-border text-v-ink font-display font-bold text-sm px-6 py-3 rounded-full hover:border-v-ink/40 transition-colors"
          >
            For Students
          </Link>
        </div>
      </div>
    </section>
  );
}
