"use client";

import Link from "next/link";
import { Flower, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBase = "sticky top-0 z-50 transition-all duration-300";
  // Nav is `sticky` not `fixed`, so at scroll=0 it sits in document flow
  // above the hero, on top of the body cream background — not over the
  // hero. A transparent nav there shows cream behind it, making white
  // text invisible. At scroll=0 we therefore paint the nav the same dark
  // forest green as the hero so it reads as a seamless cap, then flip to
  // white-on-scroll as the content below goes light.
  const navBg = scrolled
    ? "bg-white border-b border-gray-200 shadow-sm"
    : "bg-[#1B4332] border-b border-white/5";

  const textColor = scrolled ? "text-[#1B4332]" : "text-white";
  const linkColor = scrolled
    ? "text-gray-700 hover:text-[#2D6A4F]"
    : "text-white/80 hover:text-white";
  const loginColor = scrolled
    ? "text-[#2D6A4F] hover:text-[#1B4332]"
    : "text-white hover:text-white/80";
  const signupBg = scrolled
    ? "bg-[#2D6A4F] text-white hover:bg-[#1B4332]"
    : "bg-white/15 text-white border border-white/30 hover:bg-white hover:text-[#1B4332]";

  return (
    <nav className={`${navBase} ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link
            href="/"
            className={`flex items-center gap-2 font-serif font-bold text-xl transition-colors ${textColor}`}
          >
            <Flower
              className={scrolled ? "text-[#D4A0A7]" : "text-[#C9A96E]"}
              size={28}
            />
            <span>Petal & Prosper</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {["features", "pricing", "faqs"].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className={`font-medium transition-colors text-sm capitalize ${linkColor}`}
              >
                {id === "faqs" ? "FAQs" : id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login" className={`font-semibold transition-colors text-sm ${loginColor}`}>
              Log in
            </Link>
            <Link
              href="/signup"
              className={`px-5 py-2.5 rounded-lg transition-all font-semibold text-sm shadow-md hover:shadow-lg backdrop-blur-sm ${signupBg}`}
            >
              Start free trial
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden transition-colors ${scrolled ? "text-[#1B4332]" : "text-white"}`}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-6 border-t border-white/10 pt-6 bg-[#1B4332]">
            <div className="flex flex-col gap-4 mb-6">
              {["features", "pricing", "faqs"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="text-white/80 font-medium hover:text-white transition-colors capitalize"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {id === "faqs" ? "FAQs" : id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-6 border-t border-white/10">
              <Link
                href="/login"
                className="text-center text-white font-semibold py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-center bg-[#C9A96E] text-[#1B4332] px-6 py-2.5 rounded-lg hover:bg-white transition-all font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
