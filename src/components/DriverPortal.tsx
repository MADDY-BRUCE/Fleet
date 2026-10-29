import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User, Driver, Vehicle } from '../types';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { TruckIcon, SteeringWheelIcon } from './Icons';

interface DriverPortalProps {
  user: User;
  onLogout: () => void;
}

export function DriverPortal({ user, onLogout }: DriverPortalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const res = await api.getMe();
      setData(res);
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: err.message || 'Failed to load driver manifest' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async () => {
    if (!data?.driver) return;
    const current = data.driver.availability_status;
    const nextStatus = current === 'available' ? 'unavailable' : 'available';

    setActionLoading(true);
    setAlertMessage(null);

    try {
      await api.updateDriverAvailability(data.driver.driver_id, nextStatus);
      setAlertMessage({
        type: 'success',
        text: `Status successfully updated to ${nextStatus.toUpperCase()}`,
      });
      await loadData();
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Cannot change availability while on an active delivery assignment.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTripStatus = async (deliveryId: string, nextStatus: 'in_transit' | 'delivered') => {
    setActionLoading(true);
    setAlertMessage(null);

    try {
      await api.updateDeliveryStatus(deliveryId, nextStatus);
      setAlertMessage({
        type: 'success',
        text: nextStatus === 'delivered'
          ? 'Delivery completed! Vehicle and driver safely released to yard pool.'
          : 'Trip started! Status updated to In Transit.',
      });
      await loadData();
    } catch (err: any) {
      setAlertMessage({
        type: 'error',
        text: err.message || 'Failed to update delivery status',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9E4D8] flex items-center justify-center p-6">
        <div className="brutal-card p-6 font-mono-data text-sm flex items-center gap-3">
          <SteeringWheelIcon className="w-5 h-5 animate-spin" />
          <span>CONNECTING TO KOVAI DRIVER GATE...</span>
        </div>
      </div>
    );
  }

  const driver = data?.driver as Driver;
  const activeJob = data?.activeJob;
  const fleetBoard = (data?.fleetBoard || []) as Vehicle[];
  const history = data?.history || [];

  return (
    <div className="min-h-screen bg-[#E9E4D8] text-[#111111] pb-16">
      {/* Hazard Header Stripe */}
      <div className="h-2 w-full hazard-stripe-yellow border-b-2 border-black" />

      {/* Driver Header */}
      <header className="border-b-2 border-black bg-[#FAF8F5] px-4 py-3 sticky top-0 z-30 shadow-[0_2px_0_#111]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FFC20E] border-2 border-black flex items-center justify-center font-stencil text-base text-black">
              {driver?.driver_id || 'DR'}
            </div>
            <div>
              <div className="text-[10px] font-mono-data text-[#6B6F72]">KOVAI DRIVER PORTAL</div>
              <h1 className="font-stencil text-base sm:text-lg text-[#111] leading-none">
                {driver?.name?.toUpperCase()} · {driver?.driver_id}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="brutal-btn px-3 py-1 text-xs font-mono-data font-bold text-[#111] bg-white hover:bg-red-50"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* User Alert Banner */}
        {alertMessage && (
          <div
            className={`border-2 p-3 font-mono-data text-xs flex items-center justify-between ${
              alertMessage.type === 'error'
                ? 'bg-red-100 border-[#B3261E] text-[#B3261E]'
                : 'bg-emerald-100 border-[#1F7A4D] text-[#1F7A4D]'
            }`}
          >
            <span>{alertMessage.type === 'error' ? '⚠️' : '✅'} {alertMessage.text}</span>
            <button onClick={() => setAlertMessage(null)} className="font-bold underline ml-2">
              DISMISS
            </button>
          </div>
        )}

        {/* 1. MY DRIVER CARD (MODEL 2) */}
        <section className="brutal-card p-5 bg-[#FAF8F5]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <SteeringWheelIcon className="w-5 h-5 text-black" />
              <span className="font-stencil text-sm">MY DRIVER CARD · MODEL 2</span>
            </div>
            <StatusBadge status={driver?.availability_status || 'available'} type="driver" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-mono-data text-[#6B6F72] block">CALLSIGN / NAME</span>
              <span className="font-mono-data font-bold text-sm text-[#111]">{driver?.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono-data text-[#6B6F72] block">CREW ID</span>
              <span className="font-mono-data font-bold text-sm text-[#111]">{driver?.driver_id}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono-data text-[#6B6F72] block">COMMUNICATION PHONE</span>
              <span className="font-mono-data font-bold text-sm text-[#111]">{driver?.phone}</span>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="mt-4 pt-3 border-t-2 border-dashed border-black/20 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono-data text-[#6B6F72]">
              DUTY STATUS: <strong>{driver?.availability_status?.toUpperCase()}</strong>
              {activeJob && ' (LOCKED WHILE ON ACTIVE RUN)'}
            </span>

            <button
              onClick={handleToggleAvailability}
              disabled={actionLoading || driver?.availability_status === 'assigned'}
              className={`brutal-btn px-4 py-2 text-xs font-mono-data font-bold ${
                driver?.availability_status === 'available'
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-black'
                  : 'brutal-btn-success'
              }`}
            >
              {actionLoading
                ? 'UPDATING...'
                : driver?.availability_status === 'available'
                ? 'GO OFF-DUTY (UNAVAILABLE)'
                : 'CLOCK ON-DUTY (AVAILABLE)'}
            </button>
          </div>
        </section>

        {/* 2. MY ASSIGNED VEHICLE (MODEL 1) */}
        <section className="brutal-card p-5 bg-[#FAF8F5]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-black" />
              <span className="font-stencil text-sm">MY ASSIGNED VEHICLE · MODEL 1</span>
            </div>
            {activeJob?.vehicle ? (
              <StatusBadge status={activeJob.vehicle.status} type="vehicle" />
            ) : (
              <span className="text-xs font-mono-data font-bold text-[#6B6F72]">NO VEHICLE ATTACHED</span>
            )}
          </div>

          {activeJob?.vehicle ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#FFF7D9] border-2 border-black shadow-[2px_2px_0_#111]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] block">VEHICLE ID</span>
                <span className="font-stencil text-base text-black">{activeJob.vehicle.vehicle_id}</span>
              </div>
              <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#111]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] block">REGISTRATION</span>
                <span className="font-mono-data font-bold text-sm text-black">{activeJob.vehicle.registration_no}</span>
              </div>
              <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#111]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] block">TYPE</span>
                <span className="font-mono-data font-bold text-sm text-black">{activeJob.vehicle.type}</span>
              </div>
              <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0_#111]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] block">MAX CAPACITY</span>
                <span className="font-mono-data font-bold text-sm text-black">{activeJob.vehicle.capacity} kg</span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-[#EAE8E4] border-2 border-dashed border-black text-center">
              <span className="font-stencil text-lg text-[#6B6F72] block">ON STANDBY AT KOVAI YARD</span>
              <p className="font-mono-data text-xs text-[#6B6F72] mt-1">
                No vehicle currently assigned. Dispatcher will assign an eligible vehicle when a delivery manifest is matched to you.
              </p>
            </div>
          )}
        </section>

        {/* 3. MY CURRENT JOB (DELIVERY MANIFEST) */}
        <section className="brutal-card-lg p-5 bg-[#FAF8F5]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
            <div>
              <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase">LIVE MANIFEST TICKET</span>
              <h3 className="font-stencil text-lg text-black">MY CURRENT JOB</h3>
            </div>
            {activeJob && (
              <div className="flex items-center gap-2">
                <PriorityBadge priority={activeJob.priority} />
                <StatusBadge status={activeJob.status} />
              </div>
            )}
          </div>

          {activeJob ? (
            <div className="space-y-4">
              <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0_#111] ticket-edge-left pl-6">
                <div className="flex items-center justify-between pb-2 border-b border-black/20 text-xs font-mono-data">
                  <span className="font-bold">MANIFEST: {activeJob.delivery_id}</span>
                  <span>EST. TIME: {activeJob.scheduled_time}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="p-2.5 bg-yellow-50 border border-black">
                    <span className="text-[10px] font-mono-data text-[#6B6F72] block">PICKUP LOCATION</span>
                    <span className="font-stencil text-base text-black">{activeJob.pickup}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-black">
                    <span className="text-[10px] font-mono-data text-[#6B6F72] block">DROPOFF DESTINATION</span>
                    <span className="font-stencil text-base text-[#1F7A4D]">{activeJob.dropoff}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-mono-data text-[#6B6F72]">
                  <span>VEHICLE: {activeJob.vehicle.registration_no} ({activeJob.vehicle.type})</span>
                  <span>ASSIGNMENT ID: {activeJob.assignment_id}</span>
                </div>
              </div>

              {/* ACTION BUTTONS (MOBILE THUMB-SIZED) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeJob.status === 'assigned' && (
                  <button
                    onClick={() => handleUpdateTripStatus(activeJob.delivery_id, 'in_transit')}
                    disabled={actionLoading}
                    className="w-full brutal-btn brutal-btn-primary py-3.5 font-stencil text-base text-black flex items-center justify-center gap-2"
                  >
                    <TruckIcon className="w-5 h-5 text-black" />
                    <span>START TRIP (DEPART YARD)</span>
                  </button>
                )}

                {activeJob.status === 'in_transit' && (
                  <button
                    onClick={() => handleUpdateTripStatus(activeJob.delivery_id, 'delivered')}
                    disabled={actionLoading}
                    className="w-full brutal-btn brutal-btn-success py-3.5 font-stencil text-base text-white flex items-center justify-center gap-2"
                  >
                    <span>✔ MARK DELIVERED (RELEASE FLEET)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-mono-data text-[#6B6F72] border-2 border-dashed border-black/40">
              NO ACTIVE DELIVERY ASSIGNED · RESTING IN CREW LOUNGE
            </div>
          )}
        </section>

        {/* 4. READ-ONLY FLEET BOARD */}
        <section className="brutal-card p-5 bg-[#FAF8F5]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <span className="font-stencil text-sm">YARD FLEET BOARD (READ-ONLY)</span>
            <span className="text-[10px] font-mono-data text-[#6B6F72]">ALL KOVAI ASSETS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-[#E2DDCF]">
                  <th className="p-2">ID</th>
                  <th className="p-2">REGISTRATION</th>
                  <th className="p-2">TYPE</th>
                  <th className="p-2">CAPACITY</th>
                  <th className="p-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fleetBoard.map((veh) => (
                  <tr key={veh.vehicle_id} className="border-b border-black/10 hover:bg-[#FFF7D9]">
                    <td className="p-2 font-bold">{veh.vehicle_id}</td>
                    <td className="p-2">{veh.registration_no}</td>
                    <td className="p-2">{veh.type}</td>
                    <td className="p-2">{veh.capacity} kg</td>
                    <td className="p-2">
                      <StatusBadge status={veh.status} type="vehicle" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. MY TRIP HISTORY */}
        <section className="brutal-card p-5 bg-[#FAF8F5]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <span className="font-stencil text-sm">MY COMPLETED TRIPS</span>
            <span className="text-[10px] font-mono-data text-[#6B6F72]">HISTORICAL LOGS</span>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-data text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#E2DDCF]">
                    <th className="p-2">DELIVERY</th>
                    <th className="p-2">ROUTE</th>
                    <th className="p-2">VEHICLE</th>
                    <th className="p-2">COMPLETED AT</th>
                    <th className="p-2">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.assignment_id} className="border-b border-black/10">
                      <td className="p-2 font-bold">{h.delivery_id}</td>
                      <td className="p-2">{h.pickup} &rarr; {h.dropoff}</td>
                      <td className="p-2">{h.registration_no} ({h.vehicle_type})</td>
                      <td className="p-2 text-[#6B6F72]">{h.released_at ? new Date(h.released_at).toLocaleTimeString() : '-'}</td>
                      <td className="p-2">
                        <StatusBadge status={h.final_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-xs font-mono-data text-[#6B6F72]">
              NO COMPLETED TRIPS YET TODAY
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
