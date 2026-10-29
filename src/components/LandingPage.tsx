import React from 'react';
import { TruckIcon, ForkliftIcon, PalletIcon, SteeringWheelIcon, BeaconIcon } from './Icons';

interface LandingPageProps {
  onOpenDriverLogin: () => void;
  onOpenAdminLogin: () => void;
}

export function LandingPage({ onOpenDriverLogin, onOpenAdminLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#E9E4D8] text-[#111111] overflow-x-hidden">
      {/* Top Banner Hazard Stripe */}
      <div className="h-3 w-full hazard-stripe-yellow border-b-2 border-black" />

      {/* Top Navigation Bar */}
      <header className="border-b-2 border-black bg-[#FAF8F5] px-4 sm:px-8 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFC20E] border-2 border-black flex items-center justify-center font-stencil text-xl text-black shadow-[2px_2px_0_#111]">
              FW
            </div>
            <div>
              <span className="font-stencil text-2xl tracking-tight text-[#111111]">FLEETWISE</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono-data text-[#6B6F72] border-l-2 border-black pl-2">
                KOVAI CENTRAL DISPATCH YARD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onOpenDriverLogin}
              className="brutal-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-stencil text-[#111111] bg-[#FAF8F5] hover:bg-yellow-50 flex items-center gap-1.5"
            >
              <SteeringWheelIcon className="w-4 h-4 text-[#111111]" />
              <span>DRIVER GATE</span>
            </button>
            <button
              onClick={onOpenAdminLogin}
              className="brutal-btn brutal-btn-primary px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-stencil flex items-center gap-1.5"
            >
              <TruckIcon className="w-4 h-4 text-[#111111]" />
              <span>ADMIN CONTROL ROOM</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO WITH ANIMATED SVG/CSS WAREHOUSE SCENE */}
      <section className="border-b-2 border-black bg-[#E2DDCF] pt-8 pb-12 px-4 sm:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Tagline kicker without contest mention */}
          <div className="inline-flex items-center gap-2 bg-[#111111] text-[#FFC20E] px-3 py-1 text-xs font-mono-data uppercase mb-4 border border-black shadow-[2px_2px_0_#111]">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-ping" />
            OFFICIAL LOGISTICS PROTOCOL · REGIONAL DISPATCH TERMINAL
          </div>

          <h1 className="font-stencil text-4xl sm:text-6xl md:text-8xl tracking-tight text-[#111111] leading-[0.9] max-w-5xl">
            THE YARD NEVER SLEEPS.
          </h1>

          <p className="mt-4 text-base sm:text-xl font-mono-data text-[#111111] max-w-3xl font-semibold">
            Every van accounted for. Every driver on the clock. Continuous regional dispatch.
          </p>

          {/* Interactive Industrial Animated Scene */}
          <div className="mt-8 border-3 border-black bg-[#1A1A1A] text-white p-4 sm:p-6 shadow-[8px_8px_0_#111] relative overflow-hidden">
            {/* Top Scene Barcode & Callsign */}
            <div className="flex items-center justify-between pb-3 border-b border-white/20 mb-4 text-xs font-mono-data">
              <span className="text-[#FFC20E] flex items-center gap-2">
                <BeaconIcon className="w-4 h-4 animate-spin text-[#FFC20E]" />
                ZONE 4 AIRFIELD & TRUCKWAY FEED
              </span>
              <div className="w-32 barcode-visual invert" />
              <span className="hidden sm:inline text-white/60">CAMERA ID: CAM-04-BAY-OVERVIEW</span>
            </div>

            {/* Warehouse Silhouette + Conveyor + Moving Trucks */}
            <div className="relative h-48 sm:h-64 w-full bg-[#111111] border-2 border-white/20 overflow-hidden flex flex-col justify-between">
              {/* Warehouse Silhouette Roofline */}
              <div className="w-full h-24 bg-[#222222] border-b-2 border-white/20 relative flex items-end justify-around px-2">
                <div className="w-20 sm:w-28 h-20 bg-[#2b2b2b] border-t-2 border-x-2 border-white/30 flex flex-col items-center justify-end pb-1">
                  <div className="w-12 h-14 bg-[#FFC20E]/20 border border-[#FFC20E]/40 flex items-center justify-center text-[10px] font-mono-data text-[#FFC20E]">
                    BAY 01
                  </div>
                </div>
                <div className="w-20 sm:w-28 h-24 bg-[#333333] border-t-2 border-x-2 border-white/30 flex flex-col items-center justify-end pb-1">
                  <div className="w-12 h-16 bg-[#1F7A4D]/20 border border-[#1F7A4D]/40 flex items-center justify-center text-[10px] font-mono-data text-[#55f29f]">
                    BAY 02
                  </div>
                </div>
                <div className="w-20 sm:w-28 h-18 bg-[#282828] border-t-2 border-x-2 border-white/30 flex flex-col items-center justify-end pb-1">
                  <div className="w-12 h-12 bg-[#FF5A1F]/20 border border-[#FF5A1F]/40 flex items-center justify-center text-[10px] font-mono-data text-[#FF5A1F]">
                    BAY 03
                  </div>
                </div>
                <div className="w-20 sm:w-28 h-22 bg-[#303030] border-t-2 border-x-2 border-white/30 flex flex-col items-center justify-end pb-1">
                  <div className="w-12 h-14 bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-mono-data text-white">
                    BAY 04
                  </div>
                </div>
              </div>

              {/* Conveyor Belt with Moving Cargo Boxes */}
              <div className="relative h-8 bg-[#1f1f1f] border-y-2 border-black flex items-center overflow-hidden">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#333,#333_10px,#222_10px,#222_20px)] animate-[moveStripes_2s_linear_infinite]" />
                <div className="relative z-10 flex items-center gap-12 animate-[moveStripes_6s_linear_infinite] whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-[#FFC20E] text-black font-mono-data text-[10px] font-bold border border-black shadow-[1px_1px_0_#000]">
                    📦 COV-PARCEL-902
                  </span>
                  <span className="px-2 py-0.5 bg-[#FAF8F5] text-black font-mono-data text-[10px] font-bold border border-black shadow-[1px_1px_0_#000]">
                    📦 CHE-EXPRESS-11
                  </span>
                  <span className="px-2 py-0.5 bg-[#FF5A1F] text-white font-mono-data text-[10px] font-bold border border-black shadow-[1px_1px_0_#000]">
                    ⚠️ COLD-STORE-4
                  </span>
                  <span className="px-2 py-0.5 bg-[#1F7A4D] text-white font-mono-data text-[10px] font-bold border border-black shadow-[1px_1px_0_#000]">
                    📦 BLR-HEAVY-03
                  </span>
                </div>
              </div>

              {/* Road Lane with Moving Trucks */}
              <div className="h-16 bg-[#161616] relative flex items-center border-t-2 border-white/20 overflow-hidden">
                <div className="w-full border-t border-dashed border-yellow-500/50 absolute top-1/2 -translate-y-1/2" />
                <div className="flex items-center gap-24 animate-[moveStripes_9s_linear_infinite] whitespace-nowrap relative z-10">
                  <div className="flex items-center gap-1.5 bg-[#FFC20E] text-black px-2 py-1 border border-black font-mono-data text-xs font-bold shadow-[2px_2px_0_#000]">
                    <TruckIcon className="w-4 h-4 text-black" />
                    <span>VAN V101 [TN38AB1234]</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#FAF8F5] text-black px-2 py-1 border border-black font-mono-data text-xs font-bold shadow-[2px_2px_0_#000]">
                    <TruckIcon className="w-4 h-4 text-black" />
                    <span>TRUCK V102 [TN37CD5678]</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#FF5A1F] text-white px-2 py-1 border border-black font-mono-data text-xs font-bold shadow-[2px_2px_0_#000]">
                    <TruckIcon className="w-4 h-4 text-white" />
                    <span>MINI-TRUCK V103</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Yard Status Bar (replacing the two duplicate buttons) */}
            <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-data">
              <div className="flex items-center gap-2 text-white/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DISPATCH TERMINAL OPERATIONAL · 8 LOADING BAYS MONITORED</span>
              </div>
              <div className="flex items-center gap-3 text-[#FFC20E]">
                <span>WEIGHBRIDGE: ONLINE</span>
                <span>·</span>
                <span>TELEMETRY: SYNCHRONIZED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: LIVE SCOREBOARD COUNTER STRIP */}
      <section className="bg-[#111111] text-[#FAF8F5] border-b-2 border-black py-6 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div className="p-3 border-r-0 lg:border-r border-white/20">
            <div className="font-stencil text-2xl sm:text-3xl text-[#FFC20E]">1,200,000</div>
            <div className="text-[11px] font-mono-data text-white/70 uppercase mt-0.5">SQ FT WAREHOUSE FLOOR</div>
          </div>
          <div className="p-3 border-r-0 lg:border-r border-white/20">
            <div className="font-stencil text-2xl sm:text-3xl text-white">850</div>
            <div className="text-[11px] font-mono-data text-white/70 uppercase mt-0.5">TRUCKS ACROSS REGION</div>
          </div>
          <div className="p-3 border-r-0 lg:border-r border-white/20">
            <div className="font-stencil text-2xl sm:text-3xl text-[#55f29f]">24/7 / 365</div>
            <div className="text-[11px] font-mono-data text-white/70 uppercase mt-0.5">ACTIVE DISPATCH COVERAGE</div>
          </div>
          <div className="p-3 border-r-0 lg:border-r border-white/20">
            <div className="font-stencil text-2xl sm:text-3xl text-white">4,000+</div>
            <div className="text-[11px] font-mono-data text-white/70 uppercase mt-0.5">PARCELS DISPATCHED DAILY</div>
          </div>
          <div className="p-3 col-span-2 sm:col-span-1 bg-[#1F7A4D]/30 border border-[#1F7A4D]">
            <div className="font-stencil text-2xl sm:text-3xl text-[#55f29f]">99.8%</div>
            <div className="text-[11px] font-mono-data text-[#55f29f] font-bold uppercase mt-0.5">
              ON-TIME YARD DISPATCH RATE
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WAREHOUSE & INFRASTRUCTURE CAPABILITIES (Clean filler without backend logic leaks) */}
      <section className="py-12 px-4 sm:px-8 border-b-2 border-black bg-[#FAF8F5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-mono-data text-[#6B6F72] uppercase tracking-wider">LOGISTICS EXCELLENCE</div>
            <h2 className="font-stencil text-3xl sm:text-4xl text-[#111111]">
              INTEGRATED FREIGHT TERMINAL CAPABILITIES
            </h2>
            <p className="font-mono-data text-sm text-[#6B6F72] mt-1 max-w-2xl mx-auto">
              Engineered for seamless transshipment, strict turnaround times, and high-throughput regional delivery networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="brutal-card p-5 bg-white">
              <div className="w-10 h-10 bg-[#FFC20E] border-2 border-black flex items-center justify-center font-stencil mb-3 shadow-[2px_2px_0_#111]">
                <TruckIcon className="w-5 h-5 text-black" />
              </div>
              <h3 className="font-stencil text-lg text-black mb-1">MULTI-CLASS FLEET READY</h3>
              <p className="font-mono-data text-xs text-[#6B6F72] leading-relaxed">
                Accommodating heavy multi-axle freight trucks, medium city delivery vans, and rapid urban courier bikes with dedicated apron docking bays.
              </p>
              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono-data text-black font-semibold">
                <span>PAYLOAD RANGE</span>
                <span>40 KG – 7,500 KG</span>
              </div>
            </div>

            <div className="brutal-card p-5 bg-white">
              <div className="w-10 h-10 bg-[#1F7A4D] text-white border-2 border-black flex items-center justify-center font-stencil mb-3 shadow-[2px_2px_0_#111]">
                <PalletIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-stencil text-lg text-black mb-1">PRECISION CARGO STAGING</h3>
              <p className="font-mono-data text-xs text-[#6B6F72] leading-relaxed">
                Automated sortation lanes and barcoded pallet staging bays ensure cargo is pre-screened, weighed, and staged before vehicle bay docking.
              </p>
              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono-data text-black font-semibold">
                <span>AVERAGE DOCK TIME</span>
                <span>&lt; 18 MINUTES</span>
              </div>
            </div>

            <div className="brutal-card p-5 bg-white">
              <div className="w-10 h-10 bg-[#FF5A1F] text-white border-2 border-black flex items-center justify-center font-stencil mb-3 shadow-[2px_2px_0_#111]">
                <BeaconIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-stencil text-lg text-black mb-1">REGIONAL CORRIDOR COVERAGE</h3>
              <p className="font-mono-data text-xs text-[#6B6F72] leading-relaxed">
                Direct arterial links connecting Coimbatore to Chennai, Bengaluru, Salem, Kochi, and Madurai with round-the-clock dispatch readiness.
              </p>
              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono-data text-black font-semibold">
                <span>OPERATING RADIUS</span>
                <span>INTER-STATE 600 KM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: INSIDE THE YARD (ZONES TOUR) */}
      <section className="py-12 px-4 sm:px-8 border-b-2 border-black bg-[#E2DDCF]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-mono-data text-[#6B6F72] uppercase tracking-wider">FACILITY SPECIFICATIONS</div>
            <h2 className="font-stencil text-3xl sm:text-4xl text-[#111111]">
              INSIDE KOVAI CENTRAL DISPATCH YARD
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="brutal-card p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-[#1F7A4D]">ZONE 01</span>
                <span className="font-mono-data text-[10px] bg-black text-white px-1.5 py-0.5">COLD STORAGE</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">PHARMA & PERISHABLES BAY</h4>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                Sub-zero temperature-monitored holding bays with priority express loading slots.
              </p>
            </div>

            <div className="brutal-card p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-[#FFC20E]">ZONE 02</span>
                <span className="font-mono-data text-[10px] bg-black text-white px-1.5 py-0.5">BULK APRON</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">HEAVY FREIGHT & TRUCK BAY</h4>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                Equipped for 7,500 kg multi-axle freight carriers and inter-state logistics corridors.
              </p>
            </div>

            <div className="brutal-card p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-[#FF5A1F]">ZONE 03</span>
                <span className="font-mono-data text-[10px] bg-black text-white px-1.5 py-0.5">FAST-LINE</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">EXPRESS COURIER & BIKE DOCK</h4>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                Rapid 15-minute dispatch turnarounds for urgent urban micro-deliveries and documents.
              </p>
            </div>

            <div className="brutal-card p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-[#6B6F72]">ZONE 04</span>
                <span className="font-mono-data text-[10px] bg-black text-white px-1.5 py-0.5">WORKSHOP</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">MAINTENANCE & INSPECTION SHED</h4>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                On-site vehicle diagnostic bay and fleet servicing facility maintaining vehicle roadworthiness.
              </p>
            </div>

            <div className="brutal-card p-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-[#111]">ZONE 05</span>
                <span className="font-mono-data text-[10px] bg-black text-white px-1.5 py-0.5">CONTROL</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">NIGHT SHIFT CONTROL TOWER</h4>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                Round-the-clock operations coordination monitoring loading aprons and vehicle check-ins.
              </p>
            </div>

            <div className="brutal-card p-4 bg-[#FFC20E]/20 border-black">
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <span className="font-stencil text-xs text-black">ZONE 06</span>
                <span className="font-mono-data text-[10px] bg-black text-[#FFC20E] px-1.5 py-0.5">SAFETY</span>
              </div>
              <h4 className="font-stencil text-lg text-[#111]">SAFETY PROTOCOL COMPLIANCE</h4>
              <p className="font-mono-data text-xs text-[#111] font-semibold mt-1">
                Enforcing strict weighbridge calibration, driver rest periods, and pre-departure cargo checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#FAF8F5] border-t-2 border-black py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FFC20E] border border-black flex items-center justify-center font-stencil text-xs">
              FW
            </div>
            <span className="font-stencil text-sm text-[#111]">FLEETWISE DISPATCH ENGINE</span>
            <span className="text-xs font-mono-data text-[#6B6F72]">· Centralized Fleet & Warehouse Operations</span>
          </div>
          <div className="text-xs font-mono-data text-[#6B6F72]">
            Kovai Central Dispatch Yard · Coimbatore, Tamil Nadu
          </div>
        </div>
      </footer>
    </div>
  );
}
