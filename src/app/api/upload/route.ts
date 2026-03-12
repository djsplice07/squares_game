/**
 * Upload API Route
 *
 * Handles image uploads, gallery listing, and image deletion.
 *
 * POST   - Upload a new image (admin only)
 * GET    - List all images from uploads/ and images/ as a flat array (admin only)
 * DELETE - Delete an image by URL query param (admin only)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, readdir, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/** Absolute path to the user-uploaded images directory */
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/** Absolute path to the stock images directory */
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

/** Allowed MIME types for upload validation (checked server-side) */
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

/** Maximum upload file size in bytes (5 MB) */
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload
 *
 * Accepts a multipart form upload with a single 'file' field.
 * Validates MIME type and file size server-side, sanitizes the filename,
 * appends a timestamp to prevent collisions, and writes to the uploads directory.
 *
 * @returns {{ url: string }} The public URL path of the uploaded file
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Sanitize filename: keep only alphanumeric, hyphens, underscores, dots
    const ext = path.extname(file.name).toLowerCase();
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${baseName}_${timestamp}${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure the uploads directory exists before writing
    await mkdir(UPLOADS_DIR, { recursive: true });

    await writeFile(path.join(UPLOADS_DIR, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/**
 * GET /api/upload
 *
 * Returns a flat array of all available images (both user uploads and stock)
 * without any category distinction. Each entry contains { url, name }.
 *
 * @returns {{ images: Array<{ url: string, name: string }> }}
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const images: { url: string; name: string }[] = [];

    // List uploaded images
    if (existsSync(UPLOADS_DIR)) {
      const uploads = await readdir(UPLOADS_DIR);
      for (const file of uploads) {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
          images.push({ url: `/uploads/${file}`, name: file });
        }
      }
    }

    // List stock images
    if (existsSync(IMAGES_DIR)) {
      const stock = await readdir(IMAGES_DIR);
      for (const file of stock) {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
          images.push({ url: `/images/${file}`, name: file });
        }
      }
    }

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}

/**
 * DELETE /api/upload?url=/uploads/filename.png
 *
 * Deletes an image file from disk. Only allows deletion of files within
 * /uploads/ or /images/ directories. Uses path.basename() to prevent
 * path traversal attacks.
 *
 * @param request - Must include a `url` query parameter (e.g., /uploads/foo.png)
 * @returns {{ success: true }} on success, or an error response
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only allow deletion from known image directories
    if (!url.startsWith('/uploads/') && !url.startsWith('/images/')) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    // Extract only the filename to prevent path traversal (e.g., ../../etc/passwd)
    const fileName = path.basename(url);

    // Determine the target directory based on the URL prefix
    const targetDir = url.startsWith('/uploads/') ? UPLOADS_DIR : IMAGES_DIR;
    const filePath = path.join(targetDir, fileName);

    // Verify the resolved path is still within the expected directory
    if (!filePath.startsWith(targetDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
