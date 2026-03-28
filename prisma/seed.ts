import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Running seed script...');

  const organization = await prisma.organization.upsert({
    where: { email: 'prewedding.attire.onrent@gmail.com' },
    update: {},
    create: {
      organizationName: 'Pre Wedding Attire',
      ownerName: 'admim',
      description: 'Pre wedding attire',
      isActive: true,
      email: 'prewedding.admin.onrent@gmail.com',
      contactNumber: '9113089501',
      address: '375 3rd main, 9th cross, RHCS layout annapurneswari nagar banglore-560091',
      logo: '',
      activeTill: new Date('2026-07-19'),
      billingRules: ['bjkbckj kjs c'],
    },
  });

  const email = 'prewedding.admin.onrent@gmail.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'admin',
      email,
      password: hashedPassword,
      role: 'superAdmin',
      isActive: true,
      organizationId: organization.id,
    },
  });
 const statsPassword = 'Test@2025';
  const hashedStatsPassword = await bcrypt.hash(statsPassword, 10);

  await prisma.settings.upsert({
    where: { key: 'statisticsPassword' },
    update: { value: hashedStatsPassword },
    create: { key: 'statisticsPassword', value: hashedStatsPassword },
  });

  console.log('Default organization, admin user, and statistics password seeded successfully!');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
