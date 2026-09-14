"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

type Listing = {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  pricePerNight: string;
  bookingFee: string;
  maxGuests: number;
  photos: string[];
  amenities: string[];
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
];

const US_STATES = [
  "All States", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", 
  "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", 
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", 
  "WA", "WV", "WI", "WY"
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [maxGuests, setMaxGuests] = useState(1);
  const [loading, setLoading] = useState(true);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (selectedState && selectedState !== "All States") params.set("state", selectedState);
    try {
      const data = await api.get(`/listings?${params.toString()}`);
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Header */}
      <section className="text-center pt-8 pb-4 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <span>🇺🇸</span> Exclusive US Citizen Room Rentals
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-white tracking-tight leading-tight">
          Find & Reserve Your Room <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Across the United States
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          Reserve holds instantly with guaranteed date overlap locks. Pay room booking fees seamlessly via Cash App Pay.
        </p>

        {/* Search Bar Card */}
        <div className="mt-8 max-w-4xl mx-auto glass-panel rounded-2xl p-4 sm:p-6 text-left shadow-2xl space-y-4 sm:space-y-0 sm:grid sm:grid-cols-4 sm:gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              City / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Austin, Miami, Seattle"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              {US_STATES.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Guests
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <button
              onClick={search}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-sm text-white shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>🔍</span> Search Rentals
            </button>
          </div>
        </div>
      </section>

      {/* Rentals Grid Header */}
      <section>
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold font-heading text-white">Available Room Listings</h2>
            <p className="text-sm text-slate-400">Showing verified rooms with instant Cash App hold reservations</p>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-full">
            {listings.length} {listings.length === 1 ? "Room" : "Rooms"} Found
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-900/60 rounded-2xl border border-white/5" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5 space-y-3">
            <div className="text-4xl">🏡</div>
            <h3 className="text-lg font-semibold text-slate-200">No rooms found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              No active room listings matched your search location. Try clearing filters or list a new room as a host!
            </p>
            <Link
              href="/host/create"
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-500 transition-colors"
            >
              + Create First Room Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l, index) => {
              const photo = l.photos?.[0] || DEFAULT_PHOTOS[index % DEFAULT_PHOTOS.length];
              return (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="group bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={l.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-slate-200 border border-white/10 flex items-center gap-1">
                      <span>📍</span> {l.city}, {l.state}
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow">
                      {l.maxGuests} {l.maxGuests === 1 ? "Guest" : "Guests"}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading font-bold text-lg text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                      {l.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-4 flex-1">
                      {l.description || "Beautiful private room rental available in prime US location."}
                    </p>

                    <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                      <div>
                        <span className="text-xl font-extrabold text-white">${l.pricePerNight}</span>
                        <span className="text-xs text-slate-400"> / night</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                          Hold fee: ${l.bookingFee}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
