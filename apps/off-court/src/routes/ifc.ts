import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ifcUploads, ifcElements } from '../db/schema.js';
import {
  processIFCUpload,
  getUploadStatus,
  linkElementsToRooms,
} from '../services/ifc-pipeline.js';

const router = Router();

const PAGE_SIZE = 20;

// POST /api/ifc/uploads
router.post('/uploads', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, building_name, file_name, file_size_bytes, uploaded_by } = req.body as {
    venue_id?: unknown;
    building_name?: unknown;
    file_name?: unknown;
    file_size_bytes?: unknown;
    uploaded_by?: unknown;
  };

  if (
    typeof venue_id !== 'string' ||
    typeof building_name !== 'string' ||
    typeof file_name !== 'string' ||
    typeof file_size_bytes !== 'number' ||
    typeof uploaded_by !== 'string'
  ) {
    res.status(400).json({
      error: 'venue_id, building_name, file_name, file_size_bytes, uploaded_by are required',
    });
    return;
  }

  const rows = await db
    .insert(ifcUploads)
    .values({ venue_id, building_name, file_name, file_size_bytes, uploaded_by })
    .returning();
  const upload = rows[0];
  if (!upload) {
    res.status(500).json({ error: 'Failed to create upload record' });
    return;
  }

  const uploadId = upload.id;
  processIFCUpload(uploadId, venue_id).catch(async (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Processing failed';
    await db
      .update(ifcUploads)
      .set({ upload_status: 'failed', error_message: message })
      .where(eq(ifcUploads.id, uploadId));
  });

  res.status(201).json(upload);
});

// GET /api/ifc/uploads?venue_id=
router.get('/uploads', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;
  if (!venue_id || typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id required' });
    return;
  }

  const uploads = await db
    .select()
    .from(ifcUploads)
    .where(eq(ifcUploads.venue_id, venue_id))
    .orderBy(desc(ifcUploads.created_at));

  res.json(uploads);
});

// GET /api/ifc/uploads/:id/status
router.get('/uploads/:id/status', async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;

  try {
    const status = await getUploadStatus(id);
    res.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

// GET /api/ifc/uploads/:id/elements?page=
router.get('/uploads/:id/elements', async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const page = Math.max(0, Number(req.query['page'] ?? 0));

  const [upload] = await db
    .select({ id: ifcUploads.id })
    .from(ifcUploads)
    .where(eq(ifcUploads.id, id))
    .limit(1);

  if (!upload) {
    res.status(404).json({ error: 'Upload not found' });
    return;
  }

  const elements = await db
    .select()
    .from(ifcElements)
    .where(eq(ifcElements.upload_id, id))
    .orderBy(ifcElements.element_type)
    .limit(PAGE_SIZE)
    .offset(page * PAGE_SIZE);

  res.json({ page, page_size: PAGE_SIZE, data: elements });
});

// POST /api/ifc/uploads/:id/link-rooms
router.post('/uploads/:id/link-rooms', async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { venue_id } = req.body as { venue_id?: unknown };

  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id required' });
    return;
  }

  const [upload] = await db
    .select({ id: ifcUploads.id, upload_status: ifcUploads.upload_status })
    .from(ifcUploads)
    .where(eq(ifcUploads.id, id))
    .limit(1);

  if (!upload) {
    res.status(404).json({ error: 'Upload not found' });
    return;
  }

  if (upload.upload_status !== 'completed') {
    res.status(409).json({ error: 'Upload must be completed before linking rooms' });
    return;
  }

  linkElementsToRooms(id, venue_id).catch(console.error);

  res.json({ success: true, message: 'Room linking started' });
});

export default router;
