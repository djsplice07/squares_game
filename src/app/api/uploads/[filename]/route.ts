/**
 * Uploaded file serving route
 *
 * Serves files from the uploads directory. This is needed in Next.js standalone
 * mode because dynamically-added files in public/uploads/ are not served as
 * static files (only files present at build time are included in the output).
 *
 * GET /api/uploads/[filename] — streams the file with correct Content-Type
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;

  // Prevent path traversal — only allow plain filenames
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
