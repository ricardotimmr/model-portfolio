'use client';

import { upload } from '@vercel/blob/client';
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { finalizePhotoUploadAction } from '@/app/studio/shooting-actions';
import {
  createStudioUploadPathname,
  isStudioImageType,
  STUDIO_MAX_IMAGE_SIZE,
} from '@/lib/studio-upload-core';

type QueueItem = {
  id: string;
  file: File;
  progress: number;
  status:
    'queued' | 'uploading' | 'finalizing' | 'done' | 'error' | 'cancelled';
  message: string;
};

const MAX_CONCURRENT_UPLOADS = 3;

export function UploadQueue({ shootingId }: { shootingId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(false);
  const pendingItems = useRef<QueueItem[]>([]);

  const updateItem = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  const uploadItem = useCallback(
    async (item: QueueItem) => {
      if (
        !isStudioImageType(item.file.type) ||
        item.file.size > STUDIO_MAX_IMAGE_SIZE ||
        item.file.size === 0
      ) {
        updateItem(item.id, {
          status: 'error',
          message:
            item.file.size > STUDIO_MAX_IMAGE_SIZE
              ? 'File exceeds 25 MB.'
              : 'Use JPEG, PNG, WebP, or AVIF.',
        });
        return;
      }

      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      updateItem(item.id, { status: 'uploading', message: 'Uploading…' });

      try {
        const blob = await upload(
          createStudioUploadPathname(shootingId, item.file.name),
          item.file,
          {
            access: 'public',
            handleUploadUrl: '/api/studio/uploads',
            clientPayload: JSON.stringify({ shootingId }),
            multipart: item.file.size > 4 * 1024 * 1024,
            abortSignal: controller.signal,
            onUploadProgress: ({ percentage }) => {
              updateItem(item.id, { progress: Math.round(percentage) });
            },
          },
        );

        updateItem(item.id, {
          progress: 100,
          status: 'finalizing',
          message: 'Checking image…',
        });
        const result = await finalizePhotoUploadAction({
          shootingId,
          blobUrl: blob.url,
          originalFilename: item.file.name,
        });
        if (!result.ok) throw new Error(result.message);

        updateItem(item.id, {
          status: 'done',
          message: 'Ready',
        });
      } catch (error) {
        updateItem(item.id, {
          status: controller.signal.aborted ? 'cancelled' : 'error',
          message: controller.signal.aborted
            ? 'Cancelled'
            : error instanceof Error
              ? error.message
              : 'Upload failed.',
        });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [shootingId, updateItem],
  );

  const processQueue = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    while (pendingItems.current.length) {
      const batch = pendingItems.current.splice(0, MAX_CONCURRENT_UPLOADS);
      await Promise.all(batch.map(uploadItem));
    }

    running.current = false;
    router.refresh();
  }, [router, uploadItem]);

  const addFiles = useCallback(
    (files: File[]) => {
      const queued = files.map<QueueItem>((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'queued',
        message: 'Waiting',
      }));
      setItems((current) => [...current, ...queued]);
      pendingItems.current.push(...queued);
      void processQueue();
    },
    [processQueue],
  );

  const retryItem = (item: QueueItem) => {
    const queued = {
      ...item,
      progress: 0,
      status: 'queued' as const,
      message: 'Waiting',
    };
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? queued : entry)),
    );
    pendingItems.current.push(queued);
    void processQueue();
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section className="studio-media-section" aria-labelledby="upload-title">
      <div className="studio-section-heading">
        <div>
          <p className="studio-kicker">Images</p>
          <h2 id="upload-title">Upload photographs</h2>
        </div>
        <p>JPEG, PNG, WebP or AVIF / maximum 25 MB each</p>
      </div>

      <label
        className={`studio-upload-dropzone ${dragActive ? 'is-active' : ''}`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={onInput}
        />
        <span>Drop images here or choose files</span>
      </label>

      {items.length ? (
        <ul className="studio-upload-list">
          {items.map((item) => (
            <li key={item.id} data-status={item.status}>
              <div>
                <strong>{item.file.name}</strong>
                <span role="status" aria-live="polite" aria-atomic="true">
                  {item.message}
                </span>
              </div>
              <progress
                max={100}
                value={item.progress}
                aria-label={`Upload progress for ${item.file.name}`}
              >
                {item.progress}%
              </progress>
              {item.status === 'uploading' ? (
                <button
                  type="button"
                  aria-label={`Cancel upload of ${item.file.name}`}
                  onClick={() => controllers.current.get(item.id)?.abort()}
                >
                  Cancel
                </button>
              ) : item.status === 'error' || item.status === 'cancelled' ? (
                <button
                  type="button"
                  aria-label={`Retry upload of ${item.file.name}`}
                  onClick={() => retryItem(item)}
                >
                  Retry
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
