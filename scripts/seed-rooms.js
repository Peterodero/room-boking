const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Category-Specific Photo Pools ──────────────────────────────────────────
// Each category has curated, distinct photo sets showing actual matching room layouts.

const SINGLE_ROOM_POOLS = [
  [
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1540518614846-7ede433c517a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
  ],
];

const BEDSITTER_POOLS = [
  [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
  ],
];

const ONE_BEDROOM_POOLS = [
  [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  ],
];

const TWO_BEDROOMS_POOLS = [
  [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  ],
];

const THREE_PLUS_BEDROOMS_POOLS = [
  [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  ],
];

const NIGHTLY_POOLS = [
  [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1568495248636-6432897944d1?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1568495248636-6432897944d1?auto=format&fit=crop&w=800&q=80",
  ],
];

// ─── Fixed photo pools per category ─────────────────────────────────────────
// Pulled from the curated *_POOLS arrays above (specific, known Unsplash photo
// IDs — not a live random-image API). Deduplicated so each ID appears once
// per category pool.
function uniquePhotoIds(setsOfUrls) {
  const seen = new Set();
  const ids = [];
  for (const set of setsOfUrls) {
    for (const url of set) {
      const match = url.match(/photo-[\w-]+/);
      if (match && !seen.has(match[0])) {
        seen.add(match[0]);
        ids.push(match[0]);
      }
    }
  }
  return ids;
}

const CATEGORY_PHOTO_IDS = {
  SINGLE_ROOM: uniquePhotoIds(SINGLE_ROOM_POOLS),
  BEDSITTER: uniquePhotoIds(BEDSITTER_POOLS),
  ONE_BEDROOM: uniquePhotoIds(ONE_BEDROOM_POOLS),
  TWO_BEDROOMS: uniquePhotoIds(TWO_BEDROOMS_POOLS),
  // Three-plus-bedroom homes borrow the two-bedroom set too, since both read
  // as "full apartment/house interior" and this keeps the pool from being tiny.
  THREE_PLUS_BEDROOMS: uniquePhotoIds([...THREE_PLUS_BEDROOMS_POOLS, ...TWO_BEDROOMS_POOLS]),
  NIGHTLY: uniquePhotoIds(NIGHTLY_POOLS),
};

