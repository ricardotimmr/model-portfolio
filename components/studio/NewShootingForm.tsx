'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createShootingAction } from '@/app/studio/shooting-actions';
import { createSlug } from '@/lib/slug';
import { initialStudioActionState } from '@/lib/studio-action-state';

export function NewShootingForm() {
  const [state, action, pending] = useActionState(
    createShootingAction,
    initialStudioActionState,
  );
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.fieldErrors) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      className="studio-form studio-form--new"
      action={action}
    >
      <div className="studio-field studio-field--wide">
        <label htmlFor="new-title">Title</label>
        <input
          id="new-title"
          name="title"
          required
          maxLength={120}
          autoFocus
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={
            state.fieldErrors?.title ? 'new-title-error' : undefined
          }
          onChange={(event) => {
            if (!slugEdited) setSlug(createSlug(event.currentTarget.value));
          }}
        />
        <FieldError id="new-title-error" message={state.fieldErrors?.title} />
      </div>

      <div className="studio-field">
        <label htmlFor="new-slug">Slug</label>
        <input
          id="new-slug"
          name="slug"
          required
          maxLength={80}
          value={slug}
          aria-invalid={Boolean(state.fieldErrors?.slug)}
          aria-describedby={
            state.fieldErrors?.slug ? 'new-slug-error' : undefined
          }
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(createSlug(event.currentTarget.value));
          }}
        />
        <FieldError id="new-slug-error" message={state.fieldErrors?.slug} />
      </div>

      <div className="studio-field">
        <label htmlFor="new-date">Shooting date</label>
        <input id="new-date" name="shootDate" type="date" />
      </div>

      <div className="studio-field">
        <label htmlFor="new-year">Year</label>
        <input
          id="new-year"
          name="year"
          type="number"
          min={1900}
          max={2100}
          required
          defaultValue={new Date().getFullYear()}
          aria-invalid={Boolean(state.fieldErrors?.year)}
          aria-describedby={
            state.fieldErrors?.year ? 'new-year-error' : undefined
          }
        />
        <FieldError id="new-year-error" message={state.fieldErrors?.year} />
      </div>

      <p
        className="studio-form-status"
        role={state.status === 'error' ? 'alert' : 'status'}
        aria-live={state.status === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {state.message}
      </p>
      <button
        className="studio-primary-button"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Creating…' : 'Create draft'}
      </button>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} className="studio-field-error">
      {message}
    </span>
  ) : null;
}
