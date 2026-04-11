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
} from "lucide-react";
import { useState, useEffect } from "react";

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
  { name: "Libraries", href: "/libraries", icon: Library },
];

const settingsItems = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Subscription", href: "/subscription", icon: CreditCard },
  { name: "User", href: "/user", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile nav is open
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
      <div className="p-6 border-b border-light-green flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Flower size={24} />
          <span>Petal & Prosper</span>
        </Link>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-white hover:text-soft-cream"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-light-green text-white"
                  : "text-soft-cream hover:bg-light-green"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-light-green p-4 space-y-1">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-light-green text-white"
                  : "text-soft-cream hover:bg-light-green"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-soft-cream hover:bg-light-green transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary-green text-white rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 w-72 bg-primary-green text-white h-screen z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-primary-green text-white h-screen fixed left-0 top-0 overflow-y-auto flex-col">
        {navContent}
      </aside>
    </>
  );
}
