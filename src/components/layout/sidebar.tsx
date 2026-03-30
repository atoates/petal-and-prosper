"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flower, LogOut } from "lucide-react";
import {
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

const navigationItems = [
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
  const router = useRouter();

  const handleLogout = async () => {
    // TODO: Implement logout
    router.push("/");
  };

  return (
    <aside className="w-64 bg-primary-green text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col">
      <div className="p-6 border-b border-light-green">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Flower size={24} />
          <span>Petal & Prosper</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
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
    </aside>
  );
}
