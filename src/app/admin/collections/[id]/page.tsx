import AdminLayout from '@/components/AdminLayout';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import CollectionEditor from './CollectionEditor';

export const dynamic = 'force-dynamic';

async function getCollection(id: string) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { order: 'asc' },
          include: { hotspotsFrom: true, infoHotspots: true },
        },
        beforeAfters: { orderBy: { order: 'asc' } },
        shareLinks: true,
        clientAccess: { include: { client: true } },
      },
    });
    return collection;
  } catch {
    return null;
  }
}

export default async function EditCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const collection = await getCollection(params.id);

  if (!collection) {
    notFound();
  }

  const serialized = {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    status: collection.status,
    coverImage: collection.coverImage,
    createdAt: collection.createdAt.toISOString(),
    rooms: collection.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      order: r.order,
      panoramaUrl: r.panoramaUrl,
      initialYaw: r.initialYaw,
      initialPitch: r.initialPitch,
      initialHfov: r.initialHfov,
      hotspots: r.hotspotsFrom.map((h) => ({
        id: h.id,
        yaw: h.yaw,
        pitch: h.pitch,
        toRoomId: h.toRoomId,
        label: h.label,
        icon: h.icon,
      })),
      infoHotspots: r.infoHotspots.map((ih) => ({
        id: ih.id,
        title: ih.title,
        description: ih.description,
        imageUrl: ih.imageUrl,
        linkUrl: ih.linkUrl,
        linkText: ih.linkText,
        yaw: ih.yaw,
        pitch: ih.pitch,
      })),
    })),
    beforeAfters: collection.beforeAfters.map((ba) => ({
      id: ba.id,
      title: ba.title,
      beforeImage: ba.beforeImage,
      afterImage: ba.afterImage,
    })),
    shareLinks: collection.shareLinks.map((sl) => ({
      id: sl.id,
      token: sl.token,
      type: sl.type,
      label: sl.label,
    })),
  };

  return (
    <AdminLayout>
      <CollectionEditor collection={serialized} />
    </AdminLayout>
  );
}
