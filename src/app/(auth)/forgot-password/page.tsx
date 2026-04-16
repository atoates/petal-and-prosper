"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // The endpoint always returns a generic success response to
      // avoid leaking whether an account exists, so we just treat
      // any non-ok HTTP status as a submission error.
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send reset link");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Check your email
        </h2>
        <p className="text-gray-600 mb-6">
          If an account exists for <strong>{email}</strong>, you will receive
          password reset instructions shortly. Please check your inbox.
        </p>
        <p className="text-amber-600 text-sm mb-4 bg-amber-50 p-3 rounded-lg">
          Note: email delivery is stubbed in this environment. The reset
          link is logged to the server console. Your administrator can
          grab it from there until SMTP is wired in.
        </p>
        <p className="text-gray-600 text-sm mb-6">
          Didn&apos;t receive an email? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-primary-green font-medium hover:text-light-green"
          >
            try again
          </button>
        </p>
        <Link href="/login" className="text-primary-green font-medium hover:text-light-green">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Reset your password
      </h2>
      <p className="text-gray-600 mb-6">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <Input
          type="email"
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        <Link href="/login" className="text-primary-green font-medium hover:text-light-green">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
