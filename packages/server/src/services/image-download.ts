import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';

const MEDIA_PATH = process.env.NODE_ENV === 'production' ? '/media' : './media';

// Download an image from a URL and save it locally
export async function downloadAndSaveImage(url: string): Promise<{ id: string; filePath: string } | null> {
  try {
    // Ensure media directory exists
    await fs.mkdir(MEDIA_PATH, { recursive: true });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefApp/1.0)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to download image from ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? '.png'
      : contentType.includes('gif') ? '.gif'
      : contentType.includes('webp') ? '.webp'
      : '.jpg';

    const filename = `${uuidv4()}${ext}`;
    const localPath = path.join(MEDIA_PATH, filename);
    const filePath = `/media/${filename}`;

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(localPath, buffer);

    // Insert into step_images table (unassigned)
    const result = await db.query<{ id: string }>(
      `INSERT INTO step_images (file_path, step_index, sort_order)
       VALUES ($1, 0, 0)
       RETURNING id`,
      [filePath]
    );

    return {
      id: result.rows[0].id,
      filePath
    };
  } catch (err) {
    console.error(`Error downloading image from ${url}:`, err);
    return null;
  }
}

// Download multiple images in parallel
export async function downloadImages(urls: (string | undefined)[]): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  const downloads = urls.map(async (url, index) => {
    if (!url) return;
    const result = await downloadAndSaveImage(url);
    if (result) {
      results.set(index, result.id);
    }
  });

  await Promise.all(downloads);
  return results;
}
