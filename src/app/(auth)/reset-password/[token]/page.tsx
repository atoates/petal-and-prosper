"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * /reset-password/[token]
 *
 * Public page reached from the link emailed by /api/auth/forgot-password.
 * The raw token is in the URL and is posted verbatim to the reset
 * endpoint along with the new password. The endpoint validates the
 * token, expiry, and single-use constraint.
 *
 * Success flow: we show a brief "password updated" message, then push
 * the user to /login so they can sign in with the new credentials.
 */
export default function ResetPasswordPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          password,
          confirmPassword,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reset password");
      }
      setDone(true);
      // Give the user a beat to read the success message before
      // sending them back to login.
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Password updated
        </h2>
        <p className="text-gray-600 mb-6">
          Your password has been reset. Redirecting you to sign in...
        </p>
        <Link
          href="/login"
          className="text-primary-green font-medium hover:text-light-green"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Choose a new password
      </h2>
      <p className="text-gray-600 mb-6">
        Enter a new password for your Petal &amp; Prosper account. This link
        expires 60 minutes after it was sent and can only be used once.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <Input
          type="password"
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <Input
          type="password"
          label="Confirm new password"
          placeholder="Repeat the password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="w-full"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Update password"}
        </Button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        <Link
          href="/login"
          className="text-primary-green font-medium hover:text-light-green"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
