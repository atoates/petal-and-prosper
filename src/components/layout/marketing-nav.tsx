"use client";

import Link from "next/link";
import { Flower, Menu, X } from "lucide-react";
import { useState } from "react";

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-2 font-serif font-bold text-xl text-[#1B4332] hover:text-[#2D6A4F] transition-colors">
            <Flower className="text-[#D4A0A7]" size={28} />
            <span>Petal & Prosper</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            <a
              href="#features"
              className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors text-sm"
            >
              Features
            </a>
            <a
              href="#benefits"
              className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors text-sm"
            >
              Benefits
            </a>
            <a
              href="#pricing"
              className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors text-sm"
            >
              Pricing
            </a>
            <a
              href="#faqs"
              className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors text-sm"
            >
              FAQs
            </a>
          </div>

          {/* Desktop Auth Links */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="text-[#2D6A4F] font-semibold hover:text-[#1B4332] transition-colors text-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-[#2D6A4F] text-white px-6 py-2.5 rounded-lg hover:bg-[#1B4332] transition-all font-semibold text-sm shadow-md hover:shadow-lg"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[#1B4332] hover:text-[#2D6A4F] transition-colors"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-6 border-t border-gray-200 pt-6">
            <div className="flex flex-col gap-4 mb-6">
              <a
                href="#features"
                className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#benefits"
                className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefits
              </a>
              <a
                href="#pricing"
                className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#faqs"
                className="text-gray-700 font-medium hover:text-[#2D6A4F] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQs
              </a>
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-gray-200">
              <Link
                href="/login"
                className="text-center text-[#2D6A4F] font-semibold hover:text-[#1B4332] transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-center bg-[#2D6A4F] text-white px-6 py-2.5 rounded-lg hover:bg-[#1B4332] transition-all font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
