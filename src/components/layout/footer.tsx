"use client";

import { Flower } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#1B4332] to-[#0F2818] text-white py-16 border-t border-[#2D6A4F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4A0A7] to-[#C9A96E] flex items-center justify-center">
                <Flower size={20} className="text-white" />
              </div>
              <span className="font-serif font-bold text-lg">Petal & Prosper</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed font-light">
              Floristry business management made simple. Trusted by 500+ florists across the UK.
            </p>
          </div>

          <div>
            <h3 className="font-serif font-bold mb-6 text-white">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#features" className="text-gray-300 hover:text-white transition-colors font-light">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-300 hover:text-white transition-colors font-light">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faqs" className="text-gray-300 hover:text-white transition-colors font-light">
                  FAQs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-bold mb-6 text-white">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors font-light">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors font-light">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors font-light">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-bold mb-6 text-white">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors font-light">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors font-light">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2D6A4F] pt-8 text-center text-sm text-gray-300">
          <p>
            &copy; {new Date().getFullYear()} Petal &amp; Prosper. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
