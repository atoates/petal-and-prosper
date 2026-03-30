import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ShoppingCart,
  DollarSign,
  FileCheck,
  Receipt,
  Boxes,
  Wrench,
  Truck,
  CheckCircle,
  ArrowRight,
  Flower,
} from "lucide-react";
import {
  FloralLeaf,
  FloralPetal,
  FloralBranch,
  FloralRose,
  FloralDivider,
} from "@/components/marketing/floral-elements";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-[#FFF8F0] via-[#FAF3E0] to-[#f5e0e3]">
        {/* Botanical decorative elements */}
        <FloralBranch className="absolute top-0 left-0 w-56 md:w-80 h-auto text-[#2D6A4F] -translate-x-4" />
        <FloralBranch className="absolute top-0 right-0 w-56 md:w-80 h-auto text-[#D4A0A7] translate-x-4 scale-x-[-1]" />
        <FloralRose className="absolute bottom-8 left-6 w-36 md:w-56 h-auto text-[#E8B4B8]" />
        <FloralPetal className="absolute top-20 right-12 w-28 md:w-44 h-auto text-[#C9A96E]" />
        <FloralLeaf className="absolute bottom-0 right-20 w-24 md:w-36 h-auto text-[#2D6A4F] rotate-12" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-8 inline-flex items-center gap-3 px-5 py-3 bg-white bg-opacity-70 backdrop-blur-sm rounded-full border border-[#2D6A4F] border-opacity-20 shadow-sm hover:shadow-md transition-shadow">
            <Flower className="text-[#D4A0A7]" size={18} />
            <span className="text-sm font-medium text-[#1B4332]">
              Premium Floristry Business Management
            </span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-serif font-bold text-[#1B4332] mb-6 leading-tight tracking-tight">
            Floristry Business
            <br />
            <span className="bg-gradient-to-r from-[#2D6A4F] to-[#1B4332] bg-clip-text text-transparent">
              Management Made Simple
            </span>
          </h1>

          <p className="text-xl text-[#2D6A4F] mb-10 max-w-3xl mx-auto leading-relaxed font-light">
            Manage enquiries, orders, proposals, and invoices in one elegant platform. Built by florists for florists, trusted by hundreds across the UK.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button
                variant="primary"
                size="lg"
                className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Start your free trial
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F] hover:text-white font-semibold px-8 py-3 rounded-lg transition-all"
              >
                Learn more
              </Button>
            </Link>
          </div>

          <p className="text-sm text-[#2D6A4F] font-medium">
            No credit card required. 30-day free trial.
          </p>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
            <div className="sm:border-r border-gray-200 sm:pr-8">
              <p className="text-sm font-medium text-[#2D6A4F] mb-1">Trusted by leading florists</p>
              <p className="text-3xl font-serif font-bold text-[#1B4332]">500+</p>
              <p className="text-sm text-gray-600">florists across the UK</p>
            </div>
            <div className="sm:border-r border-gray-200 sm:px-8">
              <p className="text-3xl font-serif font-bold text-[#1B4332]">10,000+</p>
              <p className="text-sm text-gray-600">orders managed</p>
            </div>
            <div className="sm:border-r border-gray-200 sm:px-8">
              <p className="text-3xl font-serif font-bold text-[#1B4332]">£2M+</p>
              <p className="text-sm text-gray-600">in proposals sent</p>
            </div>
            <div className="sm:px-8">
              <p className="text-3xl font-serif font-bold text-[#C9A96E]">★★★★★</p>
              <p className="text-sm text-gray-600">4.9/5 rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        {/* Floral accents */}
        <FloralLeaf className="absolute top-8 right-0 w-28 h-auto text-[#E8B4B8] rotate-45" />
        <FloralPetal className="absolute bottom-8 left-0 w-36 h-auto text-[#2D6A4F] -rotate-12" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-6">
            <FloralDivider className="w-64 h-auto mx-auto text-[#C9A96E] mb-6" />
            <h2 className="text-5xl sm:text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Powerful Core Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Everything you need to run your floristry business efficiently and professionally
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {[
              {
                icon: FileText,
                name: "Enquiries",
                description: "Track and manage client enquiries with full history",
              },
              {
                icon: ShoppingCart,
                name: "Orders",
                description: "Create and manage orders with item tracking and versioning",
              },
              {
                icon: DollarSign,
                name: "Pricing",
                description: "Automated quote generation with custom pricing multipliers",
              },
              {
                icon: FileCheck,
                name: "Proposals",
                description: "Professional proposal templates with branding",
              },
              {
                icon: Receipt,
                name: "Invoices",
                description: "Automated invoicing and payment tracking",
              },
              {
                icon: Boxes,
                name: "Wholesale",
                description: "Manage supplier orders and inventory",
              },
              {
                icon: Wrench,
                name: "Production",
                description: "Schedule and track production timelines",
              },
              {
                icon: Truck,
                name: "Delivery",
                description: "Plan and manage delivery schedules",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className="group bg-white rounded-xl p-8 border border-gray-200 hover:border-[#2D6A4F] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-[#FFF8F0] to-[#E8B4B8] group-hover:from-[#2D6A4F] group-hover:to-[#1B4332] transition-all">
                    <Icon className="text-[#2D6A4F] group-hover:text-white" size={28} />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#1B4332] mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#FAF3E0] to-white overflow-hidden">
        <FloralRose className="absolute top-0 right-0 w-48 h-auto text-[#D4A0A7]" />
        <FloralLeaf className="absolute bottom-0 left-4 w-32 h-auto text-[#2D6A4F] -rotate-12" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#2D6A4F] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Everything at a glance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Your dashboard summarises all enquiries and orders in one beautiful, intuitive interface
            </p>
          </div>

          {/* Mock Dashboard */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 transform hover:scale-[1.02] transition-transform duration-500 origin-center">
            <div className="p-8 bg-gradient-to-b from-white to-gray-50">
              {/* Dashboard Header */}
              <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] flex items-center justify-center">
                  <Flower className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-[#1B4332]">Orders Dashboard</h3>
                  <p className="text-gray-600 text-sm">Active orders and enquiries</p>
                </div>
              </div>

              {/* Dashboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-[#1B4332] text-sm">Client</th>
                      <th className="text-left py-4 px-4 font-semibold text-[#1B4332] text-sm">Event Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-[#1B4332] text-sm">Status</th>
                      <th className="text-left py-4 px-4 font-semibold text-[#1B4332] text-sm">Event Date</th>
                      <th className="text-right py-4 px-4 font-semibold text-[#1B4332] text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { client: "Sarah & James", event: "Wedding", status: "In Progress", date: "15 Jun 2026", total: "£2,450" },
                      { client: "Emma Thompson", event: "Corporate Event", status: "Proposal Sent", date: "22 May 2026", total: "£890" },
                      { client: "The Smith Family", event: "Anniversary", status: "Confirmed", date: "10 Jul 2026", total: "£650" },
                      { client: "Rose & Lewis", event: "Wedding", status: "Enquiry", date: "08 Aug 2026", total: "TBC" },
                      { client: "Charity Gala", event: "Corporate", status: "Invoiced", date: "30 Apr 2026", total: "£3,200" },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-[#FFF8F0] transition-colors">
                        <td className="py-4 px-4 text-gray-900 font-medium text-sm">{row.client}</td>
                        <td className="py-4 px-4 text-gray-600 text-sm">{row.event}</td>
                        <td className="py-4 px-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              row.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : row.status === "Proposal Sent"
                                ? "bg-purple-100 text-purple-800"
                                : row.status === "Confirmed"
                                ? "bg-green-100 text-green-800"
                                : row.status === "Enquiry"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">{row.date}</td>
                        <td className="py-4 px-4 text-right font-semibold text-[#2D6A4F] text-sm">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#FFF8F0] border-y border-gray-200 overflow-hidden">
        <FloralBranch className="absolute top-0 right-0 w-64 h-auto text-[#E8B4B8] scale-x-[-1]" />
        <FloralPetal className="absolute bottom-12 left-4 w-32 h-auto text-[#C9A96E]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#D4A0A7] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Why florists choose Petal & Prosper
            </h2>
            <p className="text-xl text-gray-600 font-light">
              Built by florists, for florists
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Save hours of administration every week",
              "Never lose an enquiry or order again",
              "Professional proposals and invoices",
              "Built-in pricing calculator",
              "Real-time order status tracking",
              "Customisable settings for your business",
              "Secure cloud-based storage",
              "Mobile-friendly interface",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-4 p-4 rounded-lg hover:bg-white transition-colors">
                <CheckCircle className="text-[#2D6A4F] flex-shrink-0 mt-1" size={24} />
                <p className="text-lg text-gray-800 font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <FloralLeaf className="absolute top-12 left-0 w-24 h-auto text-[#2D6A4F] -rotate-45" />
        <FloralRose className="absolute bottom-12 right-0 w-40 h-auto text-[#E8B4B8]" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#2D6A4F] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600 font-light">
              Get up and running in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent"></div>

            {[
              {
                number: 1,
                title: "Enter your enquiry",
                description: "Add client details and event requirements to your dashboard",
              },
              {
                number: 2,
                title: "Create your order",
                description: "Build itemised orders with automatic pricing calculations",
              },
              {
                number: 3,
                title: "Send your proposal",
                description: "Generate professional proposals in one click",
              },
            ].map((step) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white font-serif font-bold text-3xl mb-6 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#1B4332] mb-3 text-center">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-center font-light">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-[#FAF3E0] overflow-hidden">
        <FloralBranch className="absolute top-0 left-0 w-56 h-auto text-[#2D6A4F]" />
        <FloralPetal className="absolute bottom-0 right-0 w-40 h-auto text-[#D4A0A7] rotate-45" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#C9A96E] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 font-light">
              Choose the plan that fits your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Essential",
                price: "£40.99",
                billingPeriod: "/month (pay monthly)",
                userPrice: "£30.99/month per additional user",
                description: "Perfect for getting started",
                features: [
                  "Up to 50 orders per month",
                  "Basic enquiry tracking",
                  "Simple order management",
                  "Email support",
                  "Mobile access",
                ],
              },
              {
                name: "Growth",
                price: "£36.89",
                billingPeriod: "/month (6 months, 10% off)",
                userPrice: "£27.89/month per additional user",
                total: "£221.34",
                description: "Most popular with professional florists",
                features: [
                  "Unlimited orders",
                  "Advanced enquiry management",
                  "Full order and proposal features",
                  "Priority email support",
                  "Custom pricing settings",
                  "Production scheduling",
                  "Professional branding",
                  "Mobile access",
                ],
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "£34.84",
                billingPeriod: "/month (12 months, 15% off)",
                userPrice: "£26.34/month per additional user",
                total: "£418.08",
                description: "For large-scale operations",
                features: [
                  "Everything in Growth",
                  "Wholesale management",
                  "Multi-user accounts with roles",
                  "Phone support",
                  "Custom integrations",
                  "Priority support",
                  "Advanced reporting",
                  "Dedicated account manager",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border-2 transition-all duration-300 ${
                  plan.highlighted
                    ? "border-[#2D6A4F] bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white shadow-2xl scale-105"
                    : "border-gray-200 bg-white hover:border-[#2D6A4F] hover:shadow-xl"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#C9A96E] text-[#1B4332] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className={`text-3xl font-serif font-bold mb-2 ${plan.highlighted ? "text-white" : "text-[#1B4332]"}`}>
                  {plan.name}
                </h3>
                <p className={`mb-6 text-sm ${plan.highlighted ? "text-gray-200" : "text-gray-600"}`}>
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className={`text-5xl font-serif font-bold ${plan.highlighted ? "text-white" : "text-[#1B4332]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? "text-gray-300" : "text-gray-600"}`}>
                    {plan.billingPeriod}
                  </span>
                  {plan.total && (
                    <p className={`text-sm mt-2 ${plan.highlighted ? "text-gray-300" : "text-gray-600"}`}>
                      Total: {plan.total}
                    </p>
                  )}
                  <p className={`text-xs mt-3 ${plan.highlighted ? "text-gray-300" : "text-gray-600"}`}>
                    {plan.userPrice}
                  </p>
                </div>

                <ul className={`space-y-3 mb-8 ${plan.highlighted ? "text-gray-100" : ""}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle
                        className={`${plan.highlighted ? "text-[#C9A96E]" : "text-[#2D6A4F]"} flex-shrink-0 mt-0.5`}
                        size={20}
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="block">
                  <Button
                    variant={plan.highlighted ? "secondary" : "primary"}
                    className={`w-full font-semibold py-3 rounded-lg transition-all ${
                      plan.highlighted
                        ? "bg-[#C9A96E] text-[#1B4332] hover:bg-white"
                        : "bg-[#2D6A4F] text-white hover:bg-[#1B4332]"
                    }`}
                  >
                    Get started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#FFF8F0] overflow-hidden">
        <FloralRose className="absolute top-8 left-4 w-44 h-auto text-[#E8B4B8]" />
        <FloralLeaf className="absolute bottom-8 right-8 w-28 h-auto text-[#2D6A4F] rotate-180" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#D4A0A7] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Loved by UK florists
            </h2>
            <p className="text-xl text-gray-600 font-light">
              See what professional florists say about Petal & Prosper
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "This platform has saved me literally hours every week. No more manual spreadsheets, no more lost enquiries. It's absolutely transformed how I run my business.",
                author: "Sarah Mitchell",
                company: "Bloom & Blossom, London",
              },
              {
                quote:
                  "The proposal templates look incredibly professional and clients have been so impressed. I've definitely won more contracts since switching to Petal & Prosper.",
                author: "Emma Thompson",
                company: "The Flower Studio, Manchester",
              },
              {
                quote:
                  "During wedding season, this app is an absolute lifesaver. Everything is organised in one place. I couldn't imagine managing dozens of events without it now.",
                author: "Rachel Davies",
                company: "Petals & Posies, Edinburgh",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-[#C9A96E] text-lg">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-serif font-bold text-[#1B4332]">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <FloralPetal className="absolute top-16 right-0 w-32 h-auto text-[#C9A96E]" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <FloralDivider className="w-64 h-auto mx-auto text-[#2D6A4F] mb-6" />
            <h2 className="text-5xl font-serif font-bold text-[#1B4332] mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 font-light">Everything you need to know</p>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "Do I need to provide card details when signing up?",
                answer:
                  "No, you don't need to provide card details to start your 30-day free trial. Enjoy full access to all features with no commitment.",
              },
              {
                question: "Can I change plans at any time?",
                answer:
                  "Yes, absolutely. You can change your plan at any time via System Setup > Billing Information. Changes take effect at your next billing cycle.",
              },
              {
                question: "Can I customise my documents?",
                answer:
                  "Yes, you can fully customise your documents. Update your logo and branding, or go deeper and customise with HTML/CSS for complete control.",
              },
              {
                question: "Is there a service agreement or cost for support?",
                answer:
                  "No, there's no additional cost for support. All support is included in your plan price. We're here to help you succeed.",
              },
              {
                question: "How easy is it to cancel?",
                answer:
                  "Very easy. If you don't provide card details during the trial, it simply auto-cancels. Or you can cancel anytime via System Setup > Close my Account.",
              },
              {
                question: "What devices can I use it on?",
                answer:
                  "Everything with an internet connection. Petal & Prosper is fully responsive and works beautifully on desktop, tablet, and mobile devices.",
              },
              {
                question: "Can I change my user count?",
                answer:
                  "Yes, you can add or remove users anytime via System Setup > Users. We'll adjust your billing pro-rata for any changes.",
              },
              {
                question: "Do we pay for upgrades?",
                answer:
                  "No, all upgrades are included automatically. New features roll out to all users at no extra cost. You only ever pay for your plan.",
              },
            ].map((faq) => (
              <div key={faq.question} className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#2D6A4F] hover:shadow-md transition-all">
                <h3 className="text-lg font-serif font-bold text-[#1B4332] mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#2D6A4F] to-[#1B4332] text-white overflow-hidden">
        {/* Floral accents on dark background */}
        <FloralBranch className="absolute top-0 left-0 w-64 h-auto text-white opacity-20" />
        <FloralBranch className="absolute bottom-0 right-0 w-64 h-auto text-white opacity-20 scale-x-[-1] rotate-180" />
        <FloralRose className="absolute top-8 right-16 w-44 h-auto text-[#C9A96E] opacity-30" />
        <FloralPetal className="absolute bottom-8 left-16 w-36 h-auto text-white opacity-20" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FloralDivider className="w-64 h-auto mx-auto text-[#C9A96E] opacity-40 mb-8" />
          <h2 className="text-5xl font-serif font-bold mb-6">
            Ready to streamline your floristry business?
          </h2>
          <p className="text-xl text-gray-200 mb-10 font-light">
            Join hundreds of UK florists using Petal & Prosper to manage their businesses more efficiently and professionally.
          </p>

          <Link href="/signup">
            <Button
              size="lg"
              className="bg-[#C9A96E] text-[#1B4332] hover:bg-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start your free trial
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </div>
      </section>

    </>
  );
}
