const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email },
    update: { name: 'System Administrator', role: 'SUPERUSER', isActive: true, passwordHash },
    create: { email, name: 'System Administrator', role: 'SUPERUSER', passwordHash },
  });
  console.log(`Seeded SUPERUSER: ${email}`);
}

main().finally(() => prisma.$disconnect());
