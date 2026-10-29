import React from 'react';

export function StatusBadge({ status, type = 'delivery' }: { status: string; type?: 'delivery' | 'vehicle' | 'driver' }) {
  const norm = status?.toLowerCase() || '';

  if (norm === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono-data uppercase bg-[#1F7A4D] text-[#FAF8F5] border border-black shadow-[2px_2px_0_#111]">
        <span className="w-1.5 h-1.5 bg-[#55f29f] rounded-none"></span>
        AVAILABLE
      </span>
    );
  }

  if (norm === 'assigned') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono-data uppercase bg-[#FFC20E] text-[#111111] border border-black shadow-[2px_2px_0_#111]">
        <span className="w-1.5 h-1.5 bg-black rounded-none"></span>
        ASSIGNED
      </span>
    );
  }

  if (norm === 'in_transit') {
    return (
      <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono-data uppercase text-white border border-black shadow-[2px_2px_0_#111] hazard-stripe-orange-animated">
        <span className="relative z-10 bg-black/80 px-1 py-0.5 text-white text-[10px]">
          IN TRANSIT
        </span>
      </span>
    );
  }

  if (norm === 'delivered') {
    return (
      <span className="stamp stamp-green bg-[#E8F5E9] shadow-[1px_1px_0_#1F7A4D]">
        DELIVERED
      </span>
    );
  }

  if (norm === 'cancelled') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono-data uppercase bg-[#6B6F72] text-[#FAF8F5] line-through border border-black">
        CANCELLED
      </span>
    );
  }

  if (norm === 'maintenance') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-mono-data uppercase bg-[#6B6F72] text-yellow-300 border border-black shadow-[2px_2px_0_#111]">
        <span className="text-[10px]">⚠️</span>
        MAINTENANCE
      </span>
    );
  }

  if (norm === 'inactive' || norm === 'unavailable') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold font-mono-data uppercase bg-[#d9d5cd] text-[#6B6F72] border border-[#6B6F72]">
        {norm.toUpperCase()}
      </span>
    );
  }

  if (norm === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold font-mono-data uppercase bg-white text-[#111111] border border-black shadow-[2px_2px_0_#111]">
        <span className="w-1.5 h-1.5 bg-yellow-500 animate-pulse rounded-none"></span>
        PENDING
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-xs font-mono-data border border-black bg-white">
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const norm = priority?.toLowerCase() || '';

  if (norm === 'urgent') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black font-stencil uppercase bg-[#FF5A1F] text-white border border-black shadow-[2px_2px_0_#111] tracking-wider">
        URGENT
      </span>
    );
  }

  if (norm === 'high') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold font-stencil uppercase bg-[#FFC20E] text-[#111111] border border-black shadow-[2px_2px_0_#111] tracking-wider">
        HIGH
      </span>
    );
  }

  if (norm === 'medium') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold font-stencil uppercase bg-[#FAF8F5] text-[#111111] border border-black tracking-wider">
        MEDIUM
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium font-stencil uppercase bg-[#E9E4D8] text-[#6B6F72] border border-black tracking-wider">
      LOW
    </span>
  );
}
