import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../src/lib/utils';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Минимум 12 символов');
  if (!/[A-Z]/.test(password)) errors.push('Нужна заглавная буква');
  if (!/[0-9]/.test(password)) errors.push('Нужна цифра');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Нужен спецсимвол');
  return { valid: errors.length === 0, errors };
}

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  if (process.env.NODE_ENV === 'production') {
    const { valid, errors } = validatePassword(password);
    if (!valid) {
      console.error('❌ Admin password does not meet security requirements:');
      errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`Admin user created: ${user.username}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Password: ${password}`);
  }
  console.log('⚠️  Change the password in production!');

  const existingCollections = await prisma.collection.count();
  if (existingCollections === 0) {
    const demoCollection = await prisma.collection.create({
      data: {
        slug: 'demo-house',
        title: 'Демонстрационный дом',
        description: 'Пример 360° тура по загородному дому с переходами между комнатами.',
        status: 'public',
        coverImage: 'https://pannellum.org/images/alma.jpg',
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
        beforeAfters: {
          create: [
            {
              title: 'Гостиная — До и После',
              beforeImage: '/uploads/before-1.jpg',
              afterImage: '/uploads/after-1.jpg',
              order: 0,
            },
          ],
        },
      },
    });

    console.log(`Demo collection created: ${demoCollection.slug}`);
  }

  console.log('\n✅ Seed completed!');
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\nLogin at: http://localhost:3000/admin/login`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
  } else {
    console.log('\nLogin at your production URL');
    console.log(`Username: ${username}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
