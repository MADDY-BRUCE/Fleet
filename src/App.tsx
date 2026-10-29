/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from './api';
import { User } from './types';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { DriverPortal } from './components/DriverPortal';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModal, setLoginModal] = useState<'driver' | 'admin' | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setStoredToken(null);
    };
    window.addEventListener('fleetwise_auth_expired', handleExpired);
    return () => window.removeEventListener('fleetwise_auth_expired', handleExpired);
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E9E4D8] flex items-center justify-center p-6 text-[#111]">
        <div className="brutal-card p-6 font-stencil text-base shadow-[4px_4px_0_#111] flex items-center gap-3">
          <div className="w-4 h-4 bg-[#FFC20E] border border-black animate-spin" />
          <span>INITIALIZING FLEETWISE ENGINE...</span>
        </div>
      </div>
    );
  }

  // If logged in as Driver
  if (user && user.role === 'driver') {
    return <DriverPortal user={user} onLogout={handleLogout} />;
  }

  // If logged in as Admin
  if (user && user.role === 'admin') {
    return <AdminPortal onLogout={handleLogout} />;
  }

  // Otherwise show Public Landing Page with login options
  return (
    <>
      <LandingPage
        onOpenDriverLogin={() => setLoginModal('driver')}
        onOpenAdminLogin={() => setLoginModal('admin')}
      />

      {loginModal && (
        <LoginModal
          initialMode={loginModal}
          onClose={() => setLoginModal(null)}
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setLoginModal(null);
          }}
        />
      )}
    </>
  );
}
