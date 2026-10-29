import React, { useState } from 'react';
import { api, setStoredToken } from '../api';
import { User } from '../types';
import { SteeringWheelIcon, TruckIcon } from './Icons';

interface LoginModalProps {
  initialMode: 'driver' | 'admin';
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export function LoginModal({ initialMode, onClose, onLoginSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<'driver' | 'admin'>(initialMode);
  const [username, setUsername] = useState(initialMode === 'driver' ? 'D101' : 'admin');
  const [password, setPassword] = useState(initialMode === 'driver' ? 'Driver@101' : 'Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ username, password });
      setStoredToken(res.token);

      // Trigger gate lifting or CRT power-on animation
      setSuccessAnimation(true);
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
      setLoading(false);
    }
  };

  const handleFillDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md relative">
        {/* Toggle Mode Tab Header */}
        <div className="flex border-2 border-b-0 border-black font-stencil text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('driver');
              setUsername('D101');
              setPassword('Driver@101');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'driver' ? 'bg-[#FFC20E] text-black font-bold' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            <SteeringWheelIcon className="w-3.5 h-3.5" />
            <span>DRIVER GATE</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setUsername('admin');
              setPassword('Admin@123');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-l-2 border-black transition-colors ${
              mode === 'admin' ? 'bg-[#111111] text-[#FFC20E] font-bold' : 'bg-[#FAF8F5] text-[#6B6F72]'
            }`}
          >
            <TruckIcon className="w-3.5 h-3.5" />
            <span>ADMIN CONTROL ROOM</span>
          </button>
        </div>

        {/* DRIVER GATE STYLE: Check-in slip */}
        {mode === 'driver' && (
          <div className="border-3 border-black bg-[#FAF8F5] p-6 shadow-[8px_8px_0_#111] relative">
            {/* Boom Barrier SVG Animation on Success */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
              <div>
                <span className="font-mono-data text-[10px] text-[#6B6F72] uppercase">CHECK-IN BOOTH · BOOM BARRIER</span>
                <h3 className="font-stencil text-xl text-black">DRIVER CHECK-IN SLIP</h3>
              </div>
              {/* Boom Barrier Visual */}
              <div className="flex flex-col items-end">
                <svg className="w-16 h-8" viewBox="0 0 80 40">
                  {/* Base */}
                  <rect x="65" y="15" width="12" height="25" fill="#111" />
                  {/* Barrier Arm */}
                  <line
                    x1="68"
                    y1="20"
                    x2="10"
                    y2={successAnimation ? '5' : '20'}
                    stroke="#FFC20E"
                    strokeWidth="5"
                    strokeDasharray="8 4"
                    className="transition-all duration-700 origin-right"
                  />
                  <circle cx="68" cy="20" r="4" fill="#B3261E" />
                </svg>
                <span className="text-[9px] font-mono-data text-[#6B6F72]">
                  {successAnimation ? 'BARRIER OPEN' : 'BARRIER DOWN'}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 mb-4 bg-red-100 border-2 border-[#B3261E] text-[#B3261E] text-xs font-mono-data font-semibold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono-data font-bold text-[#111] uppercase mb-1">
                  DRIVER IDENTIFICATION NUMBER
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. D101"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono-data text-sm bg-white border-2 border-black focus:outline-hidden focus:bg-[#FFF7D9] shadow-[2px_2px_0_#111]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-data font-bold text-[#111] uppercase mb-1">
                  SECURITY KEY / PIN
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. Driver@101"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 font-mono-data text-sm bg-white border-2 border-black focus:outline-hidden focus:bg-[#FFF7D9] shadow-[2px_2px_0_#111]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full brutal-btn brutal-btn-primary py-2.5 font-stencil text-sm text-black flex items-center justify-center gap-2"
                >
                  {loading ? 'VALIDATING CREW ID...' : 'CLOCK IN & LIFT BARRIER'}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-4 pt-3 border-t-2 border-dashed border-black/30">
              <span className="text-[10px] font-mono-data text-[#6B6F72] uppercase font-bold block mb-1.5">
                DEMO DRIVER CREDENTIALS (CLICK TO AUTOFILL):
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs font-mono-data">
                <button
                  type="button"
                  onClick={() => handleFillDemo('D101', 'Driver@101')}
                  className="px-2 py-0.5 bg-[#FFF7D9] border border-black hover:bg-[#FFC20E]"
                >
                  D101 (Arun)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('D102', 'Driver@102')}
                  className="px-2 py-0.5 bg-[#FFF7D9] border border-black hover:bg-[#FFC20E]"
                >
                  D102 (Meena)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('D103', 'Driver@103')}
                  className="px-2 py-0.5 bg-[#FFF7D9] border border-black hover:bg-[#FFC20E]"
                >
                  D103 (Karthik)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('D104', 'Driver@104')}
                  className="px-2 py-0.5 bg-[#e4e2dd] border border-[#999] hover:bg-[#ccc]"
                >
                  D104 (Priya - Unavail)
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-mono-data text-[#6B6F72] hover:underline"
              >
                [CANCEL & RETURN TO YARD]
              </button>
            </div>
          </div>
        )}

        {/* ADMIN CONTROL ROOM STYLE: Terminal */}
        {mode === 'admin' && (
          <div className="border-3 border-[#FFC20E] bg-[#111111] text-[#FAF8F5] p-6 shadow-[8px_8px_0_#FFC20E] relative scanline-overlay">
            <div className="flex items-center justify-between pb-3 border-b border-white/20 mb-4">
              <div>
                <span className="font-mono-data text-[10px] text-[#FFC20E] uppercase">TERMINAL VT-100 · CLEARANCE LEVEL 4</span>
                <h3 className="font-stencil text-xl text-white">ADMIN CONTROL ROOM</h3>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {error && (
              <div className="p-2.5 mb-4 bg-red-950/80 border-2 border-[#B3261E] text-red-300 text-xs font-mono-data font-semibold">
                ⚠️ ACCESS DENIED: {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono-data text-[#FFC20E] uppercase mb-1">
                  SYSTEM USERNAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 font-mono-data text-sm bg-black border-2 border-white/30 text-white focus:outline-hidden focus:border-[#FFC20E]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-data text-[#FFC20E] uppercase mb-1">
                  SYSTEM PASSPHRASE
                </label>
                <input
                  type="password"
                  required
                  placeholder="Admin@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 font-mono-data text-sm bg-black border-2 border-white/30 text-white focus:outline-hidden focus:border-[#FFC20E]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full brutal-btn brutal-btn-primary py-2.5 font-stencil text-sm text-black flex items-center justify-center gap-2"
                >
                  {loading ? 'AUTHENTICATING CONTROL SESSION...' : 'POWER ON CONTROL TERMINAL'}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-4 pt-3 border-t border-white/20">
              <span className="text-[10px] font-mono-data text-[#FFC20E] uppercase font-bold block mb-1.5">
                DEMO DISPATCHER CREDENTIALS:
              </span>
              <button
                type="button"
                onClick={() => handleFillDemo('admin', 'Admin@123')}
                className="px-2 py-0.5 bg-white/10 text-xs font-mono-data text-white border border-white/30 hover:bg-[#FFC20E] hover:text-black"
              >
                Auto-fill: admin / Admin@123
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-mono-data text-white/60 hover:text-white"
              >
                [CANCEL & RETURN TO YARD]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
