"use client";

const items = [
  "Enquiries",
  "Orders",
  "Proposals",
  "Invoices",
  "Wholesale",
  "Production",
  "Delivery",
  "Pricing",
  "Product Library",
  "Team Management",
];

const florists = [
  "Bloom & Blossom, London",
  "The Flower Studio, Manchester",
  "Petals & Posies, Edinburgh",
  "Wild Stems, Bristol",
  "Garden State Flowers, Leeds",
  "Verdant Florals, Birmingham",
  "The Petal Room, Bath",
  "Sunrise Blooms, Brighton",
  "Fleur de Lys, Oxford",
  "Meadow & More, Norwich",
];

export function StatsTicker() {
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden py-5 border-y border-[#2D6A4F]/15 bg-[#F7F2EA]">
      <div className="flex animate-marquee-slow whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 mx-6">
            <span className="text-[#C9A96E] text-xs">✦</span>
            <span className="text-sm font-medium text-[#2D6A4F] tracking-wide">
              {item}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FloristTicker() {
  const doubled = [...florists, ...florists];

  return (
    <div className="overflow-hidden py-4">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((name, i) => (
          <span key={i} className="inline-flex items-center gap-3 mx-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] inline-block" />
            <span className="text-sm text-white/60 font-light tracking-wide">
              {name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
