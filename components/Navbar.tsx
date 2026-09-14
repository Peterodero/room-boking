"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthModal, { User } from "@/components/AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    // Check stored user session in localStorage if present
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.reload();
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center font-heading font-extrabold text-white text-xl shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              US
            </div>
            <div>
              <span className="font-heading font-bold text-xl tracking-tight text-white block leading-none">
                RoomStays <span className="text-brand-500">.us</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase block mt-1">
                US Rental Booking
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Explore Rentals
            </Link>
            <Link href="/host/create" className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              List a Room
            </Link>
            {user && (
              <Link href="/bookings" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                My Bookings
              </Link>
            )}
          </nav>

          {/* User / Auth State */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.isUSCitizen && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="text-sm">🇺🇸</span> Verified US Citizen
                  </span>
                )}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-200">{user.name}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-rose-400 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("login")}
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(userData: User) => {
            setUser(userData);
            setAuthModalOpen(false);
          }}
        />
      )}
    </>
  );
}
