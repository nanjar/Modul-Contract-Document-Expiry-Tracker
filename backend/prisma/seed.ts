import * as argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  name: string,
  password: string,
  role: Role,
) {
  const passwordHash = await argon2.hash(password);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role,
      isActive: true,
    },
    create: {
      email,
      name,
      passwordHash,
      role,
      isActive: true,
    },
  });
}

async function main() {
  const users = await Promise.all([
    upsertUser(
      'admin@example.com',
      'System Administrator',
      'Admin123!',
      Role.SUPERUSER,
    ),
    upsertUser(
      'editor@example.com',
      'Document Editor',
      'Editor123!',
      Role.EDITOR,
    ),
    upsertUser(
      'viewer@example.com',
      'Document Viewer',
      'Viewer123!',
      Role.VIEWER,
    ),
  ]);

  for (const user of users) {
    console.log(`Seeded ${user.role}: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
