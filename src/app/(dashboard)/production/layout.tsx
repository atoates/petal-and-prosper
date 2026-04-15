import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Production",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
