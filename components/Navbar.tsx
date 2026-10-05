"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthModal, { User } from "@/components/AuthModal";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }

    const storedTheme = localStorage.getItem("theme");
    const dark = storedTheme === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    window.location.reload();
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center font-heading font-extrabold text-white text-lg shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              US
            </div>
            <div className="leading-none">
              <span className="font-heading font-bold text-lg tracking-tight text-slate-900 dark:text-white block">
                RoomStays <span className="text-brand-600 dark:text-brand-400">.us</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase block mt-0.5">
                US Rental Booking
              </span>
            </div>
          </Link>

          {/* Primary nav — top level navigation for main features */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" active={isActive("/")}>
              🏠 Explore Rentals
            </NavLink>
            {user ? (
              <>
                <NavLink href="/bookings" active={isActive("/bookings")}>
                  📑 My Bookings
                </NavLink>
                <NavLink href="/my-rentals" active={isActive("/my-rentals")}>
                  🔑 My Rentals
                </NavLink>
              </>
            ) : (
              <button
                onClick={() => openAuth("login")}
                className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                📑 My Bookings
              </button>
            )}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
              className="grid place-items-center w-9 h-9 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold font-heading shadow-inner shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[110px] truncate hidden sm:inline">
                    {user.name}
                  </span>
                  <IconChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden"
                  >
                    <div className="px-3.5 py-3 border-b border-slate-100 dark:border-white/10">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                      {user.role === "ADMIN" && (
                        <span className="inline-block mt-1 text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-extrabold px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="py-1.5">
                      <MenuLink href="/bookings" icon={<IconCalendar />} onClick={() => setMenuOpen(false)}>
                        My Bookings
                      </MenuLink>
                      <MenuLink href="/my-rentals" icon={<IconKey />} onClick={() => setMenuOpen(false)}>
                        My Rentals
                      </MenuLink>
                      {user.role === "ADMIN" && (
                        <MenuLink href="/admin" icon={<IconShield />} onClick={() => setMenuOpen(false)}>
                          Admin Console
                        </MenuLink>
                      )}
                    </div>

                    <div className="py-1.5 border-t border-slate-100 dark:border-white/10">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <IconLogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("login")}
                  className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg shadow-md shadow-brand-600/30 transition-all active:scale-95"
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "text-slate-900 dark:text-white"
          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-3 right-3 -bottom-[1px] h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
      )}
    </Link>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      {children}
    </Link>
  );
}

// --- Icons: small inline SVGs, no external icon package required ---

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function IconChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5 18 5M17 10l2.5-2.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
    </svg>
  );
}

function IconLogOut({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}