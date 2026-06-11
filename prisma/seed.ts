import { PrismaClient } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Password hash
  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create test users (upsert for idempotency)
  const carlos = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      email: 'carlos@example.com',
      passwordHash,
    },
  });
  const ana = await prisma.user.upsert({
    where: { email: 'ana@example.com' },
    update: {},
    create: {
      email: 'ana@example.com',
      passwordHash,
    },
  });

  // 3. Create global categories (upsert for idempotency)
  const alimentacion = await prisma.category.upsert({
    where: { name: 'Alimentación' },
    update: {},
    create: { name: 'Alimentación' },
  });
  const transporte = await prisma.category.upsert({
    where: { name: 'Transporte' },
    update: {},
    create: { name: 'Transporte' },
  });
  const sueldo = await prisma.category.upsert({
    where: { name: 'Sueldo' },
    update: {},
    create: { name: 'Sueldo' },
  });

  // 4. Reset and recreate transactions (idempotent)
  await prisma.transaction.deleteMany();

  // Carlos transactions
  await prisma.transaction.create({
    data: {
      userId: carlos.id,
      categoryId: sueldo.id,
      amount: 500000,
      type: 'income',
      description: 'Sueldo empresa A',
      date: new Date('2026-05-01'),
      receiptUrl:
        'https://pub-3329e0de8b4441a79e8d44ffdb4fd21b.r2.dev/receipts/test.jpg',
    },
  });
  await prisma.transaction.create({
    data: {
      userId: carlos.id,
      categoryId: alimentacion.id,
      amount: 30000,
      type: 'expense',
      description: 'Compras feria',
      date: new Date('2026-05-02'),
    },
  });
  await prisma.transaction.create({
    data: {
      userId: carlos.id,
      categoryId: transporte.id,
      amount: 40000,
      type: 'expense',
      description: 'Carga tarjeta transporte',
      date: new Date('2026-05-01'),
      receiptUrl:
        'https://pub-3329e0de8b4441a79e8d44ffdb4fd21b.r2.dev/receipts/test_2.jpg',
      latitude: 120.65,
      longitude: 98.23,
    },
  });

  // Ana transactions
  await prisma.transaction.create({
    data: {
      userId: ana.id,
      categoryId: sueldo.id,
      amount: 800000,
      type: 'income',
      description: 'Sueldo empresa B',
      date: new Date('2026-05-01'),
      receiptUrl:
        'https://pub-3329e0de8b4441a79e8d44ffdb4fd21b.r2.dev/receipts/test.jpg',
    },
  });
  console.log('Seed ejecutado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
