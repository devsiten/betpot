import { Hono } from 'hono';
import type { AppContext } from '../types';
import { nanoid } from 'nanoid';

export const uploadRoutes = new Hono<AppContext>();

// Upload image to R2
uploadRoutes.post('/image', async (c) => {
    try {
        const formData = await c.req.formData();
        const fileData = formData.get('file');

        if (!fileData || typeof fileData === 'string') {
            return c.json({ success: false, error: 'No file uploaded' }, 400);
        }

        const file = fileData as unknown as { type: string; size: number; name: string; stream: () => ReadableStream; arrayBuffer: () => Promise<ArrayBuffer> };

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return c.json({ success: false, error: 'Invalid file type. Allowed: jpg, png, gif, webp' }, 400);
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return c.json({ success: false, error: 'File too large. Max 5MB' }, 400);
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${nanoid()}.${ext}`;

        // Upload to R2
        const bucket = c.env.IMAGES;
        await bucket.put(filename, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // Return the public URL
        // You'll need to set up a public R2 bucket or use a custom domain
        const imageUrl = `https://pub-cca5fc013a1d4a3aa43de4abcf2fa0fe.r2.dev/${filename}`;

        return c.json({
            success: true,
            data: {
                url: imageUrl,
                filename: filename,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return c.json({ success: false, error: 'Upload failed' }, 500);
    }
});

// Delete image from R2
uploadRoutes.delete('/image/:filename', async (c) => {
    try {
        const { filename } = c.req.param();

        const bucket = c.env.IMAGES;
        await bucket.delete(filename);

        return c.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return c.json({ success: false, error: 'Delete failed' }, 500);
    }
});
