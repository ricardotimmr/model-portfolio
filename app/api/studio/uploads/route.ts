import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStudioShootingById } from '@/db/studio-queries';
import { StudioUnauthorizedError } from '@/lib/auth-session';
import { StudioExpectedError } from '@/lib/studio-errors';
import {
  STUDIO_IMAGE_CONTENT_TYPES,
  STUDIO_MAX_IMAGE_SIZE,
} from '@/lib/studio-upload-core';

const payloadSchema = z.object({
  shootingId: z.uuid(),
});

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid upload request.' },
      { status: 400 },
    );
  }

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = payloadSchema.safeParse(
          clientPayload ? JSON.parse(clientPayload) : null,
        );
        if (!parsed.success) {
          throw new StudioExpectedError('Invalid upload payload.');
        }

        const shooting = await getStudioShootingById(parsed.data.shootingId);
        if (!shooting) {
          throw new StudioExpectedError('The target shooting does not exist.');
        }

        const prefix = `shootings/${shooting.id}/`;
        if (
          !pathname.startsWith(prefix) ||
          pathname.length > prefix.length + 150
        ) {
          throw new StudioExpectedError('Invalid upload pathname.');
        }

        return {
          allowedContentTypes: [...STUDIO_IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: STUDIO_MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
          validUntil: Date.now() + 10 * 60 * 1000,
          tokenPayload: JSON.stringify({ shootingId: shooting.id }),
        };
      },
      onUploadCompleted: async () => {
        // Database finalization deliberately requires the browser's live Studio
        // session and is not performed by this service callback.
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const status = error instanceof StudioUnauthorizedError ? 401 : 400;
    return NextResponse.json(
      {
        error:
          status === 401
            ? 'Studio authentication is required.'
            : error instanceof StudioExpectedError
              ? error.message
              : 'The upload could not be authorized.',
      },
      { status },
    );
  }
}
