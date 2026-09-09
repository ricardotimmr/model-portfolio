'use client';

import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deletePhotoAction,
  deleteShootingAction,
  reorderPhotosAction,
  savePhotoDetailsAction,
  savePresentationAction,
  transitionShootingAction,
  type StudioMutationResult,
} from '@/app/studio/shooting-actions';
import type { StudioPhoto, StudioShooting } from '@/db/studio-queries';

export function PhotoWorkspace({ shooting }: { shooting: StudioShooting }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(shooting.photos);
  const [revision, setRevision] = useState(shooting.revision);
  const [status, setStatus] = useState(shooting.status);
  const [coverPhotoId, setCoverPhotoId] = useState(shooting.coverPhotoId);
  const [featured, setFeatured] = useState(shooting.featuredOnIndex);
  const [indexOrder, setIndexOrder] = useState(
    shooting.indexOrder === null ? '' : String(shooting.indexOrder),
  );
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState('');
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [presentationDirty, setPresentationDirty] = useState(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!detailsDirty && !presentationDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [detailsDirty, presentationDirty]);

  const finish = (result: StudioMutationResult) => {
    setMessage(result.message);
    if (result.revision !== undefined) setRevision(result.revision);
    if (result.status) setStatus(result.status);
    if (result.ok) router.refresh();
    return result.ok;
  };

  const updatePhoto = (id: string, changes: Partial<StudioPhoto>) => {
    setDetailsDirty(true);
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === id ? { ...photo, ...changes } : photo,
      ),
    );
  };

  const persistOrder = async (next: StudioPhoto[]) => {
    const previous = photos;
    setPhotos(next);
    setPending('order');
    const result = await reorderPhotosAction({
      shootingId: shooting.id,
      revision,
      photoIds: next.map((photo) => photo.id),
    });
    if (!finish(result)) setPhotos(previous);
    setPending('');
  };

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to || pending) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    void persistOrder(next);
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (event.canceled || pending) return;
    const source = event.operation.source;
    if (!isSortable(source) || source.initialIndex === source.index) return;
    movePhoto(source.initialIndex, source.index);
  };

  const saveDetails = async () => {
    setPending('details');
    const saved = finish(
      await savePhotoDetailsAction({
        shootingId: shooting.id,
        revision,
        photos: photos.map(
          ({
            id,
            altEn,
            altDe,
            captionEn,
            captionDe,
            archiveVisible,
            shootingVisible,
            layoutHint,
          }) => ({
            id,
            altEn,
            altDe,
            captionEn,
            captionDe,
            archiveVisible,
            shootingVisible,
            layoutHint,
          }),
        ),
      }),
    );
    if (saved) setDetailsDirty(false);
    setPending('');
  };

  const savePresentation = async () => {
    setPending('presentation');
    const saved = finish(
      await savePresentationAction({
        shootingId: shooting.id,
        revision,
        coverPhotoId,
        featuredOnIndex: featured,
        indexOrder: indexOrder === '' ? null : Number(indexOrder),
      }),
    );
    if (saved) setPresentationDirty(false);
    setPending('');
  };

  const transition = async (
    to: 'draft' | 'published' | 'archived',
    confirmation: string,
  ) => {
    if (!window.confirm(confirmation)) return;
    setPending('status');
    finish(
      await transitionShootingAction({
        shootingId: shooting.id,
        revision,
        to,
      }),
    );
    setPending('');
  };

  const removePhoto = async (photo: StudioPhoto) => {
    if (
      !window.confirm(
        `Permanently delete ${photo.originalFilename ?? 'this photo'}?`,
      )
    ) {
      return;
    }
    setPending(photo.id);
    const result = await deletePhotoAction({
      photoId: photo.id,
      shootingId: shooting.id,
      revision,
    });
    if (finish(result)) {
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      if (coverPhotoId === photo.id) setCoverPhotoId(null);
    }
    setPending('');
  };

  const removeShooting = async () => {
    const confirmation = window.prompt(
      `Type “${shooting.title}” to permanently delete this shooting and all ${photos.length} photos.`,
    );
    if (confirmation === null) return;
    setPending('delete-shooting');
    const result = await deleteShootingAction({
      shootingId: shooting.id,
      revision,
      confirmation,
    });
    if (finish(result) && result.deleted) {
      if (result.message !== 'Shooting permanently deleted.') {
        window.alert(result.message);
      }
      router.push('/studio');
      router.refresh();
    }
    setPending('');
  };

  return (
    <>
      <section className="studio-media-section" aria-labelledby="photos-title">
        <div className="studio-section-heading">
          <div>
            <p className="studio-kicker">Arrange</p>
            <h2 id="photos-title">Photographs</h2>
          </div>
          <p>
            Drag to reorder or use the arrow controls. Save text and visibility
            separately.
          </p>
        </div>

        {photos.length ? (
          <DragDropProvider onDragEnd={onDragEnd}>
            <div className="studio-photo-grid">
              {photos.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  index={index}
                  count={photos.length}
                  isCover={coverPhotoId === photo.id}
                  disabled={Boolean(pending)}
                  onChange={(changes) => updatePhoto(photo.id, changes)}
                  onCover={() => {
                    setCoverPhotoId(photo.id);
                    setPresentationDirty(true);
                  }}
                  onMove={(nextIndex) => movePhoto(index, nextIndex)}
                  onDelete={() => void removePhoto(photo)}
                />
              ))}
            </div>
          </DragDropProvider>
        ) : (
          <p className="studio-empty">Upload photographs to begin arranging.</p>
        )}

        {photos.length ? (
          <div className="studio-section-actions">
            <p role="status" aria-live="polite">
              {detailsDirty ? 'Unsaved photo details' : message}
            </p>
            <button
              className="studio-primary-button"
              type="button"
              disabled={Boolean(pending)}
              onClick={() => void saveDetails()}
            >
              {pending === 'details' ? 'Saving…' : 'Save photo details'}
            </button>
          </div>
        ) : null}
      </section>

      <section
        className="studio-media-section"
        aria-labelledby="curation-title"
      >
        <div className="studio-section-heading">
          <div>
            <p className="studio-kicker">Curation</p>
            <h2 id="curation-title">Cover and INDEX</h2>
          </div>
          <p>The cover is selected on the photo cards above.</p>
        </div>
        <div className="studio-curation">
          <div className="studio-curation__cover">
            <p>
              Cover:{' '}
              {photos.find((photo) => photo.id === coverPhotoId)
                ?.originalFilename ?? 'None selected'}
            </p>
            <button
              className="studio-text-button"
              type="button"
              disabled={!coverPhotoId || featured}
              onClick={() => {
                setCoverPhotoId(null);
                setPresentationDirty(true);
              }}
            >
              Clear cover
            </button>
          </div>
          <label className="studio-check-field">
            <input
              type="checkbox"
              checked={featured}
              onChange={(event) => {
                setFeatured(event.currentTarget.checked);
                setPresentationDirty(true);
              }}
            />
            <span>Feature this shooting on INDEX</span>
          </label>
          <label className="studio-field">
            <span>INDEX order</span>
            <input
              type="number"
              min={0}
              value={indexOrder}
              disabled={!featured}
              onChange={(event) => {
                setIndexOrder(event.currentTarget.value);
                setPresentationDirty(true);
              }}
            />
          </label>
        </div>
        <div className="studio-section-actions">
          <p role="status" aria-live="polite">
            {presentationDirty ? 'Unsaved curation changes' : message}
          </p>
          <button
            className="studio-primary-button"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => void savePresentation()}
          >
            {pending === 'presentation' ? 'Saving…' : 'Save curation'}
          </button>
        </div>
      </section>

      <section className="studio-media-section" aria-labelledby="status-title">
        <div className="studio-section-heading">
          <div>
            <p className="studio-kicker">Publishing</p>
            <h2 id="status-title">Status</h2>
          </div>
          <p className="studio-status" data-status={status}>
            Current: {status === 'published' ? 'Live' : status}
          </p>
        </div>
        <div className="studio-publish-actions">
          <Link
            className="studio-secondary-button"
            href={`/studio/shootings/${shooting.id}/preview`}
          >
            Preview
          </Link>
          {status === 'draft' ? (
            <button
              className="studio-primary-button"
              type="button"
              disabled={Boolean(pending)}
              onClick={() =>
                void transition(
                  'published',
                  'Publish this shooting to the public portfolio?',
                )
              }
            >
              Publish
            </button>
          ) : null}
          {status === 'published' ? (
            <button
              className="studio-secondary-button"
              type="button"
              disabled={Boolean(pending)}
              onClick={() =>
                void transition(
                  'draft',
                  'Unpublish this shooting? Its public page will disappear.',
                )
              }
            >
              Unpublish
            </button>
          ) : null}
          {status !== 'archived' ? (
            <button
              className="studio-secondary-button"
              type="button"
              disabled={Boolean(pending)}
              onClick={() =>
                void transition(
                  'archived',
                  'Archive this shooting and remove it from public pages?',
                )
              }
            >
              Archive
            </button>
          ) : (
            <button
              className="studio-secondary-button"
              type="button"
              disabled={Boolean(pending)}
              onClick={() =>
                void transition('draft', 'Restore this shooting as a draft?')
              }
            >
              Restore as draft
            </button>
          )}
        </div>
        <p className="studio-form-status" role="status" aria-live="polite">
          {message}
        </p>
      </section>

      {status !== 'published' ? (
        <section
          className="studio-media-section studio-danger-zone"
          aria-labelledby="danger-title"
        >
          <div className="studio-section-heading">
            <div>
              <p className="studio-kicker">Permanent</p>
              <h2 id="danger-title">Delete shooting</h2>
            </div>
            <p>
              This removes the database record and all associated Blob assets.
            </p>
          </div>
          <button
            className="studio-danger-button"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => void removeShooting()}
          >
            Permanently delete
          </button>
        </section>
      ) : null}
    </>
  );
}

