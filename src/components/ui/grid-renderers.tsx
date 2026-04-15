"use client";

import { Badge } from "@/components/ui/badge";
import { formatUkDate } from "@/lib/format-date";
import {
  enquiryProgressColours,
  orderStatusColours,
  proposalStatusColours,
  invoiceStatusColours,
  productionStatusColours,
  deliveryStatusColours,
  wholesaleStatusColours,
} from "@/lib/status-colours";

interface CellRendererProps {
  value: string | number | null | undefined;
  data?: Record<string, unknown>;
}

// Merge all entity status maps so the generic renderer handles any status
const statusColors = {
  ...enquiryProgressColours,
  ...orderStatusColours,
  ...proposalStatusColours,
  ...invoiceStatusColours,
  ...productionStatusColours,
  ...deliveryStatusColours,
  ...wholesaleStatusColours,
};

export const StatusBadgeRenderer = (props: CellRendererProps) => {

  const value = props.value || "";
  const displayValue = typeof value === "string"
    ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    : String(value);

  return (
    <Badge
      variant={
        statusColors[value as keyof typeof statusColors] || "secondary"
      }
    >
      {displayValue}
    </Badge>
  );
};

export const CurrencyRenderer = (props: CellRendererProps) => {
  if (!props.value && props.value !== 0) return "-";
  const formatted = parseFloat(String(props.value)).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `£${formatted}`;
};

export const DateRenderer = (props: CellRendererProps) => {
  if (!props.value) return "-";
  return formatUkDate(String(props.value));
};

export const CategoryBadgeRenderer = (props: CellRendererProps) => {
  if (!props.value) return "-";
  const displayNames: Record<string, string> = {
    flower: "Flowers", foliage: "Foliage", sundry: "Sundries",
    container: "Containers", ribbon: "Ribbons", accessory: "Accessories",
  };
  const colours: Record<string, string> = {
    flower: "bg-pink-100 text-pink-800",
    foliage: "bg-green-100 text-green-800",
    sundry: "bg-amber-100 text-amber-800",
    container: "bg-blue-100 text-blue-800",
    ribbon: "bg-purple-100 text-purple-800",
    accessory: "bg-gray-100 text-gray-800",
  };
  const val = String(props.value).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colours[val] || "bg-blue-100 text-blue-800"}`}>
      {displayNames[val] || props.value}
    </span>
  );
};
