const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Photo pools ────────────────────────────────────────────────────────────
const ROOM_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1540518614846-7ede433c517a?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1000&q=80",
];

// Pick 3 different photos for each listing
function pickPhotos(seed) {
  const start = seed % ROOM_PHOTOS.length;
  return [
    ROOM_PHOTOS[start % ROOM_PHOTOS.length],
    ROOM_PHOTOS[(start + 3) % ROOM_PHOTOS.length],
    ROOM_PHOTOS[(start + 6) % ROOM_PHOTOS.length],
  ];
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
  { city: "New York",       state: "NY" },
  { city: "Los Angeles",    state: "CA" },
  { city: "Chicago",        state: "IL" },
  { city: "Houston",        state: "TX" },
  { city: "Phoenix",        state: "AZ" },
  { city: "Philadelphia",   state: "PA" },
  { city: "San Antonio",    state: "TX" },
  { city: "San Diego",      state: "CA" },
  { city: "Dallas",         state: "TX" },
  { city: "San Jose",       state: "CA" },
  { city: "Austin",         state: "TX" },
  { city: "Jacksonville",   state: "FL" },
  { city: "San Francisco",  state: "CA" },
  { city: "Columbus",       state: "OH" },
  { city: "Charlotte",      state: "NC" },
  { city: "Indianapolis",   state: "IN" },
  { city: "Seattle",        state: "WA" },
  { city: "Denver",         state: "CO" },
  { city: "Washington DC",  state: "DC" },
  { city: "Nashville",      state: "TN" },
  { city: "Oklahoma City",  state: "OK" },
  { city: "El Paso",        state: "TX" },
  { city: "Boston",         state: "MA" },
  { city: "Portland",       state: "OR" },
  { city: "Las Vegas",      state: "NV" },
  { city: "Memphis",        state: "TN" },
  { city: "Louisville",     state: "KY" },
  { city: "Baltimore",      state: "MD" },
  { city: "Milwaukee",      state: "WI" },
  { city: "Albuquerque",    state: "NM" },
  { city: "Tucson",         state: "AZ" },
  { city: "Fresno",         state: "CA" },
  { city: "Sacramento",     state: "CA" },
  { city: "Mesa",           state: "AZ" },
  { city: "Kansas City",    state: "MO" },
  { city: "Atlanta",        state: "GA" },
  { city: "Omaha",          state: "NE" },
  { city: "Colorado Springs", state: "CO" },
  { city: "Raleigh",        state: "NC" },
  { city: "Miami",          state: "FL" },
  { city: "Long Beach",     state: "CA" },
  { city: "Virginia Beach", state: "VA" },
  { city: "Minneapolis",    state: "MN" },
  { city: "Tampa",          state: "FL" },
  { city: "New Orleans",    state: "LA" },
  { city: "Arlington",      state: "TX" },
  { city: "Bakersfield",    state: "CA" },
  { city: "Honolulu",       state: "HI" },
  { city: "Anaheim",        state: "CA" },
  { city: "Aurora",         state: "CO" },
];

// ─── Room title templates ────────────────────────────────────────────────────
const MONTHLY_TITLE_TEMPLATES = [
  "Spacious {adj} 1BR Monthly Room in {district}",
  "Modern {adj} Studio for Monthly Rent near {landmark}",
  "Private {adj} Master Suite — Monthly Rental, {city}",
  "Furnished {adj} Room — All Utilities Included, {city}",
  "Cozy {adj} Long-term Room near {landmark}",
  "Executive {adj} Guest Suite — Monthly, {district}",
  "Quiet {adj} Private Room with Parking, {city}",
  "Sunny {adj} Apartment Room — Monthly in {district}",
];

const NIGHTLY_TITLE_TEMPLATES = [
  "Luxury {adj} Room in {district}, {city}",
  "Cozy {adj} Private Suite near {landmark}",
  "Modern {adj} Room — Nightly Stay in {city}",
  "Bright {adj} Master Room with {feature}, {city}",
  "Chic {adj} Studio Bedroom near {landmark}",
  "Sleek {adj} Loft Room in Downtown {city}",
];

const ADJECTIVES = ["Modern", "Spacious", "Luxurious", "Bright", "Stylish", "Elegant", "Cozy", "Pristine", "Updated", "Premier"];
const DISTRICTS  = ["Downtown", "Midtown", "Uptown", "West Side", "East End", "Old Town", "Waterfront", "Arts District", "Business District"];
const LANDMARKS  = ["City Hall", "Central Park", "the Airport", "University Row", "the Convention Center", "the Metro Station", "Main Street"];
const FEATURES   = ["City Views", "Private Bath", "Free Parking", "a Balcony", "Garden Access", "Skyline Views"];

function template(tpl, loc, seed) {
  const adj      = ADJECTIVES[seed % ADJECTIVES.length];
  const district = DISTRICTS[(seed + 2) % DISTRICTS.length];
  const landmark = LANDMARKS[(seed + 3) % LANDMARKS.length];
  const feature  = FEATURES[(seed + 1) % FEATURES.length];
  return tpl
    .replace("{adj}", adj)
    .replace("{city}", loc.city)
    .replace("{district}", district)
    .replace("{landmark}", `${loc.city} ${landmark}`)
    .replace("{feature}", feature);
}

