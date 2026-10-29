import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Vehicle, Driver, Delivery, Assignment, AuditLog, DashboardStats, TestSuiteSummary } from '../types';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { YardMap } from './YardMap';
import { TruckIcon, SteeringWheelIcon, PalletIcon, ClipboardCheckIcon, ShieldAlertIcon } from './Icons';
import { DriverEnrollModal, DriverDossierModal } from './DriverManagementModal';

interface AdminPortalProps {
  onLogout: () => void;
}

export function AdminPortal({ onLogout }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'ops' | 'deliveries' | 'assignments' | 'fleet' | 'tests' | 'walkthrough' | 'audit'>('ops');
  
  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Driver modal states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [viewingDriverDossier, setViewingDriverDossier] = useState<Driver | null>(null);

  // Notifications / Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Forms states
  const [newDelivery, setNewDelivery] = useState({ pickup: '', dropoff: '', scheduled_time: '10:00 AM', priority: 'High' });
  const [newVehicle, setNewVehicle] = useState({ registration_no: '', type: 'Van', capacity: 1000 });
  const [newDriver, setNewDriver] = useState({ driver_id: '', name: '', phone: '' });

  // Assignment Console state
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentConflictAlert, setAssignmentConflictAlert] = useState<{ error: string; message: string } | null>(null);

  // Test suite runner state
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [testsRunning, setTestsRunning] = useState(false);

  // Judge Walkthrough state
  const [walkthroughStep, setWalkthroughStep] = useState(1);
  const [walkthroughLogs, setWalkthroughLogs] = useState<Array<{ step: number; title: string; response: any; time: string }>>([]);
  const [walkthroughExecuting, setWalkthroughExecuting] = useState(false);

  // Filters for deliveries
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('');
  const [deliveryPriorityFilter, setDeliveryPriorityFilter] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');

  const refreshAll = async () => {
    try {
      const [vList, dList, delList, aList, sData, logs] = await Promise.all([
        api.getVehicles(),
        api.getDrivers(),
        api.getDeliveries({ status: deliveryStatusFilter, priority: deliveryPriorityFilter, search: deliverySearch }),
        api.getAssignments(),
        api.getStats(),
        api.getAudit(),
      ]);
      setVehicles(vList);
      setDrivers(dList);
      setDeliveries(delList);
      setAssignments(aList);
      setStats(sData);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 6000);
    return () => clearInterval(interval);
  }, [deliveryStatusFilter, deliveryPriorityFilter, deliverySearch]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  // Create Delivery Handler
  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createDelivery(newDelivery);
      showToast('success', `Delivery ${res.delivery_id} registered into manifest`);
      setNewDelivery({ pickup: '', dropoff: '', scheduled_time: '10:00 AM', priority: 'High' });
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create delivery');
    }
  };

  // Create Vehicle Handler
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createVehicle(newVehicle);
      showToast('success', `Vehicle ${res.vehicle_id} (${res.registration_no}) added to fleet`);
      setNewVehicle({ registration_no: '', type: 'Van', capacity: 1000 });
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create vehicle');
    }
  };

  // Create Driver Handler
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createDriver(newDriver);
      showToast('success', `Driver ${res.name} (${res.driver_id}) enrolled in crew`);
      setNewDriver({ driver_id: '', name: '', phone: '' });
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to enroll driver');
    }
  };

  // Toggle Vehicle Status (maintenance, inactive, available)
  const handleVehicleStatusChange = async (vehicleId: string, status: string) => {
    try {
      await api.updateVehicleStatus(vehicleId, status);
      showToast('success', `Vehicle ${vehicleId} status set to ${status.toUpperCase()}`);
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Cannot change status of an active vehicle');
    }
  };

  // Toggle Driver Availability
  const handleDriverAvailabilityChange = async (driverId: string, status: string) => {
    try {
      await api.updateDriverAvailability(driverId, status);
      showToast('success', `Driver ${driverId} availability set to ${status.toUpperCase()}`);
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Cannot change availability of an active driver');
    }
  };

  // Cancel Delivery
  const handleCancelDelivery = async (deliveryId: string) => {
    if (!confirm(`Are you sure you want to cancel delivery ${deliveryId}? Any attached vehicle and driver will be released.`)) return;
    try {
      await api.updateDeliveryStatus(deliveryId, 'cancelled');
      showToast('success', `Delivery ${deliveryId} cancelled and resources released.`);
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Cannot cancel delivery in transit');
    }
  };

  // Atomic Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliveryId || !selectedVehicleId || !selectedDriverId) {
      showToast('error', 'Please select a pending delivery, eligible vehicle, and eligible driver.');
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentConflictAlert(null);

    try {
      const res = await api.assignDelivery(selectedDeliveryId, selectedVehicleId, selectedDriverId);
      showToast('success', `Success: Assignment ${res.assignment_id} committed! Delivery ${selectedDeliveryId} locked to Vehicle ${selectedVehicleId} & Driver ${selectedDriverId}.`);
      setSelectedDeliveryId('');
      setSelectedVehicleId('');
      setSelectedDriverId('');
      refreshAll();
    } catch (err: any) {
      setAssignmentConflictAlert({
        error: err.error || 'ASSIGNMENT_REJECTED',
        message: err.message || 'Assignment failed due to conflict.',
      });
      showToast('error', `CONFLICT: ${err.message}`);
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // Dispatch Recommendation helper
  const handleRecommendForDelivery = async (deliveryId: string) => {
    try {
      const rec = await api.recommendAssignment(deliveryId);
      if (rec.recommendedVehicle && rec.recommendedDriver) {
        setSelectedDeliveryId(deliveryId);
        setSelectedVehicleId(rec.recommendedVehicle.vehicle_id);
        setSelectedDriverId(rec.recommendedDriver.driver_id);
        setActiveTab('assignments');
        showToast('success', `Recommended ${rec.recommendedVehicle.vehicle_id} (${rec.recommendedVehicle.type}) & Driver ${rec.recommendedDriver.name}`);
      } else {
        showToast('error', 'No eligible vehicle and driver pair currently available in yard.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to generate recommendation');
    }
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    if (!confirm('RESET FACTORY SEED DATA?\nThis will clear current assignments and restore 8 vehicles, 6 drivers, and 7 pending deliveries.')) return;
    try {
      await api.resetDemo();
      showToast('success', 'Demo data reset to factory state successfully.');
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset demo data');
    }
  };

  // Run Rule Tests
  const handleRunRuleTests = async () => {
    setTestsRunning(true);
    try {
      const summary = await api.runTests();
      setTestSummary(summary);
      showToast(summary.allPassed ? 'success' : 'error', `Test suite completed: ${summary.passed}/${summary.total} passed`);
    } catch (err: any) {
      showToast('error', err.message || 'Test suite execution error');
    } finally {
      setTestsRunning(false);
    }
  };

  // Judge Walkthrough Runner (acceptance walkthrough)
  const handleRunWalkthroughStep = async (step: number) => {
    setWalkthroughExecuting(true);
    const time = new Date().toLocaleTimeString();

    try {
      if (step === 1) {
        // Step 1: Valid assignment DL101 + V101 + D101
        const res = await api.assignDelivery('DL101', 'V101', 'D101');
        setWalkthroughLogs((prev) => [
          ...prev,
          { step: 1, title: 'Step 1: Valid Assignment (DL101 + V101 + D101)', response: res, time },
        ]);
        setWalkthroughStep(2);
        showToast('success', 'Step 1 Passed: Delivery DL101 assigned to V101 & D101.');
      } else if (step === 2) {
        // Step 2: Attempt reuse same vehicle V101 on DL102
        try {
          await api.assignDelivery('DL102', 'V101', 'D102');
          showToast('error', 'Step 2 Failed: Second assignment should have been rejected!');
        } catch (err: any) {
          setWalkthroughLogs((prev) => [
            ...prev,
            { step: 2, title: 'Step 2: Vehicle Conflict Attempt (DL102 + V101)', response: err, time },
          ]);
          setWalkthroughStep(3);
          showToast('success', `Step 2 Passed: Vehicle conflict rejected (409 ${err.error}).`);
        }
      } else if (step === 3) {
        // Step 3: Attempt reuse same driver D101 on DL103 with V102
        try {
          await api.assignDelivery('DL103', 'V102', 'D101');
          showToast('error', 'Step 3 Failed: Driver conflict should have been rejected!');
        } catch (err: any) {
          setWalkthroughLogs((prev) => [
            ...prev,
            { step: 3, title: 'Step 3: Driver Conflict Attempt (DL103 + D101)', response: err, time },
          ]);
          setWalkthroughStep(4);
          showToast('success', `Step 3 Passed: Driver conflict rejected (409 ${err.error}).`);
        }
      } else if (step === 4) {
        // Step 4: Complete DL101, releasing resources
        await api.updateDeliveryStatus('DL101', 'in_transit');
        const res = await api.updateDeliveryStatus('DL101', 'delivered');
        setWalkthroughLogs((prev) => [
          ...prev,
          { step: 4, title: 'Step 4: Complete DL101 & Automatic Resource Release', response: res, time },
        ]);
        setWalkthroughStep(5);
        showToast('success', 'Step 4 Passed: Delivery delivered; V101 and D101 returned to available!');
      }
      refreshAll();
    } catch (err: any) {
      showToast('error', err.message || 'Walkthrough step failed');
    } finally {
      setWalkthroughExecuting(false);
    }
  };

  // Eligible vehicles & drivers for Assignment Console
  const eligibleVehicles = vehicles.filter((v) => v.status === 'available');
  const eligibleDrivers = drivers.filter((d) => d.availability_status === 'available');
  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending');

  return (
    <div className="min-h-screen bg-[#E9E4D8] text-[#111111] pb-16">
      {/* Top Hazard Stripe */}
      <div className="h-2 w-full hazard-stripe-yellow border-b-2 border-black" />

      {/* Main Admin Header */}
      <header className="border-b-2 border-black bg-[#FAF8F5] px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-[0_2px_0_#111]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FFC20E] border-2 border-black flex items-center justify-center font-stencil text-xl text-black shadow-[2px_2px_0_#111]">
              FW
            </div>
            <div>
              <span className="font-stencil text-lg sm:text-xl text-[#111] leading-none block">
                KOVAI CENTRAL DISPATCH YARD
              </span>
              <span className="text-[10px] font-mono-data text-[#6B6F72]">
                CONTROL ROOM · ROLE: DISPATCH ADMINISTRATOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEnrollModal(true)}
              className="brutal-btn brutal-btn-primary px-3 py-1.5 text-xs font-stencil flex items-center gap-1.5 text-black"
            >
              <span>+</span>
              <span>ENROLL DRIVER</span>
            </button>
            <button
              onClick={handleResetDemoData}
              className="brutal-btn px-2.5 py-1.5 text-xs font-mono-data font-bold text-[#111] bg-[#FAF8F5] hover:bg-yellow-100 flex items-center gap-1"
              title="Reset Database to 8 vehicles, 6 drivers, 7 deliveries"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">RESET DEMO</span>
            </button>
            <button
              onClick={onLogout}
              className="brutal-btn px-3 py-1.5 text-xs font-mono-data font-bold text-[#FAF8F5] bg-[#111] hover:bg-[#333]"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-black/20 flex flex-wrap items-center gap-1 text-xs font-stencil">
          <button
            onClick={() => setActiveTab('ops')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'ops' ? 'bg-[#FFC20E] text-black shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            YARD OPS & CAD MAP
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'assignments' ? 'bg-[#FFC20E] text-black shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            ASSIGNMENT CONSOLE (M4)
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'deliveries' ? 'bg-[#FFC20E] text-black shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            DELIVERY DESK (M3)
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'fleet' ? 'bg-[#FFC20E] text-black shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            FLEET & CREW
          </button>
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'walkthrough' ? 'bg-[#1F7A4D] text-white shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            JUDGE WALKTHROUGH
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'tests' ? 'bg-[#B3261E] text-white shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            RUN RULE TESTS (T1-T14)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 border-2 border-black transition-all ${
              activeTab === 'audit' ? 'bg-[#111111] text-[#FFC20E] shadow-[2px_2px_0_#111]' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            AUDIT LOG
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce">
          <div
            className={`p-3 border-2 border-black shadow-[4px_4px_0_#111] font-mono-data text-xs flex items-center justify-between gap-3 ${
              toast.type === 'success' ? 'bg-[#55f29f] text-black' : 'bg-[#ff7b72] text-black'
            }`}
          >
            <span>{toast.type === 'success' ? '✅' : '⚠️'} {toast.message}</span>
            <button onClick={() => setToast(null)} className="font-bold underline">✕</button>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* TAB 1: YARD OPS & CAD MAP */}
        {activeTab === 'ops' && (
          <div className="space-y-6">
            {/* Metric Blocks / Stencil Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="brutal-card p-3 border-l-4 border-l-[#1F7A4D]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">AVAILABLE FLEET</span>
                <span className="font-stencil text-2xl text-[#1F7A4D]">{stats?.availableVehicles ?? '-'}</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">READY FOR DISPATCH</span>
              </div>
              <div className="brutal-card p-3 border-l-4 border-l-[#FFC20E]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">ACTIVE DELIVERIES</span>
                <span className="font-stencil text-2xl text-[#111]">{stats?.activeDeliveries ?? '-'}</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">ASSIGNED + TRANSIT</span>
              </div>
              <div className="brutal-card p-3 border-l-4 border-l-[#55f29f]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">DELIVERED TODAY</span>
                <span className="font-stencil text-2xl text-[#1F7A4D]">{stats?.deliveredToday ?? '-'}</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">CLOSED RUNS</span>
              </div>
              <div className="brutal-card p-3 border-l-4 border-l-[#FF5A1F]">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">FLEET UTILISATION</span>
                <span className="font-stencil text-2xl text-[#FF5A1F]">{stats?.utilisationPct ?? 0}%</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">ACTIVE ÷ USABLE</span>
              </div>
              <div className="brutal-card p-3 border-l-4 border-l-black">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">DRIVERS ON DUTY</span>
                <span className="font-stencil text-2xl text-black">{stats?.driversOnDuty ?? '-'}</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">{stats?.availableDrivers ?? 0} FREE</span>
              </div>
              <div className="brutal-card p-3 border-l-4 border-l-yellow-600">
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase block">PENDING QUEUE</span>
                <span className="font-stencil text-2xl text-yellow-600">{stats?.pendingDeliveries ?? '-'}</span>
                <span className="text-[10px] font-mono-data text-[#6B6F72] block mt-0.5">AWAITING DISPATCH</span>
              </div>
            </div>

            {/* Yard Map Component */}
            <YardMap vehicles={vehicles} onSelectVehicle={(v) => console.log('Selected bay vehicle:', v)} />

            {/* Priority Queue with Recommend Button */}
            <div className="brutal-card p-5 bg-[#FAF8F5]">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b-2 border-black mb-3 gap-2">
                <div>
                  <span className="text-xs font-mono-data text-[#6B6F72] uppercase">STAGING AREA QUEUE</span>
                  <h3 className="font-stencil text-lg text-black">PRIORITY DISPATCH QUEUE</h3>
                </div>
                <span className="text-xs font-mono-data text-[#6B6F72]">
                  {pendingDeliveries.length} PENDING IN MANIFEST
                </span>
              </div>

              {pendingDeliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono-data text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#E2DDCF]">
                        <th className="p-2.5">PRIORITY</th>
                        <th className="p-2.5">DELIVERY ID</th>
                        <th className="p-2.5">ROUTE</th>
                        <th className="p-2.5">SCHEDULE</th>
                        <th className="p-2.5 text-right">DISPATCH ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDeliveries.map((del) => (
                        <tr key={del.delivery_id} className="border-b border-black/10 hover:bg-[#FFF7D9]">
                          <td className="p-2.5">
                            <PriorityBadge priority={del.priority} />
                          </td>
                          <td className="p-2.5 font-bold">{del.delivery_id}</td>
                          <td className="p-2.5">{del.pickup} &rarr; {del.dropoff}</td>
                          <td className="p-2.5">{del.scheduled_time}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleRecommendForDelivery(del.delivery_id)}
                              className="brutal-btn brutal-btn-primary px-3 py-1 text-xs font-stencil"
                            >
                              RECOMMEND & ASSIGN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono-data text-[#6B6F72] border-2 border-dashed border-black/30">
                  ALL DELIVERIES CURRENTLY ASSIGNED OR DELIVERED
                </div>
              )}
            </div>

            {/* Live Activity Ticker from Audit Log */}
            <div className="border-2 border-black bg-[#111] text-[#FAF8F5] p-3 shadow-[3px_3px_0_#111]">
              <div className="flex items-center gap-3 overflow-hidden text-xs font-mono-data">
                <span className="bg-[#FFC20E] text-black px-2 py-0.5 font-bold uppercase shrink-0">
                  LIVE YARD LOG
                </span>
                <div className="truncate text-white/90">
                  {auditLogs[0] ? (
                    <span>
                      [{new Date(auditLogs[0].timestamp).toLocaleTimeString()}] <strong>{auditLogs[0].actor}</strong>: {auditLogs[0].details}
                    </span>
                  ) : (
                    <span>Yard operating under normal parameters.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENT CONSOLE (MODEL 4) */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assignment Form */}
              <div className="lg:col-span-1 brutal-card p-5 bg-[#FAF8F5]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
                  <div>
                    <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase">ATOMIC RULE CHECK</span>
                    <h3 className="font-stencil text-lg text-black">DISPATCH CONSOLE</h3>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
                </div>

                {assignmentConflictAlert && (
                  <div className="p-3 mb-4 bg-red-100 border-2 border-[#B3261E] text-[#B3261E] font-mono-data text-xs animate-shake">
                    <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShieldAlertIcon className="w-4 h-4" />
                      <span>[{assignmentConflictAlert.error}] CONFLICT BLOCKED</span>
                    </div>
                    <p>{assignmentConflictAlert.message}</p>
                    <span className="text-[10px] text-[#6B6F72] block mt-1">
                      Zero state written to database. Rule invariant upheld.
                    </span>
                  </div>
                )}

                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  {/* Step 1: Select Pending Delivery */}
                  <div>
                    <label className="block text-xs font-mono-data font-bold uppercase mb-1">
                      1. SELECT PENDING DELIVERY ({pendingDeliveries.length} available)
                    </label>
                    <select
                      value={selectedDeliveryId}
                      onChange={(e) => setSelectedDeliveryId(e.target.value)}
                      className="w-full px-3 py-2 font-mono-data text-xs bg-white border-2 border-black focus:outline-hidden"
                      required
                    >
                      <option value="">-- Choose Pending Delivery --</option>
                      {pendingDeliveries.map((d) => (
                        <option key={d.delivery_id} value={d.delivery_id}>
                          {d.delivery_id} · {d.pickup} &rarr; {d.dropoff} [{d.priority}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Select Eligible Vehicle */}
                  <div>
                    <label className="block text-xs font-mono-data font-bold uppercase mb-1">
                      2. SELECT ELIGIBLE VEHICLE ({eligibleVehicles.length} available)
                    </label>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full px-3 py-2 font-mono-data text-xs bg-white border-2 border-black focus:outline-hidden"
                      required
                    >
                      <option value="">-- Choose Available Vehicle --</option>
                      {eligibleVehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.vehicle_id} · {v.registration_no} ({v.type}, {v.capacity}kg)
                        </option>
                      ))}
                    </select>
                    {eligibleVehicles.length === 0 && (
                      <span className="text-[10px] text-red-600 font-mono-data block mt-1">
                        ⚠️ No free vehicles in yard. Complete runs or return from maintenance.
                      </span>
                    )}
                  </div>

                  {/* Step 3: Select Eligible Driver */}
                  <div>
                    <label className="block text-xs font-mono-data font-bold uppercase mb-1">
                      3. SELECT ELIGIBLE DRIVER ({eligibleDrivers.length} available)
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full px-3 py-2 font-mono-data text-xs bg-white border-2 border-black focus:outline-hidden"
                      required
                    >
                      <option value="">-- Choose Available Driver --</option>
                      {eligibleDrivers.map((d) => (
                        <option key={d.driver_id} value={d.driver_id}>
                          {d.driver_id} · {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                    {eligibleDrivers.length === 0 && (
                      <span className="text-[10px] text-red-600 font-mono-data block mt-1">
                        ⚠️ No free drivers on duty.
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={assignmentSubmitting || !selectedDeliveryId || !selectedVehicleId || !selectedDriverId}
                    className="w-full brutal-btn brutal-btn-primary py-3 font-stencil text-sm flex items-center justify-center gap-2"
                  >
                    {assignmentSubmitting ? 'VERIFYING INVARIANTS...' : 'LOCK & COMMIT ATOMIC ASSIGNMENT'}
                  </button>
                </form>

                <div className="mt-4 pt-3 border-t-2 border-dashed border-black/20 text-[11px] font-mono-data text-[#6B6F72]">
                  🔒 Enforces ACID write transaction with engine-level partial unique index.
                </div>
              </div>

              {/* Assignment History Table */}
              <div className="lg:col-span-2 brutal-card p-5 bg-[#FAF8F5]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase">IMMUTABLE LOG</span>
                    <h3 className="font-stencil text-lg text-black">ASSIGNMENT HISTORY & LIFECYCLE</h3>
                  </div>
                  <span className="text-xs font-mono-data text-[#6B6F72]">
                    {assignments.length} TOTAL RECORDS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono-data text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#E2DDCF]">
                        <th className="p-2">ASGN ID</th>
                        <th className="p-2">DELIVERY</th>
                        <th className="p-2">VEHICLE</th>
                        <th className="p-2">DRIVER</th>
                        <th className="p-2">ASSIGNED AT</th>
                        <th className="p-2">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((asgn) => (
                        <tr key={asgn.assignment_id} className="border-b border-black/10 hover:bg-[#FFF7D9]">
                          <td className="p-2 font-bold">{asgn.assignment_id}</td>
                          <td className="p-2 font-bold text-black">{asgn.delivery_id}</td>
                          <td className="p-2">{asgn.vehicle_id} ({asgn.vehicle_registration})</td>
                          <td className="p-2">{asgn.driver_name} ({asgn.driver_id})</td>
                          <td className="p-2 text-[#6B6F72]">{new Date(asgn.assigned_at).toLocaleTimeString()}</td>
                          <td className="p-2">
                            {asgn.is_active === 1 ? (
                              <span className="px-2 py-0.5 bg-[#FFC20E] text-black font-bold border border-black text-[10px]">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#1F7A4D] font-bold border border-[#1F7A4D] text-[10px]">
                                RELEASED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {assignments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#6B6F72]">
                            No assignments recorded yet. Use the console on the left to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DELIVERY DESK (MODEL 3) */}
        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            {/* Create Delivery Form & Filters Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Delivery Form */}
              <div className="brutal-card p-5 bg-[#FAF8F5]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <h3 className="font-stencil text-base text-black">NEW DELIVERY MANIFEST</h3>
                  <span className="text-[10px] font-mono-data text-[#6B6F72]">MODEL 3</span>
                </div>
                <form onSubmit={handleCreateDelivery} className="space-y-3 font-mono-data text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">PICKUP LOCATION</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Coimbatore Hub"
                      value={newDelivery.pickup}
                      onChange={(e) => setNewDelivery({ ...newDelivery, pickup: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">DROPOFF DESTINATION</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Madurai Regional Dock"
                      value={newDelivery.dropoff}
                      onChange={(e) => setNewDelivery({ ...newDelivery, dropoff: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">SCHEDULED TIME</label>
                      <input
                        type="text"
                        required
                        placeholder="11:30 AM"
                        value={newDelivery.scheduled_time}
                        onChange={(e) => setNewDelivery({ ...newDelivery, scheduled_time: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">PRIORITY</label>
                      <select
                        value={newDelivery.priority}
                        onChange={(e) => setNewDelivery({ ...newDelivery, priority: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden font-bold"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full brutal-btn brutal-btn-primary py-2.5 font-stencil text-xs mt-2"
                  >
                    + REGISTER DELIVERY
                  </button>
                </form>
              </div>

              {/* Filter Controls & Summary */}
              <div className="lg:col-span-2 brutal-card p-5 bg-[#FAF8F5]">
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <h3 className="font-stencil text-base text-black">FILTER & SEARCH DELIVERIES</h3>
                  <span className="text-xs font-mono-data text-[#6B6F72]">{deliveries.length} MATCHING</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-data text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">FILTER BY STATUS</label>
                    <select
                      value={deliveryStatusFilter}
                      onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border-2 border-black"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">FILTER BY PRIORITY</label>
                    <select
                      value={deliveryPriorityFilter}
                      onChange={(e) => setDeliveryPriorityFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border-2 border-black"
                    >
                      <option value="">All Priorities</option>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">SEARCH LOCATION / DRIVER</label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border-2 border-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Deliveries List */}
            <div className="brutal-card p-5 bg-[#FAF8F5]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono-data text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#E2DDCF]">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">PRIORITY</th>
                      <th className="p-2.5">PICKUP &rarr; DROPOFF</th>
                      <th className="p-2.5">SCHEDULE</th>
                      <th className="p-2.5">CURRENT ALLOCATION</th>
                      <th className="p-2.5">STATUS</th>
                      <th className="p-2.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((del) => (
                      <tr key={del.delivery_id} className="border-b border-black/10 hover:bg-[#FFF7D9]">
                        <td className="p-2.5 font-bold">{del.delivery_id}</td>
                        <td className="p-2.5">
                          <PriorityBadge priority={del.priority} />
                        </td>
                        <td className="p-2.5 font-semibold">
                          {del.pickup} &rarr; {del.dropoff}
                        </td>
                        <td className="p-2.5">{del.scheduled_time}</td>
                        <td className="p-2.5">
                          {del.assigned_vehicle_id ? (
                            <span className="font-bold text-[#111]">
                              {del.assigned_vehicle_id} · {del.assigned_driver_name}
                            </span>
                          ) : (
                            <span className="text-[#6B6F72] italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={del.status} />
                        </td>
                        <td className="p-2.5 text-right space-x-2">
                          {(del.status === 'pending' || del.status === 'assigned') && (
                            <button
                              onClick={() => handleCancelDelivery(del.delivery_id)}
                              className="px-2 py-1 bg-red-100 text-[#B3261E] border border-[#B3261E] hover:bg-red-200 text-[10px] font-bold"
                            >
                              CANCEL
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FLEET & CREW MANAGEMENT (MANDATORY 3.3) */}
        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Vehicle Management */}
              <div className="space-y-4">
                {/* Add Vehicle Form */}
                <div className="brutal-card p-5 bg-[#FAF8F5]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <h3 className="font-stencil text-base text-black">+ ADD FLEET VEHICLE</h3>
                    <span className="text-[10px] font-mono-data text-[#6B6F72]">MODEL 1 CRUD</span>
                  </div>
                  <form onSubmit={handleCreateVehicle} className="space-y-3 font-mono-data text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">REGISTRATION NO (UNIQUE)</label>
                        <input
                          type="text"
                          required
                          placeholder="TN38XX9999"
                          value={newVehicle.registration_no}
                          onChange={(e) => setNewVehicle({ ...newVehicle, registration_no: e.target.value.toUpperCase() })}
                          className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">TYPE</label>
                        <select
                          value={newVehicle.type}
                          onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                        >
                          <option value="Van">Van</option>
                          <option value="Truck">Truck</option>
                          <option value="Mini-truck">Mini-truck</option>
                          <option value="Bike">Bike</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">PAYLOAD CAPACITY (KG)</label>
                      <input
                        type="number"
                        required
                        min="10"
                        value={newVehicle.capacity}
                        onChange={(e) => setNewVehicle({ ...newVehicle, capacity: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                      />
                    </div>
                    <button type="submit" className="w-full brutal-btn brutal-btn-primary py-2 font-stencil text-xs">
                      ENROLL VEHICLE TO YARD
                    </button>
                  </form>
                </div>

                {/* Vehicles List */}
                <div className="brutal-card p-5 bg-[#FAF8F5]">
                  <h4 className="font-stencil text-sm text-black border-b-2 border-black pb-2 mb-3">
                    ALL VEHICLES ({vehicles.length})
                  </h4>
                  <div className="space-y-2.5">
                    {vehicles.map((v) => (
                      <div key={v.vehicle_id} className="p-3 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TruckIcon className="w-4 h-4 text-black" />
                            <span className="font-stencil text-sm text-black">{v.vehicle_id}</span>
                            <span className="font-mono-data text-xs font-bold text-[#111]">{v.registration_no}</span>
                            <span className="text-[10px] font-mono-data bg-black/5 px-1">{v.type} · {v.capacity}kg</span>
                          </div>
                          <StatusBadge status={v.status} type="vehicle" />
                        </div>

                        {v.current_delivery_id && (
                          <div className="mt-2 text-xs font-mono-data text-[#FF5A1F] font-bold">
                            Active Job: {v.current_delivery_id} (Driver: {v.current_driver_name})
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-xs font-mono-data">
                          <span className="text-[#6B6F72]">CHANGE STATUS:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleVehicleStatusChange(v.vehicle_id, 'available')}
                              disabled={v.status === 'available'}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 border border-black text-[10px] font-bold disabled:opacity-40"
                            >
                              Available
                            </button>
                            <button
                              onClick={() => handleVehicleStatusChange(v.vehicle_id, 'maintenance')}
                              disabled={v.status === 'maintenance'}
                              className="px-2 py-0.5 bg-yellow-100 hover:bg-yellow-200 border border-black text-[10px] font-bold disabled:opacity-40"
                            >
                              Maintenance
                            </button>
                            <button
                              onClick={() => handleVehicleStatusChange(v.vehicle_id, 'inactive')}
                              disabled={v.status === 'inactive'}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 border border-black text-[10px] font-bold disabled:opacity-40"
                            >
                              Inactive
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Driver Management */}
              <div className="space-y-4">
                {/* Onboard Driver CTA Card */}
                <div className="brutal-card p-5 bg-[#FFC20E] text-black border-2 border-black shadow-[3px_3px_0_#111]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <SteeringWheelIcon className="w-5 h-5 text-black" />
                      <h3 className="font-stencil text-base text-black">ENROLL NEW DRIVER & VEHICLE</h3>
                    </div>
                    <span className="text-[10px] font-mono-data bg-black text-[#FFC20E] px-2 py-0.5 font-bold uppercase">
                      ONBOARDING
                    </span>
                  </div>
                  <p className="font-mono-data text-xs text-black/80 mb-3.5 leading-relaxed">
                    Register a new driver, verify driving license, specify vehicle ownership (warehouse fleet vs. driver-owned), upload RC book and 4 vehicle inspection photos, and create portal login credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(true)}
                    className="w-full brutal-btn py-3 font-stencil text-sm bg-black text-[#FFC20E] hover:bg-[#222] flex items-center justify-center gap-2"
                  >
                    <span>+ OPEN DRIVER ENROLLMENT FORM</span>
                  </button>
                </div>

                {/* Drivers List */}
                <div className="brutal-card p-5 bg-[#FAF8F5]">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <h4 className="font-stencil text-sm text-black">
                      REGISTERED CREW & DRIVERS ({drivers.length})
                    </h4>
                    <span className="text-[10px] font-mono-data text-[#6B6F72]">CLICK DOSSIER TO VIEW DOCS</span>
                  </div>

                  <div className="space-y-3">
                    {drivers.map((d) => (
                      <div key={d.driver_id} className="p-3 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SteeringWheelIcon className="w-4 h-4 text-black" />
                            <span className="font-stencil text-sm text-black">{d.driver_id}</span>
                            <span className="font-mono-data text-xs font-bold text-[#111]">{d.name}</span>
                            <span className="text-[10px] font-mono-data text-[#6B6F72]">({d.phone})</span>
                          </div>
                          <StatusBadge status={d.availability_status} type="driver" />
                        </div>

                        {/* Vehicle ownership & license badge strip */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono-data">
                          <span className={`px-1.5 py-0.5 border border-black font-bold ${
                            d.vehicle_ownership === 'own' ? 'bg-[#FFE8CC] text-[#D9480F]' : 'bg-[#EBF7EE] text-[#1F7A4D]'
                          }`}>
                            {d.vehicle_ownership === 'own' ? '🚗 DRIVER-OWNED ASSET' : '🏢 WAREHOUSE FLEET'}
                          </span>
                          {d.license_no && (
                            <span className="bg-black/5 px-1.5 py-0.5 border border-black/10">
                              LICENSE: {d.license_no}
                            </span>
                          )}
                          {d.rc_book_no && (
                            <span className="bg-black/5 px-1.5 py-0.5 border border-black/10">
                              RC: {d.rc_book_no} ({d.vehicle_type || 'Van'})
                            </span>
                          )}
                        </div>

                        {d.current_delivery_id && (
                          <div className="mt-2 text-xs font-mono-data text-[#FF5A1F] font-bold">
                            Active Job: {d.current_delivery_id} (Vehicle: {d.current_vehicle_id})
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-data">
                          <button
                            type="button"
                            onClick={() => setViewingDriverDossier(d)}
                            className="brutal-btn px-2.5 py-1 text-[11px] font-bold bg-[#FAF8F5] hover:bg-yellow-100 border border-black flex items-center gap-1"
                          >
                            <span>📋</span>
                            <span>VIEW DOSSIER & DOCS</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[#6B6F72] text-[10px]">DUTY:</span>
                            <button
                              onClick={() => handleDriverAvailabilityChange(
                                d.driver_id,
                                d.availability_status === 'available' ? 'unavailable' : 'available'
                              )}
                              disabled={d.availability_status === 'assigned'}
                              className={`px-2.5 py-1 border border-black text-[10px] font-bold ${
                                d.availability_status === 'available' ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-emerald-100 hover:bg-emerald-200'
                              }`}
                            >
                              {d.availability_status === 'available' ? 'Mark Unavailable' : 'Mark Available'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: JUDGE WALKTHROUGH (SECTION 9) */}
        {activeTab === 'walkthrough' && (
          <div className="space-y-6">
            <div className="brutal-card-lg p-6 bg-[#FAF8F5]">
              <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                <div>
                  <span className="text-xs font-mono-data text-[#1F7A4D] font-bold uppercase">SECTION 9 ACCREDITATION</span>
                  <h3 className="font-stencil text-2xl text-black">JUDGE ACCEPTANCE WALKTHROUGH</h3>
                </div>
                <button
                  onClick={() => {
                    handleResetDemoData();
                    setWalkthroughStep(1);
                    setWalkthroughLogs([]);
                  }}
                  className="brutal-btn px-3 py-1.5 text-xs font-mono-data font-bold text-black bg-[#FFC20E]"
                >
                  RESET WALKTHROUGH STATE
                </button>
              </div>

              <p className="font-mono-data text-xs text-[#6B6F72] mb-6">
                Walk through the core rule verification step-by-step. Each step triggers real live backend API calls and displays real server JSON responses.
              </p>

              {/* 4 Steps Checklist */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className={`p-4 border-2 border-black ${walkthroughStep === 1 ? 'bg-[#FFF7D9]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-stencil text-xs text-[#6B6F72]">CHECKPOINT 01</span>
                      <h4 className="font-stencil text-base text-black">CREATE VALID ASSIGNMENT (DL101 + V101 + D101)</h4>
                      <p className="font-mono-data text-xs text-[#6B6F72]">
                        Expectation: Both resources available, assignment created (201), all 3 records set to assigned.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunWalkthroughStep(1)}
                      disabled={walkthroughExecuting || walkthroughStep !== 1}
                      className="brutal-btn brutal-btn-primary px-4 py-2 font-stencil text-xs"
                    >
                      {walkthroughExecuting && walkthroughStep === 1 ? 'EXECUTING...' : 'RUN STEP 1'}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`p-4 border-2 border-black ${walkthroughStep === 2 ? 'bg-[#FFF7D9]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-stencil text-xs text-[#6B6F72]">CHECKPOINT 02</span>
                      <h4 className="font-stencil text-base text-black">REUSE SAME VEHICLE (DL102 + V101 + D102)</h4>
                      <p className="font-mono-data text-xs text-[#6B6F72]">
                        Expectation: Rejected with 409 VEHICLE_UNAVAILABLE. DL102 stays pending. D102 stays available.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunWalkthroughStep(2)}
                      disabled={walkthroughExecuting || walkthroughStep !== 2}
                      className="brutal-btn brutal-btn-primary px-4 py-2 font-stencil text-xs"
                    >
                      {walkthroughExecuting && walkthroughStep === 2 ? 'EXECUTING...' : 'RUN STEP 2'}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`p-4 border-2 border-black ${walkthroughStep === 3 ? 'bg-[#FFF7D9]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-stencil text-xs text-[#6B6F72]">CHECKPOINT 03</span>
                      <h4 className="font-stencil text-base text-black">REUSE SAME DRIVER (DL103 + V102 + D101)</h4>
                      <p className="font-mono-data text-xs text-[#6B6F72]">
                        Expectation: Rejected with 409 DRIVER_UNAVAILABLE. DL103 stays pending. V102 stays available.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunWalkthroughStep(3)}
                      disabled={walkthroughExecuting || walkthroughStep !== 3}
                      className="brutal-btn brutal-btn-primary px-4 py-2 font-stencil text-xs"
                    >
                      {walkthroughExecuting && walkthroughStep === 3 ? 'EXECUTING...' : 'RUN STEP 3'}
                    </button>
                  </div>
                </div>

                {/* Step 4 */}
                <div className={`p-4 border-2 border-black ${walkthroughStep === 4 ? 'bg-[#FFF7D9]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-stencil text-xs text-[#6B6F72]">CHECKPOINT 04</span>
                      <h4 className="font-stencil text-base text-black">COMPLETE DELIVERY & VERIFY RESOURCE RELEASE</h4>
                      <p className="font-mono-data text-xs text-[#6B6F72]">
                        Expectation: DL101 marked delivered. V101 and D101 return automatically to available status.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRunWalkthroughStep(4)}
                      disabled={walkthroughExecuting || walkthroughStep !== 4}
                      className="brutal-btn brutal-btn-success px-4 py-2 font-stencil text-xs text-white"
                    >
                      {walkthroughExecuting && walkthroughStep === 4 ? 'EXECUTING...' : 'RUN STEP 4'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Logs Area */}
              {walkthroughLogs.length > 0 && (
                <div className="mt-6 pt-4 border-t-2 border-black">
                  <h4 className="font-stencil text-sm text-black mb-2">LIVE EVIDENCE LOGS:</h4>
                  <div className="space-y-3">
                    {walkthroughLogs.map((log, idx) => (
                      <div key={idx} className="p-3 bg-black text-[#55f29f] font-mono-data text-xs border border-black shadow-[2px_2px_0_#111]">
                        <div className="text-white font-bold mb-1">
                          [{log.time}] {log.title}
                        </div>
                        <pre className="overflow-x-auto text-[11px] text-[#FFC20E]">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: RUN RULE TESTS (T1-T14) */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="brutal-card-lg p-6 bg-[#FAF8F5]">
              <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 mb-4 gap-3">
                <div>
                  <span className="text-xs font-mono-data text-[#B3261E] font-bold uppercase">AUTOMATED TEST HARNESS</span>
                  <h3 className="font-stencil text-2xl text-black">FULL RULE VERIFICATION SUITE (T1 - T14)</h3>
                </div>
                <button
                  onClick={handleRunRuleTests}
                  disabled={testsRunning}
                  className="brutal-btn brutal-btn-danger px-5 py-2.5 font-stencil text-sm text-white flex items-center gap-2"
                >
                  <ClipboardCheckIcon className="w-4 h-4 text-white" />
                  <span>{testsRunning ? 'RUNNING TEST SUITE...' : 'EXECUTE ALL 14 TESTS'}</span>
                </button>
              </div>

              <p className="font-mono-data text-xs text-[#6B6F72] mb-6">
                Executes all 14 mandatory tests against an isolated SQLite database, proving conflict prevention, transaction rollbacks, idempotency, and status release.
              </p>

              {testSummary ? (
                <div>
                  <div className="p-4 mb-6 border-2 border-black bg-white flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`stamp text-base ${testSummary.allPassed ? 'stamp-green' : 'stamp-red'}`}>
                        {testSummary.allPassed ? 'ALL TESTS PASSED' : `${testSummary.failed} TESTS FAILED`}
                      </span>
                      <span className="font-mono-data font-bold text-sm">
                        {testSummary.passed} / {testSummary.total} Passed
                      </span>
                    </div>
                    <span className="font-mono-data text-xs text-[#6B6F72]">
                      Execution Duration: {testSummary.totalDurationMs} ms · Timestamp: {new Date(testSummary.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {testSummary.tests.map((t) => (
                      <div key={t.id} className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-data font-bold text-xs bg-black text-white px-2 py-0.5">
                              {t.id}
                            </span>
                            <span className="font-stencil text-sm text-black">{t.name}</span>
                            <span className="text-[10px] font-mono-data text-[#6B6F72]">[{t.category}]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono-data text-[#6B6F72]">{t.durationMs}ms</span>
                            <span className={`stamp text-[10px] ${t.status === 'PASS' ? 'stamp-green' : 'stamp-red'}`}>
                              {t.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs font-mono-data space-y-1">
                          <div>
                            <span className="text-[#6B6F72] font-semibold">INPUT: </span>
                            <span>{t.input}</span>
                          </div>
                          <div>
                            <span className="text-[#6B6F72] font-semibold">EXPECTED: </span>
                            <span>{t.expected}</span>
                          </div>
                          <div>
                            <span className="text-[#1F7A4D] font-bold">OBSERVED: </span>
                            <span className="text-black">{t.observed}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono-data text-[#6B6F72] border-2 border-dashed border-black/30">
                  Click 'EXECUTE ALL 14 TESTS' above to run test suite against the backend.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="brutal-card p-5 bg-[#FAF8F5]">
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
              <div>
                <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase">COMPLIANCE & GOVERNANCE</span>
                <h3 className="font-stencil text-lg text-black">SYSTEM AUDIT TRAIL</h3>
              </div>
              <span className="text-xs font-mono-data text-[#6B6F72]">
                {auditLogs.length} LOGGED ACTIONS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-data text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#E2DDCF]">
                    <th className="p-2">ID</th>
                    <th className="p-2">TIMESTAMP</th>
                    <th className="p-2">ACTOR</th>
                    <th className="p-2">ACTION</th>
                    <th className="p-2">ENTITY</th>
                    <th className="p-2">DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-black/10 hover:bg-[#FFF7D9]">
                      <td className="p-2 font-bold">{log.id}</td>
                      <td className="p-2 text-[#6B6F72]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-2 font-bold text-black">{log.actor}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 bg-black/5 font-bold text-[10px] border border-black/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2">{log.entity}: {log.entity_id}</td>
                      <td className="p-2 max-w-md truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Driver Enrollment Modal */}
      {showEnrollModal && (
        <DriverEnrollModal
          warehouseVehicles={vehicles}
          existingDriversCount={drivers.length}
          onClose={() => setShowEnrollModal(false)}
          onSuccess={(newlyCreatedDriver) => {
            setShowEnrollModal(false);
            showToast('success', `Driver ${newlyCreatedDriver.name} (${newlyCreatedDriver.driver_id}) enrolled successfully! Login access created.`);
            refreshAll();
          }}
        />
      )}

      {/* Driver Personnel Dossier Modal */}
      {viewingDriverDossier && (
        <DriverDossierModal
          driver={viewingDriverDossier}
          onClose={() => setViewingDriverDossier(null)}
        />
      )}
    </div>
  );
}