function photoUrl(id, size) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${size}&q=80`;
}

// Deterministically picks 3 photos per listing from its category's fixed pool.
// Instead of picking randomly (which clusters and repeats), it walks the pool
// in evenly spaced steps starting from a seed-based offset, so:
//   - every listing gets 3 different photos from each other
//   - consecutive listings (same city/category) land on different offsets,
//     so they don't show the same trio back-to-back
// The underlying photos are still a finite, fixed set (not fresh per listing) —
// but nothing is broken, random, or obviously duplicated to someone browsing.
function pickPhotosForListing(listingType, category, seed) {
  const key = listingType === "NIGHTLY" ? "NIGHTLY" : category;
  const pool = CATEGORY_PHOTO_IDS[key] || CATEGORY_PHOTO_IDS.NIGHTLY;
  const n = pool.length;

  const step = Math.max(1, Math.floor(n / 3));
  const offset = seed % n;
  const picks = [offset % n, (offset + step) % n, (offset + step * 2) % n];

  const sizes = [1000, 800, 800];
  return picks.map((i, pos) => photoUrl(pool[i], sizes[pos]));
}

const ALL_AMENITIES = [
  "High-Speed Wi-Fi",
  "Air Conditioning",
  "Fully Equipped Kitchen",
  "Free On-site Parking",
  "Washer & Dryer",
  "Dedicated Workspace",
  "Private Bathroom",
  "TV / Streaming",
];

function pickAmenities(seed) {
  const shuffled = [...ALL_AMENITIES].sort(() => Math.sin(seed * 9301) - 0.5);
  return shuffled.slice(0, 4 + (seed % 4));
}

// ─── 50 US cities across all major states ────────────────────────────────────
const US_CITIES = [
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },
  { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" },
  { city: "Jacksonville", state: "FL" },
  { city: "San Francisco", state: "CA" },
  { city: "Columbus", state: "OH" },
  { city: "Charlotte", state: "NC" },
  { city: "Indianapolis", state: "IN" },
  { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" },
  { city: "Washington DC", state: "DC" },
  { city: "Nashville", state: "TN" },
  { city: "Oklahoma City", state: "OK" },
  { city: "El Paso", state: "TX" },
  { city: "Boston", state: "MA" },
  { city: "Portland", state: "OR" },
  { city: "Las Vegas", state: "NV" },
  { city: "Memphis", state: "TN" },
  { city: "Louisville", state: "KY" },
  { city: "Baltimore", state: "MD" },
  { city: "Milwaukee", state: "WI" },
  { city: "Albuquerque", state: "NM" },
  { city: "Tucson", state: "AZ" },
  { city: "Fresno", state: "CA" },
  { city: "Sacramento", state: "CA" },
  { city: "Mesa", state: "AZ" },
  { city: "Kansas City", state: "MO" },
  { city: "Atlanta", state: "GA" },
  { city: "Omaha", state: "NE" },
  { city: "Colorado Springs", state: "CO" },
  { city: "Raleigh", state: "NC" },
  { city: "Miami", state: "FL" },
  { city: "Long Beach", state: "CA" },
  { city: "Virginia Beach", state: "VA" },
  { city: "Minneapolis", state: "MN" },
  { city: "Tampa", state: "FL" },
  { city: "New Orleans", state: "LA" },
  { city: "Arlington", state: "TX" },
  { city: "Bakersfield", state: "CA" },
  { city: "Honolulu", state: "HI" },
  { city: "Anaheim", state: "CA" },
  { city: "Aurora", state: "CO" },
];

const CATEGORY_NAMES = {
  SINGLE_ROOM: "Single Room",
  BEDSITTER: "Bedsitter / Studio",
  ONE_BEDROOM: "1 Bedroom Apartment",
  TWO_BEDROOMS: "2 Bedroom Apartment",
  THREE_PLUS_BEDROOMS: "3 Bedroom Home",
};

const MONTHLY_PRICES_MAP = {
  SINGLE_ROOM: [450, 500, 550, 600, 650],
  BEDSITTER: [650, 700, 750, 800, 850],
  ONE_BEDROOM: [850, 950, 1050, 1150, 1250],
  TWO_BEDROOMS: [1200, 1350, 1500, 1650, 1800],
  THREE_PLUS_BEDROOMS: [1800, 2000, 2200, 2400, 2600],
};

const DEPOSITS_MAP = {
  SINGLE_ROOM: [350, 400, 500],
  BEDSITTER: [500, 600, 700],
  ONE_BEDROOM: [750, 850, 1000],
  TWO_BEDROOMS: [1000, 1200, 1500],
  THREE_PLUS_BEDROOMS: [1500, 1800, 2000],
};

const NIGHTLY_PRICES = [65, 75, 85, 95, 100, 110, 120, 135, 145, 155];
const BOOKING_FEES = [10, 12, 15, 18, 20, 22, 25];
const ADDRESSES = ["100 Main St", "204 Oak Ave", "375 Elm Blvd", "512 Maple Dr", "730 Pine Rd",
  "88 Commerce St", "1401 Park Ln", "2200 Broadway", "550 River Rd", "999 Center Ave"];

const ROOM_CATEGORIES = ["SINGLE_ROOM", "BEDSITTER", "ONE_BEDROOM", "TWO_BEDROOMS", "THREE_PLUS_BEDROOMS"];

function buildListings() {
  const listings = [];
  let seed = 0;

  for (const loc of US_CITIES) {
    // 5 monthly rentals PER category per city (5 categories × 5 rooms = 25 monthly rooms per city)
    for (let c = 0; c < ROOM_CATEGORIES.length; c++) {
      const cat = ROOM_CATEGORIES[c];
      const catLabel = CATEGORY_NAMES[cat];
      const prices = MONTHLY_PRICES_MAP[cat];
      const deposits = DEPOSITS_MAP[cat];

      for (let r = 0; r < 5; r++) {
        seed++;
        listings.push({
          listingType: "MONTHLY",
          roomCategory: cat,
          title: `${catLabel} #${r + 1} in ${loc.city}, ${loc.state}`,
          description: `Clean, modern ${catLabel.toLowerCase()} available for monthly lease in prime ${loc.city} location. Features high-speed Wi-Fi, modern finishes, and convenient access to transit and dining.`,
          address: ADDRESSES[seed % ADDRESSES.length],
          city: loc.city,
          state: loc.state,
          pricePerMonth: prices[seed % prices.length],
          depositAmount: deposits[seed % deposits.length],
          bookingFee: 0,
          maxGuests: cat === "SINGLE_ROOM" ? 1 : cat === "BEDSITTER" ? 2 : cat === "ONE_BEDROOM" ? 2 : 4,
          amenities: pickAmenities(seed),
          photos: pickPhotosForListing("MONTHLY", cat, seed),
        });
      }
    }

    // 5 nightly stays per city
    for (let n = 0; n < 5; n++) {
      seed++;
      listings.push({
        listingType: "NIGHTLY",
        title: `Nightly Guest Room #${n + 1} in ${loc.city}, ${loc.state}`,
        description: `Comfortable private guest room for nightly stays in ${loc.city}. Includes fresh linens, Wi-Fi, air conditioning, and 24-hour self check-in.`,
        address: ADDRESSES[seed % ADDRESSES.length],
        city: loc.city,
        state: loc.state,
        pricePerNight: NIGHTLY_PRICES[seed % NIGHTLY_PRICES.length],
        bookingFee: BOOKING_FEES[seed % BOOKING_FEES.length],
        maxGuests: 1 + (seed % 2),
        amenities: pickAmenities(seed),
        photos: pickPhotosForListing("NIGHTLY", null, seed),
      });
    }

    // 2 plots / land for sale per city
    const PLOT_SIZES = ["0.25 Acres", "0.5 Acres", "1.0 Acre", "50x100 ft", "2.5 Acres"];
    const SALE_PRICES = [15000, 25000, 35000, 48000, 65000, 85000, 120000];

    for (let p = 0; p < 2; p++) {
      seed++;
      const salePrice = SALE_PRICES[seed % SALE_PRICES.length];
      const depositAmount = Math.round(salePrice * 0.1);
      listings.push({
        listingType: "PLOT_SALE",
        title: `Residential / Commercial Plot #${p + 1} in ${loc.city}, ${loc.state}`,
        description: `Prime prime land plot available for sale in ${loc.city}, ${loc.state}. Clean title deed, accessible roads, electricity, and water connection ready.`,
        address: ADDRESSES[seed % ADDRESSES.length],
        city: loc.city,
        state: loc.state,
        salePrice,
        depositAmount,
        plotSize: PLOT_SIZES[seed % PLOT_SIZES.length],
        bookingFee: 100,
        maxGuests: 1,
        amenities: ["Surveyed Title Deed", "Electricity Ready", "Paved Road Access", "Water Supply"],
        photos: [
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80",
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80",
        ],
      });
    }
  }

  return listings;
}

