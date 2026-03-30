"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement signup with NextAuth
      console.log("Signup attempt:", formData);
      router.push("/enquiries");
    } catch (err) {
      setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create account</h2>
      <p className="text-gray-600 mb-6">Start your free 14-day trial today</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            name="firstName"
            label="First name"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
          <Input
            type="text"
            name="lastName"
            label="Last name"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <Input
          type="text"
          name="companyName"
          label="Company name"
          placeholder="Your Flower Shop"
          value={formData.companyName}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <Input
          type="email"
          name="email"
          label="Email address"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <Input
          type="password"
          name="password"
          label="Password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={isLoading}
          helperText="Must be at least 8 characters"
        />

        <Input
          type="password"
          name="confirmPassword"
          label="Confirm password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="w-full"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create free account"}
        </Button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary-green font-medium hover:text-light-green">
          Sign in
        </Link>
      </p>

      <p className="text-center text-gray-500 text-xs mt-4">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
