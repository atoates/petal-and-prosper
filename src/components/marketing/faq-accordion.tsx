"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "Do I need to provide card details when signing up?",
    answer:
      "No card details needed for your 30-day free trial. Full access to all features, no commitment required.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes — upgrade, downgrade, or cancel anytime via Settings > Billing. Changes take effect at your next billing cycle.",
  },
  {
    question: "Can I customise my proposals and invoices?",
    answer:
      "Absolutely. Add your logo, brand colours, custom header and footer text, and your own terms and conditions — all from the Settings panel.",
  },
  {
    question: "Is there a limit on orders or enquiries?",
    answer:
      "The Essential plan covers up to 50 orders per month. Growth and Enterprise are unlimited.",
  },
  {
    question: "How easy is it to cancel?",
    answer:
      "One click under Settings > Close Account. If you don't add card details during the trial, it simply expires automatically.",
  },
  {
    question: "What devices does it work on?",
    answer:
      "Everything with a browser. Petal & Prosper is fully responsive — desktop, tablet, and mobile are all first-class experiences.",
  },
  {
    question: "Can I add team members?",
    answer:
      "Yes. Invite staff and managers with role-based permissions. Admin, Manager, and Staff roles with granular access control.",
  },
  {
    question: "Do we pay for new features?",
    answer:
      "Never. All updates roll out to every plan automatically at no extra cost.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => (
        <div
          key={idx}
          className="border border-gray-200 rounded-2xl overflow-hidden transition-all"
        >
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-serif font-bold text-[#1B4332] text-lg leading-snug">
              {faq.question}
            </span>
            <span className="flex-shrink-0 w-8 h-8 rounded-full border border-[#2D6A4F]/20 flex items-center justify-center text-[#2D6A4F]">
              {open === idx ? <Minus size={16} /> : <Plus size={16} />}
            </span>
          </button>
          {open === idx && (
            <div className="px-6 pb-6">
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
