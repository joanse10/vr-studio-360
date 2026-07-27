import AdminLayout from '@/components/AdminLayout';
import { prisma } from '@/lib/prisma';
import ClientsManager from './ClientsManager';

export const dynamic = 'force-dynamic';

async function getClients() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        access: {
          include: {
            collection: { select: { id: true, title: true, slug: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return clients;
  } catch {
    return [];
  }
}

async function getCollections() {
  try {
    const collections = await prisma.collection.findMany({
      select: { id: true, title: true, slug: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    return collections;
  } catch {
    return [];
  }
}

export default async function ClientsPage() {
  const [clients, collections] = await Promise.all([getClients(), getCollections()]);

  const serializedClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    accessToken: c.accessToken,
    createdAt: c.createdAt.toISOString(),
    access: c.access.map((a) => ({
      id: a.id,
      status: a.status,
      comment: a.comment,
      accessToken: a.accessToken,
      viewedAt: a.viewedAt?.toISOString() || null,
      approvedAt: a.approvedAt?.toISOString() || null,
      collection: a.collection,
    })),
  }));

  const serializedCollections = collections.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    status: c.status,
  }));

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-ink-50 mb-1 tracking-tight">Клиенты</h1>
        <p className="text-sm text-ink-300">Управление клиентами и доступом</p>
      </div>

      <ClientsManager
        clients={serializedClients}
        collections={serializedCollections}
      />
    </AdminLayout>
  );
}
