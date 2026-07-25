import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../src/lib/utils';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`Admin user created: ${user.username}`);
  console.log(`Password: ${password}`);
  console.log('⚠️  Change the password in production!');

  const existingCollections = await prisma.collection.count();
  if (existingCollections === 0) {
    const demoCollection = await prisma.collection.create({
      data: {
        slug: 'demo-house',
        title: 'Демонстрационный дом',
        description: 'Пример 360° тура по загородному дому с переходами между комнатами.',
        status: 'public',
        coverImage: null,
        rooms: {
          create: [
            {
              name: 'Гостиная',
              order: 0,
              panoramaUrl: 'https://pannellum.org/images/alma.jpg',
              initialYaw: 0,
              initialPitch: 0,
              initialHfov: 100,
            },
            {
              name: 'Кухня',
              order: 1,
              panoramaUrl: 'https://pannellum.org/images/cerro-toco-0.jpg',
              initialYaw: 0,
              initialPitch: 0,
              initialHfov: 100,
            },
          ],
        },
        shareLinks: {
          create: {
            token: generateToken(),
            type: 'public',
            label: 'Демо-ссылка',
          },
        },
      },
    });

    console.log(`Demo collection created: ${demoCollection.slug}`);
  }

  console.log('\n✅ Seed completed!');
  console.log(`\nLogin at: http://localhost:3000/admin/login`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
