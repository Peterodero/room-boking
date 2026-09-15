const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];
  const email = process.argv[4] || `${username || "admin"}@roomstays.us`;
  const name = process.argv[5] || "System Admin";

  if (!username || !password) {
    console.log("Usage: node scripts/create-admin.js <username> <password> [email] [name]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      role: "ADMIN",
      passwordHash,
      isUSCitizen: true,
    },
    create: {
      username,
      email,
      passwordHash,
      name,
      role: "ADMIN",
      isUSCitizen: true,
    },
  });

  console.log(`✅ Admin account created/updated successfully for Username: "${user.username}" (Email: ${user.email}, Role: ${user.role})`);
}

main()
  .catch((e) => {
    console.error("Error creating admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
