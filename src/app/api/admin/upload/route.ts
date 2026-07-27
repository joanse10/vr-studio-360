import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const FILE_SIGNATURES: Record<string, number[]> = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
};

function verifyFileSignature(buffer: Buffer, ext: string): boolean {
  const signature = FILE_SIGNATURES[ext];
  if (!signature) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  const ip = getClientIp(req);
  const { allowed } = rateLimit(`upload:${ip}`, RATE_LIMITS.UPLOAD.limit, RATE_LIMITS.UPLOAD.windowMs);
  if (!allowed) {
    return NextResponse.json({ error: 'Слишком много загрузок. Попробуйте позже.' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'image';

    if (!file) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    }

    const allowedTypes = Object.keys(ALLOWED_MIME_TYPES);
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс 50MB)' }, { status: 400 });
    }

    const ext = ALLOWED_MIME_TYPES[file.type] || 'jpg';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!verifyFileSignature(buffer, ext)) {
      return NextResponse.json({ error: 'Файл повреждён или подделан' }, { status: 400 });
    }

    const filename = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filepath = path.join(uploadDir, filename);

    // Path traversal protection
    const resolvedPath = path.resolve(filepath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch {
      // dir exists
    }

    // Re-encode through sharp to strip EXIF metadata and embedded payloads
    const processedBuffer = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const safeFilename = `${uuidv4()}.jpg`;
    const safePath = path.join(uploadDir, safeFilename);
    const resolvedSafePath = path.resolve(safePath);
    if (!resolvedSafePath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    await fs.writeFile(resolvedSafePath, processedBuffer);

    const url = `/uploads/${safeFilename}`;

    return NextResponse.json({ url, filename: safeFilename, type: 'jpg' });
  } catch {
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
