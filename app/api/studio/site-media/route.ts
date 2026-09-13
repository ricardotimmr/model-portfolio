import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  StudioUnauthorizedError,
  requireStudioAdmin,
} from '@/lib/auth-session';
import {
  SITE_COMP_CARD_MAX_SIZE,
  SITE_MEDIA_IMAGE_TYPES,
  SITE_MEDIA_PDF_TYPES,
  SITE_PORTRAIT_MAX_SIZE,
  siteMediaPrefix,
} from '@/lib/site-media-core';
import { StudioExpectedError } from '@/lib/studio-errors';

const payloadSchema = z.object({ kind: z.enum(['portrait', 'comp-card']) });

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
        await requireStudioAdmin();
        let payload: unknown = null;
        try {
          payload = clientPayload ? JSON.parse(clientPayload) : null;
        } catch {
          throw new StudioExpectedError('Invalid site-media payload.');
        }
        const parsed = payloadSchema.safeParse(payload);
        if (!parsed.success)
          throw new StudioExpectedError('Invalid site-media payload.');
        const prefix = siteMediaPrefix(parsed.data.kind);
        if (
          !pathname.startsWith(prefix) ||
          pathname.length > prefix.length + 150
        ) {
          throw new StudioExpectedError('Invalid site-media pathname.');
        }
        const portrait = parsed.data.kind === 'portrait';
        return {
          allowedContentTypes: portrait
            ? [...SITE_MEDIA_IMAGE_TYPES]
            : [...SITE_MEDIA_PDF_TYPES],
          maximumSizeInBytes: portrait
            ? SITE_PORTRAIT_MAX_SIZE
            : SITE_COMP_CARD_MAX_SIZE,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
          validUntil: Date.now() + 10 * 60 * 1000,
          tokenPayload: JSON.stringify({ kind: parsed.data.kind }),
        };
      },
      onUploadCompleted: async () => {},
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
