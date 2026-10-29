import React from 'react';

export function TruckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

export function ForkliftIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M3 17V5h3v12" />
      <path d="M6 12h5l2-3h5v8H6" />
      <path d="M1 17h22v2H1z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M21 7v10" />
    </svg>
  );
}

export function PalletIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="2" y="5" width="20" height="8" rx="0" />
      <path d="M2 13v4h20v-4" />
      <path d="M6 13v4" />
      <path d="M12 13v4" />
      <path d="M18 13v4" />
    </svg>
  );
}

export function SteeringWheelIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <line x1="3.5" y1="17" x2="9.5" y2="13.5" />
      <line x1="20.5" y1="17" x2="14.5" y2="13.5" />
    </svg>
  );
}

export function ClipboardCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="4" y="4" width="16" height="18" rx="0" />
      <path d="M8 2h8v4H8z" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  );
}

export function ShieldAlertIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M12 2l8 4v6c0 5.5-3.5 10-8 12-4.5-2-8-6.5-8-12V6l8-4z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export function BeaconIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M19.07 4.93l-2.83 2.83" />
      <path d="M7 11a5 5 0 0 1 10 0v5H7v-5z" />
      <rect x="5" y="16" width="14" height="4" />
    </svg>
  );
}

export function HazardStripesBar({ className = "h-3 w-full" }: { className?: string }) {
  return <div className={`hazard-stripe-yellow ${className} border-y-2 border-black`} />;
}
