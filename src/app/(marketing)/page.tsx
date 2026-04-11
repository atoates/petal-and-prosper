import Link from "next/link";
import {
  ArrowRight,
  Flower,
  FileText,
  ShoppingCart,
  DollarSign,
  FileCheck,
  Receipt,
  Boxes,
  Wrench,
  Truck,
  CheckCircle,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { FloralBranch, FloralRose, FloralLeaf } from "@/components/marketing/floral-elements";
import { StatsTicker, FloristTicker } from "@/components/marketing/tickers";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export default function Home() {
  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#0d2218]">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#2D6A4F] opacity-20 blur-[120px] animate-orb-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#C9A96E] opacity-10 blur-[100px] animate-orb-pulse pointer-events-none" style={{ animationDelay: "3s" }} />

        {/* Botanical corners */}
        <FloralBranch className="absolute top-0 left-0 w-64 md:w-96 h-auto text-[#2D6A4F] opacity-25 -translate-x-6 pointer-events-none" />
        <FloralBranch className="absolute top-0 right-0 w-64 md:w-96 h-auto text-[#C9A96E] opacity-15 translate-x-6 scale-x-[-1] pointer-events-none" />
        <FloralRose className="absolute bottom-12 left-8 w-48 h-auto text-[#D4A0A7] opacity-20 pointer-events-none" />
        <FloralLeaf className="absolute bottom-8 right-12 w-32 h-auto text-[#2D6A4F] opacity-20 rotate-12 pointer-events-none" />

        {/* Florist names ticker inside hero */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 overflow-hidden">
          <FloristTicker />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-40">
          {/* Badge */}
          <div className="mb-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#C9A96E] animate-pulse" />
            <span className="text-sm font-medium text-white/80 tracking-wide">
              Trusted by 500+ UK florists
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif font-bold text-white leading-[1.05] tracking-tight mb-8">
            <span className="block text-5xl sm:text-7xl lg:text-8xl">
              The business of
            </span>
            <span className="block text-5xl sm:text-7xl lg:text-8xl">
              floristry,
            </span>
            <span
              className="block text-5xl sm:text-7xl lg:text-8xl italic"
              style={{
                background: "linear-gradient(135deg, #C9A96E 0%, #E8CFA0 50%, #C9A96E 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              beautifully managed.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-xl sm:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            From first enquiry to final invoice — everything in one elegant platform built for UK florists.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#1B4332] bg-[#C9A96E] hover:bg-[#E8CFA0] transition-all shadow-lg hover:shadow-[#C9A96E]/30 hover:shadow-2xl text-base"
            >
              Start free trial
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all text-base backdrop-blur-sm"
            >
              See how it works
            </a>
          </div>

          <p className="text-sm text-white/35 font-light tracking-wide">
            No credit card &middot; 30-day free trial &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── FEATURE TICKER ──────────────────────────────────────── */}
      <StatsTicker />

      {/* ─── STATS ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F7F2EA]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "UK florists" },
            { value: "10k+", label: "events managed" },
            { value: "£2M+", label: "in proposals sent" },
            { value: "4.9★", label: "average rating" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-5xl sm:text-6xl font-serif font-bold text-[#1B4332] mb-2 leading-none">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── BENTO FEATURES ──────────────────────────────────────── */}
      <section id="features" className="py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <p className="text-sm font-semibold text-[#C9A96E] uppercase tracking-widest mb-4">
              Platform
            </p>
            <h2 className="text-5xl sm:text-6xl font-serif font-bold text-[#1B4332] leading-tight">
              One platform.<br />Your entire business.
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Enquiries — large */}
            <div className="md:col-span-2 rounded-3xl bg-[#0d2218] p-8 sm:p-10 flex flex-col justify-between min-h-[280px] group hover:scale-[1.01] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <FileText className="text-[#C9A96E]" size={24} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-white mb-3">
                  Enquiry Management
                </h3>
                <p className="text-white/60 leading-relaxed">
                  Every lead tracked from first contact to confirmed booking. Never lose an enquiry again.
                </p>
              </div>
              <div className="flex gap-2 mt-6 flex-wrap">
                {["New", "Live", "TBD", "Placed", "Done"].map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Orders */}
            <div className="md:col-span-2 rounded-3xl bg-[#F3EDE3] p-8 sm:p-10 flex flex-col justify-between min-h-[280px] group hover:scale-[1.01] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center mb-6">
                  <ShoppingCart className="text-[#1B4332]" size={24} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1B4332] mb-3">
                  Order Builder
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Itemise every order with your product library. Automatic pricing, versioning, and totals.
                </p>
              </div>
              <div className="mt-6 space-y-2">
                {["Roses — Red · £3.50", "Foliage — Eucalyptus · £1.80", "Ribbon — Ivory · £0.60"].map((item) => (
                  <div key={item} className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-2 text-xs font-medium text-[#1B4332]">
                    <span>{item.split(" · ")[0]}</span>
                    <span className="text-[#2D6A4F] font-bold">{item.split(" · ")[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proposals */}
            <div className="rounded-3xl bg-[#FDF0F1] p-8 flex flex-col gap-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A0A7]/20 flex items-center justify-center">
                <FileCheck className="text-[#D4A0A7]" size={24} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B4332]">Proposals</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Beautiful PDF proposals in one click. Your branding, your terms.
              </p>
            </div>

            {/* Pricing */}
            <div className="rounded-3xl bg-[#FDFAF0] p-8 flex flex-col gap-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#C9A96E]/20 flex items-center justify-center">
                <DollarSign className="text-[#C9A96E]" size={24} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B4332]">Smart Pricing</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Markup multipliers, labour, fuel costs — automated so you always price correctly.
              </p>
            </div>

            {/* Invoices */}
            <div className="rounded-3xl bg-[#EEF5F0] p-8 flex flex-col gap-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/15 flex items-center justify-center">
                <Receipt className="text-[#2D6A4F]" size={24} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B4332]">Invoicing</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Get paid faster. Professional invoices with payment tracking built in.
              </p>
            </div>

            {/* Wholesale */}
            <div className="rounded-3xl bg-white border border-gray-100 p-8 flex flex-col gap-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/8 flex items-center justify-center">
                <Boxes className="text-[#1B4332]" size={24} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B4332]">Wholesale</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Manage supplier orders and track deliveries from order to receipt.
              </p>
            </div>

            {/* Production */}
            <div className="md:col-span-2 rounded-3xl bg-[#1B4332] p-8 sm:p-10 flex flex-col sm:flex-row gap-8 items-start group hover:scale-[1.01] transition-transform duration-300">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <Wrench className="text-[#C9A96E]" size={24} />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">Production</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Schedule builds, assign team tasks, and track progress from stem to arrangement.
                </p>
              </div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <Truck className="text-[#C9A96E]" size={24} />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">Delivery</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Plan delivery routes, manage driver notes, and confirm on-time arrivals.
                </p>
              </div>
            </div>

            {/* Team / RBAC */}
            <div className="md:col-span-2 rounded-3xl bg-[#FAF5FF] border border-purple-100 p-8 sm:p-10 flex flex-col gap-4 group hover:scale-[1.01] transition-transform duration-300">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Zap className="text-purple-600" size={24} />
                </div>
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B4332]">Team & Permissions</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Invite your team with role-based access. Admins, managers, and staff each see exactly what they need.
              </p>
              <div className="flex gap-2 flex-wrap">
                {["Admin", "Manager", "Staff"].map((r) => (
                  <span key={r} className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WORKFLOW ────────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#F7F2EA]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-[#C9A96E] uppercase tracking-widest mb-4">
              Workflow
            </p>
            <h2 className="text-5xl sm:text-6xl font-serif font-bold text-[#1B4332] leading-tight">
              Enquiry to invoice.<br />
              <span className="italic">In minutes.</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent" />

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  num: "01",
                  title: "Enquiry comes in",
                  desc: "Log client details, event date, and requirements. Dashboard updates instantly.",
                },
                {
                  num: "02",
                  title: "Build the order",
                  desc: "Select items from your product library. Pricing auto-calculates as you add.",
                },
                {
                  num: "03",
                  title: "Send the proposal",
                  desc: "One click generates a branded PDF proposal. Client signs off, you confirm.",
                },
                {
                  num: "04",
                  title: "Invoice & deliver",
                  desc: "Invoice raised automatically from the order. Track payment, production, delivery.",
                },
              ].map((step) => (
                <div key={step.num} className="relative text-center">
                  <div className="w-24 h-24 rounded-full bg-white border-2 border-[#C9A96E]/30 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <span className="text-3xl font-serif font-bold text-[#C9A96E]">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#1B4332] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#0d2218] relative overflow-hidden">
        <FloralBranch className="absolute top-0 left-0 w-80 h-auto text-[#2D6A4F] opacity-15 -translate-x-8 pointer-events-none" />
        <FloralRose className="absolute bottom-12 right-8 w-56 h-auto text-[#C9A96E] opacity-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#C9A96E] uppercase tracking-widest mb-4">
              Testimonials
            </p>
            <h2 className="text-5xl sm:text-6xl font-serif font-bold text-white leading-tight">
              Loved by florists<br />
              <span className="italic text-white/60">across the UK.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "This has saved me hours every single week. No more lost enquiries, no more spreadsheets. It's transformed how I run my business.",
                name: "Sarah Mitchell",
                company: "Bloom & Blossom, London",
                stars: 5,
              },
              {
                quote: "The proposal templates look so professional. Clients are genuinely impressed, and I've definitely won more contracts since switching.",
                name: "Emma Thompson",
                company: "The Flower Studio, Manchester",
                stars: 5,
              },
              {
                quote: "During wedding season this is an absolute lifesaver. Everything is in one place. I couldn't manage 40+ events without it.",
                name: "Rachel Davies",
                company: "Petals & Posies, Edinburgh",
                stars: 5,
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/8 transition-colors"
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} className="text-[#C9A96E] fill-[#C9A96E]" />
                  ))}
                </div>
                <p className="text-white/80 leading-relaxed mb-8 text-lg font-light italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#C9A96E] flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-white/45 text-xs">{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#C9A96E] uppercase tracking-widest mb-4">
              Pricing
            </p>
            <h2 className="text-5xl sm:text-6xl font-serif font-bold text-[#1B4332] leading-tight">
              Simple, honest pricing.
            </h2>
            <p className="text-xl text-gray-500 mt-4 font-light">
              Every plan includes a 30-day free trial. No card needed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-center">
            {[
              {
                name: "Essential",
                price: "£40.99",
                period: "/ month",
                note: "Billed monthly",
                desc: "For solo florists getting started",
                features: [
                  "Up to 50 orders / month",
                  "Enquiry & order management",
                  "Proposal & invoice templates",
                  "Product library",
                  "Email support",
                  "Mobile access",
                ],
                highlighted: false,
                cta: "Start free trial",
              },
              {
                name: "Growth",
                price: "£36.89",
                period: "/ month",
                note: "Billed every 6 months (10% off)",
                desc: "For professional florists scaling up",
                features: [
                  "Unlimited orders",
                  "Full enquiry pipeline",
                  "Custom pricing settings",
                  "Production scheduling",
                  "Delivery management",
                  "Priority email support",
                  "Team roles (up to 3 users)",
                  "Custom branding",
                ],
                highlighted: true,
                cta: "Start free trial",
              },
              {
                name: "Enterprise",
                price: "£34.84",
                period: "/ month",
                note: "Billed annually (15% off)",
                desc: "For large-scale floristry operations",
                features: [
                  "Everything in Growth",
                  "Unlimited users & roles",
                  "Wholesale management",
                  "Advanced reporting",
                  "Phone & priority support",
                  "Dedicated account manager",
                  "Custom integrations",
                ],
                highlighted: false,
                cta: "Talk to us",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-8 sm:p-10 transition-all ${
                  plan.highlighted
                    ? "bg-[#1B4332] text-white shadow-2xl shadow-[#1B4332]/30 scale-[1.03]"
                    : "bg-[#F7F2EA] hover:shadow-xl"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#C9A96E] text-[#1B4332] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      Most popular
                    </span>
                  </div>
                )}

                <p className={`text-sm font-semibold uppercase tracking-widest mb-2 ${plan.highlighted ? "text-[#C9A96E]" : "text-[#2D6A4F]"}`}>
                  {plan.name}
                </p>
                <p className={`text-sm mb-6 ${plan.highlighted ? "text-white/60" : "text-gray-500"}`}>
                  {plan.desc}
                </p>

                <div className="mb-2">
                  <span className={`text-5xl font-serif font-bold ${plan.highlighted ? "text-white" : "text-[#1B4332]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ml-1 ${plan.highlighted ? "text-white/50" : "text-gray-400"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-xs mb-8 ${plan.highlighted ? "text-white/40" : "text-gray-400"}`}>
                  {plan.note}
                </p>

                <ul className="space-y-3 mb-10">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className={`flex-shrink-0 mt-0.5 ${plan.highlighted ? "text-[#C9A96E]" : "text-[#2D6A4F]"}`}
                      />
                      <span className={`text-sm ${plan.highlighted ? "text-white/80" : "text-gray-700"}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlighted
                      ? "bg-[#C9A96E] text-[#1B4332] hover:bg-white"
                      : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section id="faqs" className="py-28 px-4 sm:px-6 lg:px-8 bg-[#F7F2EA]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#C9A96E] uppercase tracking-widest mb-4">
              FAQs
            </p>
            <h2 className="text-5xl sm:text-6xl font-serif font-bold text-[#1B4332] leading-tight">
              Questions answered.
            </h2>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#0d2218] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-[#2D6A4F] opacity-15 blur-[120px] pointer-events-none" />
        <FloralBranch className="absolute top-0 right-0 w-72 h-auto text-[#2D6A4F] opacity-10 translate-x-4 scale-x-[-1] pointer-events-none" />
        <FloralLeaf className="absolute bottom-0 left-0 w-40 h-auto text-[#C9A96E] opacity-10 pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Flower className="text-[#C9A96E] mx-auto mb-8 animate-float" size={40} />
          <h2 className="text-5xl sm:text-7xl font-serif font-bold text-white leading-tight mb-6">
            Ready to run your business
            <span className="italic text-[#C9A96E]"> beautifully?</span>
          </h2>
          <p className="text-xl text-white/50 mb-12 font-light">
            Join hundreds of UK florists. Start your free 30-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#1B4332] bg-[#C9A96E] hover:bg-[#E8CFA0] transition-all shadow-lg hover:shadow-[#C9A96E]/30 hover:shadow-2xl text-base"
            >
              Start free trial
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-4 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all text-base"
            >
              Log in
            </Link>
          </div>
          <p className="text-sm text-white/25 mt-8 font-light tracking-wide">
            No credit card &middot; Cancel anytime
          </p>
        </div>
      </section>
    </>
  );
}
