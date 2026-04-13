"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Flower, LogOut, Menu, X } from "lucide-react";
import {
  Home,
  FileText,
  ShoppingCart,
  DollarSign,
  FileCheck,
  Receipt,
  Boxes,
  Wrench,
  Truck,
  Settings,
  User,
  CreditCard,
  Library,
  BookUser,
  Wand2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { featureFlags } from "@/lib/feature-flags";

const navigationItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Enquiries", href: "/enquiries", icon: FileText },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
  { name: "Proposals", href: "/proposals", icon: FileCheck },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Wholesale", href: "/wholesale", icon: Boxes },
  { name: "Production", href: "/production", icon: Wrench },
  { name: "Delivery", href: "/delivery", icon: Truck },
  { name: "Address Book", href: "/contacts", icon: BookUser },
  { name: "Libraries", href: "/libraries", icon: Library },
  { name: "AI Tools", href: "/ai/scan-invoice", icon: Wand2 },
];

const settingsItems = [
  { name: "Settings", href: "/settings", icon: Settings },
  ...(featureFlags.subscriptionBilling
    ? [{ name: "Subscription", href: "/subscription", icon: CreditCard }]
    : []),
  { name: "User", href: "/user", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const navContent = (
    <>
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
            <Flower size={20} className="text-sage-200" />
          </div>
          <div>
            <span className="font-serif font-bold text-[15px] tracking-tight text-white block leading-tight">
              Petal & Prosper
            </span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-sage-400 font-medium">
              Floristry Studio
            </span>
          </div>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-sage-300 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={`shrink-0 transition-colors ${
                  isActive ? "text-sage-200" : "text-sage-400 group-hover:text-sage-300"
                }`}
              />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom settings */}
      <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-sage-300 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className={`shrink-0 transition-colors ${
                  isActive ? "text-sage-200" : "text-sage-400 group-hover:text-sage-300"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sage-300 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0 text-sage-400 group-hover:text-sage-300 transition-colors" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-dark-green text-white rounded-xl shadow-elevated hover:shadow-glow-green transition-shadow"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 w-72 bg-gradient-to-b from-dark-green to-primary-green text-white h-screen z-50 flex flex-col shadow-sidebar transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-sage-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-b from-dark-green to-primary-green text-white h-screen fixed left-0 top-0 overflow-y-auto flex-col shadow-sidebar">
        {navContent}
      </aside>
    </>
  );
}
