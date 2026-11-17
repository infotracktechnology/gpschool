import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Building,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Check,
  Star,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Topbar = ({ onToggleSidebar = () => {} }) => {
  const {
    user,
    logout,
    academicYears,
    selectedAcademicYear,
    changeAcademicYear,
  } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Academic Year Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100/80 text-brand-700 border border-brand-200/90 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            title="Switch Active Session Academic Year"
          >
            <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden xs:block sm:block">
              <span className="block text-[10px] text-brand-600/80 font-medium leading-none">
                Academic Year
              </span>
              <span className="font-bold text-brand-950 text-xs">
                {selectedAcademicYear?.code || 'Select Year'}
              </span>
            </div>
            <span className="font-bold text-brand-950 text-xs xs:hidden sm:hidden">
              {selectedAcademicYear?.code || 'Year'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-brand-600 transition-transform duration-200 ml-0.5 sm:ml-1 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-border p-2 z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-border mb-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Switch Session Year</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    Session View
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Filters reports, calendar schedules & session data
                </p>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto py-1">
                {academicYears.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-500">
                    No academic years found.
                  </div>
                ) : (
                  academicYears.map((year) => {
                    const isSelected = selectedAcademicYear?.id === year.id;
                    const isDefault = Boolean(year.is_current);

                    return (
                      <button
                        key={year.id}
                        type="button"
                        onClick={() => {
                          changeAcademicYear(year);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-50 text-brand-800 font-semibold border border-brand-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{year.code}</span>
                          {isDefault && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Default
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Branch Context info (hidden on mobile, visible on md+) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium">
          <Building className="w-4 h-4 text-slate-500" />
          <span className="truncate max-w-[200px]">
            Branch:{' '}
            <strong className="text-slate-900 font-semibold">
              {user?.branch_name || 'All Campuses (Global)'}
            </strong>
          </span>
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 capitalize font-medium">
              <ShieldCheck className="w-3 h-3 text-brand-600" />
              {user?.role?.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