function SortablePhoto({
  photo,
  index,
  count,
  isCover,
  disabled,
  onChange,
  onCover,
  onMove,
  onDelete,
}: {
  photo: StudioPhoto;
  index: number;
  count: number;
  isCover: boolean;
  disabled: boolean;
  onChange: (changes: Partial<StudioPhoto>) => void;
  onCover: () => void;
  onMove: (index: number) => void;
  onDelete: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: photo.id,
    index,
    disabled,
    transition: { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  });

  return (
    <article
      ref={ref}
      className="studio-photo-card"
      data-dragging={isDragging || undefined}
    >
      <div
        className="studio-photo-card__image"
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        <Image
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="studio-photo-card__toolbar">
        <button ref={handleRef} type="button" disabled={disabled}>
          Drag
        </button>
        <button
          type="button"
          disabled={disabled || index === 0}
          aria-label={`Move ${photo.originalFilename ?? 'photo'} earlier`}
          onClick={() => onMove(index - 1)}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={disabled || index === count - 1}
          aria-label={`Move ${photo.originalFilename ?? 'photo'} later`}
          onClick={() => onMove(index + 1)}
        >
          ↓
        </button>
        <button type="button" disabled={disabled} onClick={onDelete}>
          Delete
        </button>
      </div>
      <p className="studio-photo-card__file">
        {photo.originalFilename ?? 'Uploaded image'} / {photo.width} ×{' '}
        {photo.height}
      </p>
      <label className="studio-check-field">
        <input
          type="radio"
          name="studio-cover"
          checked={isCover}
          onChange={onCover}
        />
        <span>Use as cover</span>
      </label>
      <label className="studio-field">
        <span>Alt text / English</span>
        <textarea
          rows={3}
          value={photo.altEn}
          onChange={(event) => onChange({ altEn: event.currentTarget.value })}
        />
      </label>
      <label className="studio-field">
        <span>Alt text / German</span>
        <textarea
          rows={3}
          value={photo.altDe}
          onChange={(event) => onChange({ altDe: event.currentTarget.value })}
        />
      </label>
      <label className="studio-field">
        <span>Caption / English</span>
        <input
          value={photo.captionEn}
          onChange={(event) =>
            onChange({ captionEn: event.currentTarget.value })
          }
        />
      </label>
      <label className="studio-field">
        <span>Caption / German</span>
        <input
          value={photo.captionDe}
          onChange={(event) =>
            onChange({ captionDe: event.currentTarget.value })
          }
        />
      </label>
      <div className="studio-photo-card__checks">
        <label className="studio-check-field">
          <input
            type="checkbox"
            checked={photo.shootingVisible}
            onChange={(event) =>
              onChange({ shootingVisible: event.currentTarget.checked })
            }
          />
          <span>Shooting page</span>
        </label>
        <label className="studio-check-field">
          <input
            type="checkbox"
            checked={photo.archiveVisible}
            onChange={(event) =>
              onChange({ archiveVisible: event.currentTarget.checked })
            }
          />
          <span>LOOKBOOK</span>
        </label>
      </div>
      <label className="studio-field">
        <span>Layout</span>
        <select
          value={photo.layoutHint}
          onChange={(event) =>
            onChange({
              layoutHint: event.currentTarget
                .value as StudioPhoto['layoutHint'],
            })
          }
        >
          {['auto', 'full', 'wide', 'medium', 'left', 'right', 'pair-next'].map(
            (value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ),
          )}
        </select>
      </label>
    </article>
  );
}
