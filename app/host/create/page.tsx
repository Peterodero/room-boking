"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI",
  "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA",
  "WA", "WV", "WI", "WY"
];

const AMENITY_OPTIONS = [
  "High-Speed Wi-Fi",
  "Air Conditioning",
  "Fully Equipped Kitchen",
  "Free On-site Parking",
  "Washer & Dryer",
  "Dedicated Workspace",
  "Private Bathroom",
  "TV / Streaming",
];

type ListingType = "NIGHTLY" | "MONTHLY";

export default function CreateListingPage() {
  const router = useRouter();
  const [listingType, setListingType] = useState<ListingType>("NIGHTLY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  // Nightly fields
  const [pricePerNight, setPricePerNight] = useState("85.00");
  const [bookingFee, setBookingFee] = useState("15.00");
  // Monthly fields
  const [pricePerMonth, setPricePerMonth] = useState("900.00");
  const [depositAmount, setDepositAmount] = useState("500.00");
  const [maxGuests, setMaxGuests] = useState(2);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "High-Speed Wi-Fi",
    "Air Conditioning",
  ]);
  const [photos, setPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
  ]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleAmenity(amenity: string) {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  }

  function addPhoto() {
    const url = newPhotoUrl.trim();
    if (!url) return;
    if (photos.includes(url)) { setNewPhotoUrl(""); return; }
    setPhotos([...photos, url]);
    setNewPhotoUrl("");
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please sign in or create an account first to host a room.");
      return;
    }

    if (photos.length === 0) {
      setError("Please add at least one room photo before publishing.");
      return;
    }

    setSubmitting(true);
    try {
      const baseData = {
        listingType,
        title,
        description,
        address,
        city,
        state,
        maxGuests,
        amenities: selectedAmenities,
        photos,
      };

      const payload =
        listingType === "NIGHTLY"
          ? { ...baseData, pricePerNight: Number(pricePerNight), bookingFee: Number(bookingFee) }
          : { ...baseData, pricePerMonth: Number(pricePerMonth), depositAmount: Number(depositAmount) };

      const listing = await api.post("/listings", payload);
      router.push(`/listings/${listing.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to publish listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-brand-400 hover:underline">
            ← Home
          </Link>
          <h1 className="text-3xl font-extrabold font-heading text-white mt-1">List Your US Room</h1>
          <p className="text-sm text-slate-400">Publish a new room rental for verified US travelers</p>
        </div>
        <span className="text-2xl">🏡</span>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Listing Type Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Listing Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["NIGHTLY", "MONTHLY"] as ListingType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setListingType(type)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  listingType === type
                    ? "bg-brand-600/20 border-brand-500 text-white"
                    : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-2xl">{type === "NIGHTLY" ? "🌙" : "📅"}</span>
                <div>
                  <div className="font-bold text-sm">{type === "NIGHTLY" ? "Nightly Stay" : "Monthly Rental"}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {type === "NIGHTLY" ? "Short stays • Check-in / check-out" : "Long-term • Deposit + monthly rent"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Listing Title
          </label>
          <input
            type="text"
            required
            placeholder={
              listingType === "NIGHTLY"
                ? "e.g. Cozy Private Master Suite in Downtown Austin"
                : "e.g. Spacious 1BR Monthly Rental in Miami Beach"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            required
            rows={4}
            placeholder="Describe the room, building, neighborhood, and house rules..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              required
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              City
            </label>
            <input
              type="text"
              required
              placeholder="Miami"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              US State
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              {US_STATES.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rates & Capacity Grid — changes by type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {listingType === "NIGHTLY" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  🌙 Nightly Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Booking Hold Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={bookingFee}
                  onChange={(e) => setBookingFee(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  📅 Monthly Rent ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={pricePerMonth}
                  onChange={(e) => setPricePerMonth(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  🔑 Security Deposit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Max Guest Capacity
            </label>
            <input
              type="number"
              min={1}
              max={10}
              required
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {listingType === "MONTHLY" && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            💡 Monthly rent is collected <strong>in person at the property</strong>. Only the deposit is collected via Cash App through this platform.
          </div>
        )}

        {/* Photos Manager */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Room Photos ({photos.length} added)
          </label>

          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {photos.map((url, idx) => (
                <div key={idx} className="relative flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border border-white/10 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="text-white text-xs bg-rose-600 hover:bg-rose-500 rounded-full w-6 h-6 flex items-center justify-center font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-brand-600/90 text-white px-1.5 py-0.5 rounded">
                      COVER
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste an image URL and click Add..."
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhoto())}
              className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={addPhoto}
              disabled={!newPhotoUrl.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-600/80 hover:bg-brand-500 text-sm font-semibold text-white transition-all disabled:opacity-40 whitespace-nowrap"
            >
              + Add
            </button>
          </div>
          {photos.length === 0 && (
            <p className="text-xs text-rose-400 mt-1">⚠️ At least one photo is required.</p>
          )}
          <p className="text-[11px] text-slate-500 mt-1.5">
            Tip: Use links from Unsplash, Google Photos, Imgur, or your own hosted images.
            The first photo becomes the cover image.
          </p>
        </div>

        {/* Amenities Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Select Included Amenities
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map((amenity) => {
              const checked = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                    checked
                      ? "bg-brand-600/20 border-brand-500 text-white"
                      : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {checked ? "✓ " : "+ "}{amenity}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-sm text-white shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
        >
          {submitting ? "Publishing Listing..." : `Publish ${listingType === "NIGHTLY" ? "Nightly" : "Monthly"} Listing →`}
        </button>
      </form>
    </div>
  );
}
