'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { StudioShootingListItem } from '@/db/studio-queries';

type Filter = 'all' | StudioShootingListItem['status'];

export function ShootingList({
  shootings,
}: {
  shootings: StudioShootingListItem[];
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(
    () =>
      filter === 'all'
        ? shootings
        : shootings.filter((shooting) => shooting.status === filter),
    [filter, shootings],
  );

  return (
    <section className="studio-list-section" aria-labelledby="shootings-title">
      <div className="studio-list-toolbar">
        <h2 id="shootings-title">Shootings</h2>
        <div className="studio-filter" aria-label="Filter shootings">
          {(['all', 'draft', 'published', 'archived'] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={filter === value ? 'is-active' : undefined}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === 'published' ? 'Live' : value}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="studio-shooting-list">
          {visible.map((shooting) => (
            <article className="studio-shooting-row" key={shooting.id}>
              <Link
                className="studio-shooting-row__image"
                href={`/studio/shootings/${shooting.id}`}
                aria-label={`Edit ${shooting.title}`}
              >
                {shooting.coverUrl ? (
                  <Image
                    src={shooting.coverUrl}
                    alt=""
                    width={180}
                    height={224}
                    sizes="(max-width: 760px) 88px, 116px"
                  />
                ) : (
                  <span>No cover</span>
                )}
              </Link>
              <div className="studio-shooting-row__title">
                <p className="studio-status" data-status={shooting.status}>
                  {shooting.status === 'published' ? 'Live' : shooting.status}
                </p>
                <h3>
                  <Link href={`/studio/shootings/${shooting.id}`}>
                    {shooting.title}
                  </Link>
                </h3>
                <p>
                  {shooting.shootDate || shooting.year} / {shooting.photoCount}{' '}
                  {shooting.photoCount === 1 ? 'photo' : 'photos'}
                </p>
              </div>
              <dl className="studio-shooting-row__meta">
                <div>
                  <dt>INDEX</dt>
                  <dd>
                    {shooting.featuredOnIndex
                      ? `Featured / ${shooting.indexOrder ?? '—'}`
                      : 'Not featured'}
                  </dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>
                    {new Intl.DateTimeFormat('en', {
                      dateStyle: 'medium',
                    }).format(new Date(shooting.updatedAt))}
                  </dd>
                </div>
                <div>
                  <dt>Readiness</dt>
                  <dd>
                    {shooting.publishBlockers.length === 0
                      ? 'Ready to publish'
                      : `${shooting.publishBlockers.length} blocker${shooting.publishBlockers.length === 1 ? '' : 's'}`}
                  </dd>
                </div>
              </dl>
              <div className="studio-row-actions">
                <Link href={`/studio/shootings/${shooting.id}/preview`}>
                  Preview
                </Link>
                <Link href={`/studio/shootings/${shooting.id}`}>Edit</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="studio-empty">No {filter} shootings.</p>
      )}
    </section>
  );
}
