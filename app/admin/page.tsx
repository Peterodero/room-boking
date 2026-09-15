"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

type Stats = {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
};

type UserItem = {
  id: string;
  username?: string;
  email: string;
  name: string;
  role: "GUEST" | "HOST" | "ADMIN";
  isUSCitizen: boolean;
  createdAt: string;
  _count: {
    listings: number;
    bookings: number;
  };
};

type ListingItem = {
  id: string;
  title: string;
  city: string;
  state: string;
  pricePerNight: number | string;
  bookingFee: number | string;
  isActive: boolean;
  createdAt: string;
  host: {
    name: string;
    email: string;
  };
  _count: {
    bookings: number;
  };
};

type BookingItem = {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number | string;
  bookingFee: number | string;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  guest: {
    name: string;
    email: string;
  };
  listing: {
    title: string;
    city: string;
    state: string;
  };
  payments: Array<{
    id: string;
    amount: number | string;
    status: string;
    type: string;
  }>;
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "listings" | "bookings">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Search filters
  const [userQuery, setUserQuery] = useState("");
  const [listingQuery, setListingQuery] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Admin access token required. Please sign in as an Admin.");
        setLoading(false);
        return;
      }

      const [statsData, usersData, listingsData, bookingsData] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/listings"),
        api.get("/admin/bookings"),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setListings(listingsData);
      setBookings(bookingsData);
    } catch (err: any) {
      setError(err.message || "Failed to load admin management data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: "GUEST" | "HOST" | "ADMIN") {
    try {
      setMessage(null);
      await api.patch("/admin/users", { userId, role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setMessage(`Successfully updated user role to ${newRole}`);
    } catch (err: any) {
      setError(err.message || "Failed to update user role");
    }
  }

  async function handleListingToggle(listingId: string, currentActive: boolean) {
    try {
      setMessage(null);
      await api.patch("/admin/listings", { listingId, isActive: !currentActive });
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, isActive: !currentActive } : l))
      );
      setMessage(`Listing status set to ${!currentActive ? "Active" : "Inactive"}`);
    } catch (err: any) {
      setError(err.message || "Failed to toggle listing status");
    }
  }

  async function handleListingDelete(listingId: string, title: string) {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      setMessage(null);
      await api.delete(`/admin/listings?id=${listingId}`);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setMessage(`Permanently deleted listing: ${title}`);
    } catch (err: any) {
      setError(err.message || "Failed to delete listing.");
    }
  }

  async function handleBookingStatusChange(bookingId: string, newStatus: string) {
    try {
      setMessage(null);
      await api.patch("/admin/bookings", { bookingId, status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus as any } : b))
      );
      setMessage(`Booking ${bookingId.slice(0, 8)} status updated to ${newStatus}`);
    } catch (err: any) {
      setError(err.message || "Failed to update booking status");
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(userQuery.toLowerCase()))
  );

  const filteredListings = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(listingQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(listingQuery.toLowerCase()) ||
      l.state.toLowerCase().includes(listingQuery.toLowerCase()) ||
      l.host.name.toLowerCase().includes(listingQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter(
    (b) =>
      b.id.toLowerCase().includes(bookingQuery.toLowerCase()) ||
      b.guest.name.toLowerCase().includes(bookingQuery.toLowerCase()) ||
      b.guest.email.toLowerCase().includes(bookingQuery.toLowerCase()) ||
      b.listing.title.toLowerCase().includes(bookingQuery.toLowerCase())
  );

  if (error && error.includes("Admin access required")) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel rounded-2xl text-center space-y-4">
        <div className="text-4xl">🛡️</div>
        <h2 className="text-xl font-bold text-white">Admin Access Restricted</h2>
        <p className="text-sm text-slate-400">
          You must be logged in with an <strong>ADMIN</strong> role to view this panel.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-500 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-extrabold uppercase tracking-wider">
              🛡️ Master System Admin
            </span>
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-white mt-2">
            RoomStays Executive Console
          </h1>
          <p className="text-sm text-slate-400">
            Full oversight of platform accounts, listings, reservations & Cash App fee revenue
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-white/10 transition-all flex items-center gap-2 w-fit shadow-md"
        >
          <span>🔄</span> Refresh Data
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between shadow-lg">
          <span>✓ {message}</span>
          <button onClick={() => setMessage(null)} className="text-xs text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "border-brand-500 text-brand-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          📊 System Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "users"
              ? "border-brand-500 text-brand-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          👥 User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "listings"
              ? "border-brand-500 text-brand-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🏡 Property Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "bookings"
              ? "border-brand-500 text-brand-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🧳 Reservations & Holds ({bookings.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 glass-panel rounded-2xl">
          <div className="animate-spin text-4xl mb-3">⚡</div>
          <p className="text-slate-300 font-semibold text-sm">Loading admin metrics...</p>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && stats && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="glass-panel rounded-2xl p-6 space-y-2 border-l-4 border-l-brand-500 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Registered Users
                  </p>
                  <p className="text-3xl font-extrabold text-white">{stats.totalUsers}</p>
                  <p className="text-xs text-slate-400">Guests, Hosts & Admin</p>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-2 border-l-4 border-l-emerald-500 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Active Listings
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-400">
                    {stats.activeListings}{" "}
                    <span className="text-sm text-slate-400 font-normal">/ {stats.totalListings} total</span>
                  </p>
                  <p className="text-xs text-slate-400">Available for guest holds</p>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-2 border-l-4 border-l-indigo-500 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Confirmed Reservations
                  </p>
                  <p className="text-3xl font-extrabold text-brand-400">
                    {stats.confirmedBookings}{" "}
                    <span className="text-sm text-slate-400 font-normal">({stats.pendingBookings} pending)</span>
                  </p>
                  <p className="text-xs text-slate-400">Total bookings created: {stats.totalBookings}</p>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-2 border-l-4 border-l-purple-500 shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Booking Fee Revenue
                  </p>
                  <p className="text-3xl font-extrabold text-purple-400">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">Processed via Cash App Pay</p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">System Operations</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("users")}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-white/10 transition-all"
                  >
                    👤 Account Roles & Permissions
                  </button>
                  <button
                    onClick={() => setActiveTab("listings")}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-white/10 transition-all"
                  >
                    🏡 Moderate Properties & Listings
                  </button>
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-white/10 transition-all"
                  >
                    🧳 Inspect Holds & Force Statuses
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="🔍 Search users by name or email..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-80 focus:outline-none focus:border-brand-500"
                />
                <span className="text-xs text-slate-400">Showing {filteredUsers.length} of {users.length} users</span>
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Current Role</th>
                        <th className="px-6 py-4">Attestation</th>
                        <th className="px-6 py-4">Activity</th>
                        <th className="px-6 py-4 text-right">Role Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/40">
                          <td className="px-6 py-4 font-semibold text-white">{u.name}</td>
                          <td className="px-6 py-4 text-slate-400">{u.email}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                                u.role === "ADMIN"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                  : u.role === "HOST"
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                                  : "bg-slate-800 text-slate-300 border border-white/10"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.isUSCitizen ? (
                              <span className="text-emerald-400 text-xs font-semibold">🇺🇸 US Citizen</span>
                            ) : (
                              <span className="text-amber-400 text-xs">Unverified</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {u._count.listings} listings • {u._count.bookings} bookings
                          </td>
                          <td className="px-6 py-4 text-right">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                              className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                            >
                              <option value="GUEST">GUEST</option>
                              <option value="HOST">HOST</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LISTINGS TAB */}
          {activeTab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="🔍 Search properties by title, city, state, host..."
                  value={listingQuery}
                  onChange={(e) => setListingQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-80 focus:outline-none focus:border-brand-500"
                />
                <span className="text-xs text-slate-400">Showing {filteredListings.length} of {listings.length} listings</span>
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">Property</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Host</th>
                        <th className="px-6 py-4">Nightly Price</th>
                        <th className="px-6 py-4">Hold Fee</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredListings.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-900/40">
                          <td className="px-6 py-4 font-semibold text-white">
                            <Link href={`/listings/${l.id}`} className="hover:text-brand-400">
                              {l.title}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {l.city}, {l.state}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-semibold text-white">{l.host.name}</div>
                            <div className="text-slate-400">{l.host.email}</div>
                          </td>
                          <td className="px-6 py-4 text-white font-bold">
                            ${Number(l.pricePerNight).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-brand-400 font-bold">
                            ${Number(l.bookingFee).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                l.isActive
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {l.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleListingToggle(l.id, l.isActive)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                l.isActive
                                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              {l.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleListingDelete(l.id, l.title)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="🔍 Search bookings by ID, guest name, email, listing..."
                  value={bookingQuery}
                  onChange={(e) => setBookingQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 w-full sm:w-80 focus:outline-none focus:border-brand-500"
                />
                <span className="text-xs text-slate-400">Showing {filteredBookings.length} of {bookings.length} bookings</span>
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">Booking ID</th>
                        <th className="px-6 py-4">Listing & Guest</th>
                        <th className="px-6 py-4">Dates</th>
                        <th className="px-6 py-4">Hold Fee</th>
                        <th className="px-6 py-4">Current Status</th>
                        <th className="px-6 py-4 text-right">Override Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-900/40">
                          <td className="px-6 py-4 font-mono text-xs text-slate-400">
                            {b.id.slice(0, 12)}...
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{b.listing.title}</div>
                            <div className="text-xs text-slate-400">
                              Guest: {b.guest.name} ({b.guest.email})
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-300">
                            {new Date(b.checkIn).toLocaleDateString()} –{" "}
                            {new Date(b.checkOut).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-brand-400 font-bold">
                            ${Number(b.bookingFee).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                                b.status === "CONFIRMED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : b.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <select
                              value={b.status}
                              onChange={(e) => handleBookingStatusChange(b.id, e.target.value)}
                              className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="EXPIRED">EXPIRED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
