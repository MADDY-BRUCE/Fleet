import React, { useState } from 'react';
import { Vehicle } from '../types';
import { StatusBadge } from './StatusBadge';
import { TruckIcon } from './Icons';

interface YardMapProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export function YardMap({ vehicles, onSelectVehicle }: YardMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Map 8 bays to vehicles
  const bays = [
    { bayNumber: '01', zone: 'NORTH DOCK', defaultId: 'V101' },
    { bayNumber: '02', zone: 'NORTH DOCK', defaultId: 'V102' },
    { bayNumber: '03', zone: 'EAST WING', defaultId: 'V103' },
    { bayNumber: '04', zone: 'MAINTENANCE SHED', defaultId: 'V104' },
    { bayNumber: '05', zone: 'HEAVY HAUL BAY', defaultId: 'V105' },
    { bayNumber: '06', zone: 'RAPID COURIER DOCK', defaultId: 'V106' },
    { bayNumber: '07', zone: 'RESERVE COMPOUND', defaultId: 'V107' },
    { bayNumber: '08', zone: 'SOUTH APRON', defaultId: 'V108' },
  ];

  const inTransitCount = vehicles.filter((v) => v.status === 'assigned' || v.current_delivery_id).length;

  return (
    <div className="brutal-card p-4 bg-[#FAF8F5]">
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b-2 border-black gap-2">
        <div>
          <div className="text-xs font-mono-data text-[#6B6F72] uppercase tracking-wider">SCHEMATIC CAD-V4 · LIVE SURVEILLANCE</div>
          <h3 className="text-xl font-stencil text-[#111111]">KOVAI CENTRAL YARD · TOP-DOWN DOCK SCHEMATIC</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono-data">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#1F7A4D] border border-black inline-block"></span> PARKED / READY</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FFC20E] border border-black inline-block"></span> ASSIGNED</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FF5A1F] border border-black inline-block"></span> IN TRANSIT</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#6B6F72] border border-black inline-block"></span> MAINTENANCE</span>
        </div>
      </div>

      {/* SVG Yard Map */}
      <div className="relative w-full border-2 border-black bg-[#E2DDCF] p-4 overflow-hidden">
        {/* Animated road perimeter */}
        <div className="absolute inset-2 border-2 border-dashed border-[#8A8477] pointer-events-none rounded-none" />

        {/* Road track badge */}
        <div className="absolute top-3 left-4 bg-black text-[#FFC20E] text-[10px] font-mono-data px-2 py-0.5 border border-black z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          OUTER PERIMETER DISPATCH LANE {inTransitCount > 0 ? `· ACTIVE MOVEMENTS (${inTransitCount})` : '· CLEAR'}
        </div>

        {/* Central Dispatch Office Tower */}
        <div className="my-6 mx-auto max-w-md bg-[#111111] text-[#FAF8F5] border-2 border-black p-3 text-center shadow-[4px_4px_0_#FFC20E]">
          <div className="text-[10px] font-mono-data text-[#FFC20E] tracking-widest uppercase">CENTRAL CONTROL TOWER · YARD DISPATCH</div>
          <div className="font-stencil text-sm text-white tracking-wider">KOVAI LOGISTICS HUB · PLATFORM 4</div>
        </div>

        {/* Bays Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          {bays.map((bay, idx) => {
            const vehicle = vehicles.find((v) => v.vehicle_id === bay.defaultId) || vehicles[idx];
            const isAssigned = vehicle?.status === 'assigned';
            const isMaint = vehicle?.status === 'maintenance';
            const isInactive = vehicle?.status === 'inactive';
            const isAvail = vehicle?.status === 'available';

            let bayBg = 'bg-[#FAF8F5]';
            let borderStyle = 'border-black';
            if (isAvail) bayBg = 'bg-[#EBF7EE] border-[#1F7A4D]';
            if (isAssigned) bayBg = 'bg-[#FFF7D9] border-[#FFC20E]';
            if (isMaint) bayBg = 'bg-[#EAE8E4] border-[#6B6F72]';
            if (isInactive) bayBg = 'bg-[#dedad0] border-[#999] opacity-75';

            return (
              <div
                key={bay.bayNumber}
                onClick={() => {
                  if (vehicle) {
                    setSelectedVehicle(vehicle);
                    onSelectVehicle?.(vehicle);
                  }
                }}
                className={`cursor-pointer border-2 ${borderStyle} ${bayBg} p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]`}
              >
                <div className="flex items-center justify-between border-b border-black/20 pb-1 mb-1.5">
                  <span className="font-stencil text-xs text-black">BAY {bay.bayNumber}</span>
                  <span className="text-[9px] font-mono-data text-[#6B6F72] truncate max-w-[80px]">{bay.zone}</span>
                </div>

                {vehicle ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TruckIcon className="w-3.5 h-3.5 text-black" />
                        <span className="font-mono-data font-bold text-xs text-[#111111]">{vehicle.vehicle_id}</span>
                      </div>
                      <span className="text-[10px] font-mono-data font-semibold bg-black/5 px-1">{vehicle.type}</span>
                    </div>

                    <div className="text-[11px] font-mono-data text-[#111111] font-bold mt-1">
                      {vehicle.registration_no}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/10">
                      <span className="text-[10px] font-mono-data text-[#6B6F72]">{vehicle.capacity} kg</span>
                      <StatusBadge status={vehicle.status} type="vehicle" />
                    </div>

                    {vehicle.current_delivery_id && (
                      <div className="mt-1.5 bg-[#FFC20E] text-[#111111] text-[10px] font-mono-data font-bold px-1.5 py-0.5 border border-black truncate">
                        JOB: {vehicle.current_delivery_id}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs font-mono-data text-[#6B6F72]">BAY VACANT</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Vehicle Detail Drawer */}
      {selectedVehicle && (
        <div className="mt-3 p-3 bg-[#FAF8F5] border-2 border-black flex flex-wrap items-center justify-between gap-3 shadow-[2px_2px_0_#111]">
          <div className="flex items-center gap-3">
            <div className="bg-[#111] text-[#FFC20E] font-stencil p-2 text-base border border-black">
              {selectedVehicle.vehicle_id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-data font-bold text-sm text-[#111]">{selectedVehicle.registration_no}</span>
                <span className="text-xs font-mono-data text-[#6B6F72]">({selectedVehicle.type} · Max Payload: {selectedVehicle.capacity} kg)</span>
              </div>
              <div className="text-xs font-mono-data mt-0.5">
                Current Status: <StatusBadge status={selectedVehicle.status} type="vehicle" />
                {selectedVehicle.current_delivery_id && (
                  <span className="ml-2 font-bold text-[#FF5A1F]">
                    Assigned to: {selectedVehicle.current_delivery_id} {selectedVehicle.current_driver_name ? `(Driver: ${selectedVehicle.current_driver_name})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedVehicle(null)}
            className="brutal-btn px-3 py-1 text-xs font-mono-data text-[#111]"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}
