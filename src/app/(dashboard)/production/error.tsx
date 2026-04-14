"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProductionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[production] error boundary:", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-serif text-3xl text-primary-green sm:text-4xl">
          Production could not load
        </h1>
        <p className="mt-4 text-sm text-gray-600 sm:text-base">
          Something went wrong loading the production page. You can try
          again or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primary-green px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-green/90 focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/home"
            className="rounded-md border border-primary-green px-4 py-2 text-sm font-medium text-primary-green hover:bg-light-green/30 focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
