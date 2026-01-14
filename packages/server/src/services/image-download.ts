import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MEDIA_PATH = process.env.NODE_ENV === 'production' ? '/media' : './media';

/**
 * Check if a URL is external (not already on our server)
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Download an image from an external URL and save it to /media
 * Returns the local file path (e.g., /media/uuid.jpg) or null if failed
 */
export async function downloadImage(url: string): Promise<string | null> {
  try {
    // Ensure media directory exists
    await fs.mkdir(MEDIA_PATH, { recursive: true });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefApp/1.0)',
        'Referer': new URL(url).origin // Some sites check referer
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.error(`Failed to download image from ${url}: ${response.status}`);
      return null;
    }

    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('webp')) ext = '.webp';

    const filename = `${uuidv4()}${ext}`;
    const localPath = path.join(MEDIA_PATH, filename);
    const filePath = `/media/${filename}`;

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(localPath, buffer);

    return filePath;
  } catch (err) {
    console.error(`Error downloading image from ${url}:`, err);
    return null;
  }
}

/**
 * Download multiple images in parallel
 * Returns a map of original URL -> local path
 */
export async function downloadImages(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  const downloads = urls.map(async (url) => {
    if (!isExternalUrl(url)) return;
    const localPath = await downloadImage(url);
    if (localPath) {
      results.set(url, localPath);
    }
  });

  await Promise.all(downloads);
  return results;
}
