"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

interface Listing {
  id: string;
  title: string;
  city: string;
  state: string;
  pricePerNight: number | string;
  bookingFee: number | string;
  photos: string[];
  isActive: boolean;
  createdAt: string;
}

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadListings() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Please sign in as a host to view your properties.");
          setLoading(false);
          return;
        }
        // Fetch all listings for host
        const data = await api.get("/listings?myListings=true");
        setListings(data);
      } catch (err: any) {
        setError(err.message || "Failed to load host listings.");
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link href="/" className="text-xs text-brand-400 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold font-heading text-white mt-1">Host Dashboard</h1>
          <p className="text-sm text-slate-400">Manage your room listings & reservations</p>
        </div>
        <Link
          href="/host/create"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white shadow-lg shadow-brand-600/30 transition-all"
        >
          + Add New Room
        </Link>
      </div>

      {loading && (
        <div className="glass-panel p-12 rounded-2xl text-center">
          <div className="inline-block animate-spin text-3xl mb-3">⚡</div>
          <p className="text-slate-400 text-sm">Loading your host properties...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm mb-6">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto">
          <span className="text-4xl mb-4 block">🏡</span>
          <h3 className="text-xl font-bold text-white mb-2">No Room Listings Yet</h3>
          <p className="text-sm text-slate-400 mb-6">
            Start earning by listing your spare room for verified US citizens.
          </p>
          <Link
            href="/host/create"
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 transition-all inline-block"
          >
            Create Your First Listing →
          </Link>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="glass-panel rounded-2xl overflow-hidden hover:border-brand-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-44 bg-slate-900 relative">
                  <img
                    src={listing.photos[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
                        listing.isActive
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {listing.isActive ? "● Active" : "○ Inactive"}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs text-brand-400 font-medium mb-1">
                    📍 {listing.city}, {listing.state}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                    {listing.title}
                  </h3>
                  <div className="flex items-baseline gap-2 text-sm text-slate-300">
                    <span className="text-xl font-extrabold text-white">
                      ${Number(listing.pricePerNight).toFixed(2)}
                    </span>
                    <span className="text-slate-400">/ night</span>
                    <span className="text-xs text-brand-300 ml-auto">
                      Hold Fee: ${Number(listing.bookingFee).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-white/5 flex items-center justify-between gap-2 mt-4">
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  View Live Page →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