async function main() {
  console.log("Seeding category-matched US room and plot listings...\n");

  const systemAdminPasswordHash = await bcrypt.hash("AdminPass123!", 10);
  const systemAdmin = await prisma.user.upsert({
    where: { email: "admin@roomstays.us" },
    update: { role: "ADMIN" },
    create: {
      username: "admin",
      email: "admin@roomstays.us",
      passwordHash: systemAdminPasswordHash,
      name: "RoomStays Admin",
      role: "ADMIN",
      isUSCitizen: true,
    },
  });

  console.log(`👤 Internal System Admin: ${systemAdmin.name} (${systemAdmin.email})\n`);

  // Wipe existing data in dependency order (payments → bookings → listings)
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.listing.deleteMany({});

  const listings = buildListings();
  const data = listings.map((room) => ({
    hostId: systemAdmin.id,
    listingType: room.listingType,
    roomCategory: room.roomCategory || null,
    title: room.title,
    description: room.description,
    address: room.address,
    city: room.city,
    state: room.state,
    pricePerNight: room.pricePerNight || null,
    pricePerMonth: room.pricePerMonth || null,
    depositAmount: room.depositAmount || null,
    salePrice: room.salePrice || null,
    plotSize: room.plotSize || null,
    bookingFee: room.bookingFee,
    maxGuests: room.maxGuests,
    amenities: room.amenities,
    photos: room.photos,
    isActive: true,
  }));

  // Bulk insert all listings
  await prisma.listing.createMany({ data });

  const monthly = listings.filter((l) => l.listingType === "MONTHLY").length;
  const nightly = listings.filter((l) => l.listingType === "NIGHTLY").length;
  const plots = listings.filter((l) => l.listingType === "PLOT_SALE").length;

  console.log(`\n\n✅ Done! Seeded:`);
  console.log(`   📅 ${monthly} monthly rental listings (Single Rooms, Bedsitters, 1-3 Bedrooms)`);
  console.log(`   🌙 ${nightly} nightly stay listings`);
  console.log(`   🏞️ ${plots} land / plot sale listings`);
  console.log(`   📍 Across ${US_CITIES.length} US cities in all major states\n`);
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });