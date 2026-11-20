
import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { StudentProvider } from '../../context/StudentContext';

import StudentSidebar from './StudentSidebar';
import StudentTopbar from './StudentTopbar';

const StudentLayoutInner = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">

      <StudentTopbar
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <StudentSidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="min-h-[calc(100vh-5rem)] lg:ml-64 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <footer className="lg:ml-64 border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
       <a href="https://www.infotrackin.com/its/" target="_blank"> Copyright © 2026 Version 1.0 - Developed By <span className="text-blue-600 font-semibold"> Infotrack Technologies </span> </a>
      </footer>

    </div>
  );
};

export const StudentLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">
            Loading Student Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <StudentProvider>
      <StudentLayoutInner />
    </StudentProvider>
  );
};

export default StudentLayout;