const MONTHLY_DESCRIPTIONS = [
  "Clean, fully furnished private room in a well-maintained property. Includes all utilities (electricity, water, Wi-Fi). Perfect for working professionals or long-term travelers. Month-to-month lease. Security deposit required upfront.",
  "Comfortable private room in a shared house with common areas. Quiet neighborhood, easy access to public transit. All amenities included. Deposit paid online — rent paid directly at the property each month.",
  "Bright private room with large windows and natural light. Shared kitchen and laundry on-site. Ideal for students or remote workers. Move in as soon as deposit is confirmed.",
  "Spacious private bedroom with in-room closet. Housemates are clean, respectful professionals. House rules: no smoking inside. Rent is due on the 1st of each month — paid at property. Deposit locks in your room.",
  "Modern furnished room in a safe, central neighborhood. Fast Wi-Fi, air conditioning, and free parking included. Long-term tenants preferred. Reserve and pay deposit online — move in on your selected date.",
  "Well-lit guest suite with private entrance. Suitable for 1-2 people. Near shops, restaurants, and transport links. Security deposit confirms your reservation; monthly rent due in person.",
];

const NIGHTLY_DESCRIPTIONS = [
  "Stylish private room in a prime location. High-speed Wi-Fi, fresh linens, and 24-hour check-in. Perfect for business trips or weekend getaways.",
  "Cozy private suite with ensuite bathroom and all essentials provided. Quiet street, walking distance to restaurants and transit.",
  "Modern room with city views, plush bedding, and fast fiber internet. Daily cleaning service available on request.",
  "Bright, airy room with quality furnishings and smart TV. Fully equipped shared kitchen and free parking on-site.",
  "Comfortable private bedroom with blackout curtains, memory foam mattress, and a dedicated desk for remote work.",
];

const MONTHLY_PRICES = [650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1300, 1400, 1500];
const DEPOSITS      = [500, 600, 700, 750, 800, 1000, 1200];
const NIGHTLY_PRICES = [65, 75, 85, 95, 100, 110, 120, 135, 145, 155];
const BOOKING_FEES  = [10, 12, 15, 18, 20, 22, 25];
const ADDRESSES     = ["100 Main St", "204 Oak Ave", "375 Elm Blvd", "512 Maple Dr", "730 Pine Rd",
                       "88 Commerce St", "1401 Park Ln", "2200 Broadway", "550 River Rd", "999 Center Ave"];

// Build listings: 3 monthly + 2 nightly per city = 250 listings across 50 cities
function buildListings() {
  const listings = [];
  let seed = 0;

  for (const loc of US_CITIES) {
    // 3 monthly rentals per city
    for (let m = 0; m < 3; m++) {
      seed++;
      const tpl = MONTHLY_TITLE_TEMPLATES[seed % MONTHLY_TITLE_TEMPLATES.length];
      listings.push({
        listingType: "MONTHLY",
        title: template(tpl, loc, seed),
        description: MONTHLY_DESCRIPTIONS[seed % MONTHLY_DESCRIPTIONS.length],
        address: ADDRESSES[seed % ADDRESSES.length],
        city: loc.city,
        state: loc.state,
        pricePerMonth: MONTHLY_PRICES[seed % MONTHLY_PRICES.length],
        depositAmount: DEPOSITS[seed % DEPOSITS.length],
        bookingFee: 0,
        maxGuests: 1 + (seed % 3),
        amenities: pickAmenities(seed),
        photos: pickPhotos(seed),
      });
    }

    // 2 nightly stays per city
    for (let n = 0; n < 2; n++) {
      seed++;
      const tpl = NIGHTLY_TITLE_TEMPLATES[seed % NIGHTLY_TITLE_TEMPLATES.length];
      listings.push({
        listingType: "NIGHTLY",
        title: template(tpl, loc, seed),
        description: NIGHTLY_DESCRIPTIONS[seed % NIGHTLY_DESCRIPTIONS.length],
        address: ADDRESSES[seed % ADDRESSES.length],
        city: loc.city,
        state: loc.state,
        pricePerNight: NIGHTLY_PRICES[seed % NIGHTLY_PRICES.length],
        bookingFee: BOOKING_FEES[seed % BOOKING_FEES.length],
        maxGuests: 1 + (seed % 3),
        amenities: pickAmenities(seed),
        photos: pickPhotos(seed),
      });
    }
  }

  return listings;
}

async function main() {
  console.log("🌱 Seeding comprehensive US room listings (nightly + monthly)...\n");

  // Get or create default host user
  const hostPasswordHash = await bcrypt.hash("HostPass123!", 10);
  const host = await prisma.user.upsert({
    where: { email: "host@roomstays.us" },
    update: { role: "HOST" },
    create: {
      username: "host_peter",
      email: "host@roomstays.us",
      passwordHash: hostPasswordHash,
      name: "Peter Host",
      role: "HOST",
      isUSCitizen: true,
    },
  });

  console.log(`👤 Host: ${host.name} (${host.email})\n`);

  const listings = buildListings();
  let monthly = 0, nightly = 0;

  for (const room of listings) {
    await prisma.listing.create({
      data: {
        hostId: host.id,
        listingType: room.listingType,
        title: room.title,
        description: room.description,
        address: room.address,
        city: room.city,
        state: room.state,
        pricePerNight: room.pricePerNight || null,
        pricePerMonth: room.pricePerMonth || null,
        depositAmount: room.depositAmount || null,
        bookingFee: room.bookingFee,
        maxGuests: room.maxGuests,
        amenities: room.amenities,
        photos: room.photos,
        isActive: true,
      },
    });
    if (room.listingType === "MONTHLY") monthly++;
    else nightly++;
    process.stdout.write(`\r  📦 Seeded ${monthly + nightly}/${listings.length} listings...`);
  }

  console.log(`\n\n✅ Done! Seeded:`);
  console.log(`   📅 ${monthly} monthly rental listings`);
  console.log(`   🌙 ${nightly} nightly stay listings`);
  console.log(`   📍 Across ${US_CITIES.length} US cities in all major states`);
  console.log(`\n🔑 Host login: email=host@roomstays.us  password=HostPass123!\n`);
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
