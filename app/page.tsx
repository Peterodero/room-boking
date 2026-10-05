"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

type ListingType = "NIGHTLY" | "MONTHLY" | "PLOT_SALE";

type Listing = {
  id: string;
  listingType: ListingType;
  roomCategory?: string;
  title: string;
  description: string;
  city: string;
  state: string;
  pricePerNight?: string;
  pricePerMonth?: string;
  salePrice?: string;
  plotSize?: string;
  bookingFee: string;
  depositAmount?: string;
  maxGuests: number;
  photos: string[];
  amenities: string[];
};

const ROOM_CATEGORY_MAP: Record<string, { label: string }> = {
  SINGLE_ROOM: { label: "Single Room" },
  BEDSITTER: { label: "Bedsitter / Studio" },
  ONE_BEDROOM: { label: "1 Bedroom" },
  TWO_BEDROOMS: { label: "2 Bedrooms" },
  THREE_PLUS_BEDROOMS: { label: "3+ Bedrooms" },
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
];

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ListingType>("NIGHTLY");
  const [listings, setListings] = useState<Listing[]>([]);
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  async function search(type?: ListingType, category?: string) {
    const t = type ?? activeTab;
    const cat = category ?? selectedCategory;
    setLoading(true);
    setCurrentPage(1);
    const params = new URLSearchParams();
    params.set("type", t);
    if (city) params.set("city", city);
    if (selectedState && selectedState !== "All States") params.set("state", selectedState);
    if (cat && cat !== "ALL") params.set("roomCategory", cat);
    try {
      const data = await api.get(`/listings?${params.toString()}`);
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings", err);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(tab: ListingType) {
    setActiveTab(tab);
    if (tab === "NIGHTLY") {
      setSelectedCategory("ALL");
    }
    search(tab);
  }

  function handleCategoryClick(catKey: string) {
    setSelectedCategory(catKey);
    search(activeTab, catKey);
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(listings.length / itemsPerPage);
  const paginatedListings = listings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Header */}
      <section className="text-center pt-6 pb-2 relative">
        <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight leading-tight">
          Find &amp; Reserve Your Room <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
            Across the United States
          </span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Book a nightly stay or secure a monthly rental — instant holds, Cash App payments.
        </p>

        {/* Listing Type Toggle Tabs */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 gap-1.5 shadow-md flex-wrap">
            {(["NIGHTLY", "MONTHLY", "PLOT_SALE"] as ListingType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === tab
                    ? tab === "NIGHTLY"
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                      : tab === "MONTHLY"
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                      : "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab === "NIGHTLY" ? "Nightly Stays" : tab === "MONTHLY" ? "Monthly Rentals" : "Plots & Land for Sale"}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills for Monthly Rentals */}
        {activeTab === "MONTHLY" && (
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => handleCategoryClick("ALL")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === "ALL"
                  ? "bg-violet-600 text-white border-violet-600 shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-violet-400"
              }`}
            >
              All Types
            </button>
            {Object.entries(ROOM_CATEGORY_MAP).map(([key, item]) => (
              <button
                key={key}
                onClick={() => handleCategoryClick(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategory === key
                    ? "bg-violet-600 text-white border-violet-600 shadow-md"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-violet-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Zillow Search Bar Card */}
        <div className="mt-6 max-w-4xl mx-auto zillow-card p-4 sm:p-6 text-left shadow-xl space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              City / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Austin, Miami"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              US State
            </label>
            <input
              type="text"
              list="us-states-list"
              placeholder="e.g. California, NY"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <datalist id="us-states-list">
              {US_STATES.map((st) => (
                <option key={st.code} value={st.name}>
                  {st.name} ({st.code})
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <button
              onClick={() => search()}
              className={`w-full py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === "NIGHTLY"
                  ? "bg-brand-600 hover:bg-brand-500 shadow-brand-600/30"
                  : "bg-violet-600 hover:bg-violet-500 shadow-violet-600/30"
              }`}
            >
              Search {activeTab === "NIGHTLY" ? "Stays" : "Rentals"}
            </button>
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              {activeTab === "NIGHTLY" ? "Available Nightly Stays" : "Monthly Rental Listings"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {activeTab === "NIGHTLY"
                ? "Verified rooms with instant 15-minute Cash App hold locks"
                : "Long-term US rooms — Single Rooms, Bedsitters, 1-3 Bedrooms"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-3.5 py-1.5 rounded-full shadow-sm">
              {listings.length} {listings.length === 1 ? "Room" : "Rooms"} Total
            </span>
            {totalPages > 1 && (
              <span className="text-xs font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-3.5 py-1.5 rounded-full border border-brand-200 dark:border-brand-500/20">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 shadow-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">
              No {activeTab === "NIGHTLY" ? "nightly stays" : "monthly rentals"} found
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              No active listings matched your search. Try clearing filters or searching another US city.
            </p>
            <button
              onClick={() => { setCity(""); setSelectedState(""); setSelectedCategory("ALL"); search(); }}
              className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-500 transition-colors shadow-md"
            >
              Clear Search Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedListings.map((l, index) => {
                const photos = l.photos?.length ? l.photos : DEFAULT_PHOTOS;
                const isMonthly = l.listingType === "MONTHLY";
                const catInfo = l.roomCategory ? ROOM_CATEGORY_MAP[l.roomCategory] : null;

                return (
                  <div key={l.id} className="zillow-card group flex flex-col">
                    <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photos[0]}
                        alt={l.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PHOTOS[index % DEFAULT_PHOTOS.length];
                        }}
                      />
                      <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10 shadow-md">
                        {l.city}, {l.state}
                      </div>
                      <div className={`absolute top-3 right-3 text-white px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-md ${
                        l.listingType === "PLOT_SALE" ? "bg-amber-600" : isMonthly ? "bg-violet-600" : "bg-emerald-600"
                      }`}>
                        {l.listingType === "PLOT_SALE" ? "Plot Sale" : isMonthly ? "Monthly" : "Nightly"}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                      <div className="space-y-2">
                        <Link
                          href={`/listings/${l.id}`}
                          className="font-heading font-bold text-lg text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors line-clamp-1 block"
                        >
                          {l.title}
                        </Link>

                        {isMonthly && catInfo && (
                          <div>
                            <span className="inline-flex items-center text-[11px] font-extrabold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-200 dark:border-violet-500/20">
                              {catInfo.label}
                            </span>
                          </div>
                        )}

                        {l.listingType === "PLOT_SALE" && (
                          <div>
                            <span className="inline-flex items-center text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-500/20">
                              {l.plotSize || "Plot"}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {l.description || "Beautiful property available in prime US location."}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          {l.listingType === "PLOT_SALE" ? (
                            <>
                              <div>
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${l.salePrice}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400"> total</span>
                              </div>
                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-500/20">
                                Deposit: ${l.depositAmount || "2,500"}
                              </span>
                            </>
                          ) : isMonthly ? (
                            <>
                              <div>
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${l.pricePerMonth}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400"> / mo</span>
                              </div>
                              <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 rounded-md border border-violet-200 dark:border-violet-500/20">
                                Deposit: ${l.depositAmount}
                              </span>
                            </>
                          ) : (
                            <>
                              <div>
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${l.pricePerNight}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400"> / night</span>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                                Hold fee: ${l.bookingFee}
                              </span>
                            </>
                          )}
                        </div>

                        <Link
                          href={`/listings/${l.id}`}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-brand-600 dark:bg-slate-800 dark:hover:bg-brand-600 text-slate-900 hover:text-white dark:text-slate-100 dark:hover:text-white text-xs font-bold transition-all text-center block shadow-sm"
                        >
                          View Room Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-900 dark:text-slate-100">{(currentPage - 1) * itemsPerPage + 1}</span> – <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * itemsPerPage, listings.length)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{listings.length}</span> rooms
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    ← Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                            : "border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
