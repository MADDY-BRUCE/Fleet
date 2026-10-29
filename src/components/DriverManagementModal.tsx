import React, { useState } from 'react';
import { Driver, Vehicle } from '../types';
import { api } from '../api';
import { SteeringWheelIcon, TruckIcon } from './Icons';
import { StatusBadge } from './StatusBadge';

// Helper to convert File to base64 Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 1. DRIVER ENROLLMENT MODAL
// ==========================================
interface DriverEnrollModalProps {
  warehouseVehicles: Vehicle[];
  existingDriversCount: number;
  onClose: () => void;
  onSuccess: (driver: Driver) => void;
}

export function DriverEnrollModal({ warehouseVehicles, existingDriversCount, onClose, onSuccess }: DriverEnrollModalProps) {
  const nextDriverId = `D${101 + existingDriversCount}`;
  
  // Form fields
  const [driverId, setDriverId] = useState(nextDriverId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseDoc, setLicenseDoc] = useState<string | null>(null);
  const [licenseFileName, setLicenseFileName] = useState<string>('');

  // Login credentials for driver
  const [username, setUsername] = useState(nextDriverId);
  const [password, setPassword] = useState(`Driver@${nextDriverId.replace('D', '')}`);

  // Vehicle ownership choice: 'warehouse' | 'own'
  const [vehicleOwnership, setVehicleOwnership] = useState<'warehouse' | 'own'>('warehouse');

  // If Warehouse owned:
  const [selectedWarehouseVehicleId, setSelectedWarehouseVehicleId] = useState(
    warehouseVehicles.find((v) => v.status === 'available')?.vehicle_id || warehouseVehicles[0]?.vehicle_id || ''
  );

  // If Driver owned:
  const [rcBookNo, setRcBookNo] = useState('');
  const [rcBookDoc, setRcBookDoc] = useState<string | null>(null);
  const [rcBookFileName, setRcBookFileName] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Van' | 'Mini-truck' | 'Truck'>('Van');
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(1000);

  // 4 photos for driver's own vehicle
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoLeft, setPhotoLeft] = useState<string | null>(null);
  const [photoRight, setPhotoRight] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-adjust default capacity when vehicle type changes
  const handleTypeChange = (type: 'Bike' | 'Van' | 'Mini-truck' | 'Truck') => {
    setVehicleType(type);
    if (type === 'Bike') setVehicleCapacity(40);
    else if (type === 'Mini-truck') setVehicleCapacity(1500);
    else if (type === 'Truck') setVehicleCapacity(5000);
    else setVehicleCapacity(1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, nameSetter?: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setter(dataUrl);
      if (nameSetter) nameSetter(file.name);
    } catch {
      setError('Failed to process uploaded file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide the driver’s full name.');
      return;
    }
    if (!phone.trim() || phone.length < 7) {
      setError('Please provide a valid contact phone number.');
      return;
    }
    if (!licenseNo.trim()) {
      setError('Please provide the driving license number.');
      return;
    }

    if (vehicleOwnership === 'own') {
      if (!rcBookNo.trim()) {
        setError('Please provide the RC Book / Vehicle Registration number for the personal vehicle.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        driver_id: driverId.trim().toUpperCase(),
        name: name.trim(),
        phone: phone.trim(),
        license_no: licenseNo.trim().toUpperCase(),
        license_doc: licenseDoc,
        vehicle_ownership: vehicleOwnership,
        username: username.trim(),
        password: password.trim(),
      };

      if (vehicleOwnership === 'warehouse') {
        payload.assigned_vehicle_id = selectedWarehouseVehicleId;
      } else {
        payload.rc_book_no = rcBookNo.trim().toUpperCase();
        payload.rc_book_doc = rcBookDoc;
        payload.registration_no = rcBookNo.trim().toUpperCase();
        payload.vehicle_type = vehicleType;
        payload.vehicle_capacity = vehicleCapacity;
        payload.vehicle_photo_front = photoFront;
        payload.vehicle_photo_back = photoBack;
        payload.vehicle_photo_left = photoLeft;
        payload.vehicle_photo_right = photoRight;
      }

      const created = await api.createDriver(payload);
      onSuccess(created);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll driver. Please check your inputs.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#FAF8F5] border-3 border-black shadow-[8px_8px_0_#111] my-8 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[#FFC20E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black text-[#FFC20E] flex items-center justify-center font-stencil text-base border border-black">
              DR
            </div>
            <div>
              <span className="text-[10px] font-mono-data text-black/80 font-bold uppercase block">PERSONNEL ENROLLMENT</span>
              <h2 className="font-stencil text-lg text-black leading-none">ENROLL NEW DRIVER & VEHICLE</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-100 border-2 border-[#B3261E] text-[#B3261E] text-xs font-mono-data font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[78vh] overflow-y-auto font-mono-data text-xs">
          {/* SECTION 1: DRIVER IDENTIFICATION & LICENSE */}
          <div className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <h3 className="font-stencil text-sm text-black border-b border-black/20 pb-1.5 mb-3 flex items-center gap-2">
              <SteeringWheelIcon className="w-4 h-4 text-black" />
              <span>1. DRIVER PROFILE & DRIVING LICENSE</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">DRIVER ID</label>
                <input
                  type="text"
                  required
                  value={driverId}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setDriverId(val);
                    setUsername(val);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border-2 border-black uppercase font-bold"
                  placeholder="e.g. D107"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                  placeholder="Driver Full Name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">PHONE NUMBER</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden"
                  placeholder="9876543219"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">DRIVING LICENSE NO</label>
                <input
                  type="text"
                  required
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden uppercase"
                  placeholder="DL-TN38-20220019"
                />
              </div>
            </div>

            {/* License Document Upload */}
            <div className="mt-3 pt-2.5 border-t border-black/10">
              <label className="block text-[10px] font-bold uppercase mb-1">
                DRIVING LICENSE DOCUMENT (PDF, JPEG, PNG)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => handleFileUpload(e, setLicenseDoc, setLicenseFileName)}
                  className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:border file:border-black file:bg-[#FFC20E] file:font-stencil file:text-[10px] file:cursor-pointer"
                />
                {licenseFileName && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-[#1F7A4D] font-bold border border-[#1F7A4D] text-[10px]">
                    ✔ {licenseFileName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: VEHICLE OWNERSHIP CHOICE */}
          <div className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <h3 className="font-stencil text-sm text-black border-b border-black/20 pb-1.5 mb-2 flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-black" />
              <span>2. VEHICLE OWNERSHIP & FLEET ATTACHMENT</span>
            </h3>
            <p className="text-[11px] text-[#6B6F72] mb-3">
              Does this driver operate a warehouse-provided vehicle, or are they registering their own personal vehicle?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVehicleOwnership('warehouse')}
                className={`p-3 border-2 border-black text-left transition-all ${
                  vehicleOwnership === 'warehouse'
                    ? 'bg-[#FFC20E] text-black font-bold shadow-[2px_2px_0_#111]'
                    : 'bg-[#FAF8F5] text-[#6B6F72] hover:bg-yellow-50'
                }`}
              >
                <div className="font-stencil text-xs">WAREHOUSE FLEET</div>
                <div className="text-[10px] font-mono-data mt-0.5">Operates Kovai Central Yard vehicle</div>
              </button>

              <button
                type="button"
                onClick={() => setVehicleOwnership('own')}
                className={`p-3 border-2 border-black text-left transition-all ${
                  vehicleOwnership === 'own'
                    ? 'bg-[#FFC20E] text-black font-bold shadow-[2px_2px_0_#111]'
                    : 'bg-[#FAF8F5] text-[#6B6F72] hover:bg-yellow-50'
                }`}
              >
                <div className="font-stencil text-xs">DRIVER-OWNED VEHICLE</div>
                <div className="text-[10px] font-mono-data mt-0.5">Registers personal vehicle & RC</div>
              </button>
            </div>

            {/* If Warehouse Vehicle */}
            {vehicleOwnership === 'warehouse' && (
              <div className="mt-4 p-3 bg-[#FFF7D9] border-2 border-black">
                <label className="block text-[10px] font-bold uppercase mb-1">
                  SELECT WAREHOUSE VEHICLE ID
                </label>
                <select
                  value={selectedWarehouseVehicleId}
                  onChange={(e) => setSelectedWarehouseVehicleId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black font-bold"
                >
                  {warehouseVehicles.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.vehicle_id} · {v.registration_no} ({v.type}, {v.capacity}kg payload) - {v.status.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#6B6F72] block mt-1">
                  Vehicle already registered in warehouse manifest. No RC or photo upload needed.
                </span>
              </div>
            )}

            {/* If Driver-Owned Vehicle */}
            {vehicleOwnership === 'own' && (
              <div className="mt-4 space-y-4 pt-2 border-t border-black/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">
                      RC BOOK / REGISTRATION NUMBER *
                    </label>
                    <input
                      type="text"
                      required
                      value={rcBookNo}
                      onChange={(e) => setRcBookNo(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black focus:outline-hidden uppercase font-bold"
                      placeholder="e.g. TN38XY1234"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">
                      VEHICLE TYPE (FOR SIZING/MASS MATCHING)
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => handleTypeChange(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black font-bold"
                    >
                      <option value="Bike">Two-Wheeler / Bike (Rapid parcels)</option>
                      <option value="Van">Van (Standard city freight)</option>
                      <option value="Mini-truck">Mini-Truck (Medium payloads)</option>
                      <option value="Truck">Heavy Loaded Truck (Bulk freight)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase mb-1">
                      MAX PAYLOAD CAPACITY (KG)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={vehicleCapacity}
                      onChange={(e) => setVehicleCapacity(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border-2 border-black font-bold"
                    />
                  </div>
                </div>

                {/* RC Book Document Upload */}
                <div className="p-3 bg-[#FAF8F5] border-2 border-black">
                  <label className="block text-[10px] font-bold uppercase mb-1">
                    UPLOAD RC BOOK (PDF, JPEG, PNG)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => handleFileUpload(e, setRcBookDoc, setRcBookFileName)}
                      className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:border file:border-black file:bg-[#FFC20E] file:font-stencil file:text-[10px] file:cursor-pointer"
                    />
                    {rcBookFileName && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-[#1F7A4D] font-bold border border-[#1F7A4D] text-[10px]">
                        ✔ {rcBookFileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Photos of Personal Vehicle */}
                <div className="p-3 bg-[#FAF8F5] border-2 border-black">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-stencil text-xs text-black uppercase">
                      VEHICLE PHOTOS (4 SIDES INSPECTION)
                    </label>
                    <span className="text-[10px] text-[#6B6F72]">FRONT · BACK · BOTH SIDES</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Front */}
                    <div className="p-2 bg-white border border-black flex flex-col items-center text-center">
                      <span className="font-stencil text-[10px] text-[#6B6F72] mb-1">1. FRONT VIEW</span>
                      {photoFront ? (
                        <div className="relative w-full h-18 bg-black/5 flex items-center justify-center overflow-hidden border border-black/30">
                          <img src={photoFront} alt="Front" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotoFront(null)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-18 border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 p-1">
                          <span className="text-sm">📷</span>
                          <span className="text-[9px] text-[#6B6F72] mt-0.5">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setPhotoFront)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Back */}
                    <div className="p-2 bg-white border border-black flex flex-col items-center text-center">
                      <span className="font-stencil text-[10px] text-[#6B6F72] mb-1">2. BACK VIEW</span>
                      {photoBack ? (
                        <div className="relative w-full h-18 bg-black/5 flex items-center justify-center overflow-hidden border border-black/30">
                          <img src={photoBack} alt="Back" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotoBack(null)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-18 border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 p-1">
                          <span className="text-sm">📷</span>
                          <span className="text-[9px] text-[#6B6F72] mt-0.5">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setPhotoBack)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Left Side */}
                    <div className="p-2 bg-white border border-black flex flex-col items-center text-center">
                      <span className="font-stencil text-[10px] text-[#6B6F72] mb-1">3. LEFT SIDE</span>
                      {photoLeft ? (
                        <div className="relative w-full h-18 bg-black/5 flex items-center justify-center overflow-hidden border border-black/30">
                          <img src={photoLeft} alt="Left" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotoLeft(null)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-18 border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 p-1">
                          <span className="text-sm">📷</span>
                          <span className="text-[9px] text-[#6B6F72] mt-0.5">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setPhotoLeft)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Right Side */}
                    <div className="p-2 bg-white border border-black flex flex-col items-center text-center">
                      <span className="font-stencil text-[10px] text-[#6B6F72] mb-1">4. RIGHT SIDE</span>
                      {photoRight ? (
                        <div className="relative w-full h-18 bg-black/5 flex items-center justify-center overflow-hidden border border-black/30">
                          <img src={photoRight} alt="Right" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotoRight(null)}
                            className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-18 border-2 border-dashed border-black/30 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-50 p-1">
                          <span className="text-sm">📷</span>
                          <span className="text-[9px] text-[#6B6F72] mt-0.5">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setPhotoRight)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DRIVER GATE LOGIN CREDENTIALS */}
          <div className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <h3 className="font-stencil text-sm text-black border-b border-black/20 pb-1.5 mb-2">
              3. DRIVER GATE PORTAL CREDENTIALS
            </h3>
            <p className="text-[11px] text-[#6B6F72] mb-3">
              The driver will use these credentials to check in at the Driver Gate and execute their trips.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">LOGIN USER ID / CALLSIGN</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">ASSIGNED PASSWORD</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border-2 border-black font-mono-data font-bold"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="brutal-btn px-4 py-2 font-stencil text-xs text-[#111]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="brutal-btn brutal-btn-primary px-6 py-2.5 font-stencil text-xs flex items-center gap-2"
            >
              {loading ? 'ENROLLING DRIVER & VEHICLE...' : 'CONFIRM & ENROLL DRIVER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 2. DRIVER DOSSIER VIEWER (VIEW DETAILS)
// ==========================================
interface DriverDossierModalProps {
  driver: Driver;
  onClose: () => void;
}

export function DriverDossierModal({ driver, onClose }: DriverDossierModalProps) {
  const isOwnVehicle = driver.vehicle_ownership === 'own';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#FAF8F5] border-3 border-black shadow-[8px_8px_0_#111] my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[#111111] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FFC20E] text-black flex items-center justify-center font-stencil text-base border border-black">
              {driver.driver_id}
            </div>
            <div>
              <span className="text-[10px] font-mono-data text-[#FFC20E] uppercase block">PERSONNEL DOSSIER</span>
              <h2 className="font-stencil text-lg text-white leading-none">{driver.name.toUpperCase()}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-white bg-black hover:bg-white hover:text-black font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto font-mono-data text-xs">
          {/* Driver Quick Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 bg-white border-2 border-black">
              <span className="text-[10px] text-[#6B6F72] block">STATUS</span>
              <StatusBadge status={driver.availability_status} type="driver" />
            </div>
            <div className="p-2.5 bg-white border-2 border-black">
              <span className="text-[10px] text-[#6B6F72] block">PHONE</span>
              <span className="font-bold text-black">{driver.phone}</span>
            </div>
            <div className="p-2.5 bg-white border-2 border-black">
              <span className="text-[10px] text-[#6B6F72] block">PORTAL USERNAME</span>
              <span className="font-bold text-black">{driver.username || driver.driver_id}</span>
            </div>
            <div className="p-2.5 bg-white border-2 border-black">
              <span className="text-[10px] text-[#6B6F72] block">VEHICLE CLASS</span>
              <span className="font-bold text-black">{isOwnVehicle ? 'Personal' : 'Warehouse'}</span>
            </div>
          </div>

          {/* License & Credentials */}
          <div className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <h3 className="font-stencil text-xs text-black border-b border-black/20 pb-1.5 mb-2.5">
              DRIVING LICENSE RECORD
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-[#6B6F72] block">LICENSE NUMBER</span>
                <span className="font-bold text-sm text-black">
                  {driver.license_no || 'Standard Commercial License'}
                </span>
              </div>
              {driver.license_doc && (
                <a
                  href={driver.license_doc}
                  download={`License_${driver.driver_id}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="brutal-btn px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-xs font-bold border border-black"
                >
                  📄 View / Download License
                </a>
              )}
            </div>
          </div>

          {/* Vehicle Ownership Details */}
          <div className="p-3.5 border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <h3 className="font-stencil text-xs text-black border-b border-black/20 pb-1.5 mb-2.5 flex items-center justify-between">
              <span>VEHICLE ALLOCATION & RC VERIFICATION</span>
              <span className="px-2 py-0.5 bg-black text-[#FFC20E] text-[10px] font-bold">
                {isOwnVehicle ? 'DRIVER-OWNED ASSET' : 'KOVAI CENTRAL WAREHOUSE FLEET'}
              </span>
            </h3>

            {isOwnVehicle ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-[#6B6F72] block">RC BOOK / REG NO</span>
                    <span className="font-bold text-sm text-black">{driver.rc_book_no || 'Registered'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B6F72] block">VEHICLE TYPE</span>
                    <span className="font-bold text-sm text-black">{driver.vehicle_type || 'Van'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B6F72] block">MAX CAPACITY</span>
                    <span className="font-bold text-sm text-black">{driver.vehicle_capacity || 1000} kg</span>
                  </div>
                </div>

                {driver.rc_book_doc && (
                  <div className="pt-2 border-t border-black/10 flex items-center justify-between">
                    <span className="text-[11px] text-[#6B6F72]">Uploaded RC Book document on file:</span>
                    <a
                      href={driver.rc_book_doc}
                      download={`RC_${driver.driver_id}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="brutal-btn px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-[#1F7A4D] text-xs font-bold border border-black"
                    >
                      📄 Download RC Book
                    </a>
                  </div>
                )}

                {/* 4 Photo Inspection Gallery */}
                <div className="pt-2 border-t border-black/10">
                  <span className="font-stencil text-[11px] text-black block mb-2">
                    4-ANGLE VEHICLE INSPECTION PHOTOS
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-1.5 bg-[#FAF8F5] border border-black text-center">
                      <span className="text-[9px] font-bold text-[#6B6F72] block mb-1">FRONT</span>
                      {driver.vehicle_photo_front ? (
                        <img src={driver.vehicle_photo_front} alt="Front" className="w-full h-20 object-cover border border-black/30" />
                      ) : (
                        <div className="w-full h-20 bg-black/5 flex items-center justify-center text-[10px] text-[#999]">No Photo</div>
                      )}
                    </div>
                    <div className="p-1.5 bg-[#FAF8F5] border border-black text-center">
                      <span className="text-[9px] font-bold text-[#6B6F72] block mb-1">BACK</span>
                      {driver.vehicle_photo_back ? (
                        <img src={driver.vehicle_photo_back} alt="Back" className="w-full h-20 object-cover border border-black/30" />
                      ) : (
                        <div className="w-full h-20 bg-black/5 flex items-center justify-center text-[10px] text-[#999]">No Photo</div>
                      )}
                    </div>
                    <div className="p-1.5 bg-[#FAF8F5] border border-black text-center">
                      <span className="text-[9px] font-bold text-[#6B6F72] block mb-1">LEFT SIDE</span>
                      {driver.vehicle_photo_left ? (
                        <img src={driver.vehicle_photo_left} alt="Left" className="w-full h-20 object-cover border border-black/30" />
                      ) : (
                        <div className="w-full h-20 bg-black/5 flex items-center justify-center text-[10px] text-[#999]">No Photo</div>
                      )}
                    </div>
                    <div className="p-1.5 bg-[#FAF8F5] border border-black text-center">
                      <span className="text-[9px] font-bold text-[#6B6F72] block mb-1">RIGHT SIDE</span>
                      {driver.vehicle_photo_right ? (
                        <img src={driver.vehicle_photo_right} alt="Right" className="w-full h-20 object-cover border border-black/30" />
                      ) : (
                        <div className="w-full h-20 bg-black/5 flex items-center justify-center text-[10px] text-[#999]">No Photo</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#FAF8F5] border border-black">
                <span className="text-[11px] text-[#111]">
                  Assigned Warehouse Asset: <strong>{driver.assigned_vehicle_id || driver.current_vehicle_id || 'Yard Pool'}</strong>
                </span>
                <p className="text-[10px] text-[#6B6F72] mt-0.5">
                  Driver operates warehouse-owned vehicle maintained under Kovai Yard regular diagnostic program.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t-2 border-black bg-white flex justify-end">
          <button
            onClick={onClose}
            className="brutal-btn px-4 py-2 font-stencil text-xs text-black"
          >
            CLOSE DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
}
