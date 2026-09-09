'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateShootingMetadataAction } from '@/app/studio/shooting-actions';
import type { StudioShooting } from '@/db/studio-queries';
import { initialStudioActionState } from '@/lib/studio-action-state';

export function ShootingForm({ shooting }: { shooting: StudioShooting }) {
  const [state, setState] = useState(initialStudioActionState);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const revision = state.revision ?? shooting.revision;

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const submitAction = (formData: FormData) => {
    startTransition(async () => {
      const nextState = await updateShootingMetadataAction(state, formData);
      setState(nextState);
      if (nextState.status === 'success') setDirty(false);
    });
  };

  return (
    <form
      className="studio-form studio-metadata-form"
      action={submitAction}
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="id" value={shooting.id} />
      <input type="hidden" name="revision" value={revision} />

      {shooting.status === 'published' ? (
        <p className="studio-live-warning">
          This shooting is live. Saved changes update the public portfolio.
        </p>
      ) : null}

      <FormSection title="Identity">
        <TextField
          name="title"
          label="Title"
          defaultValue={shooting.title}
          required
          error={state.fieldErrors?.title}
          wide
        />
        <TextField
          name="slug"
          label="Slug"
          defaultValue={shooting.slug}
          required
          disabled={shooting.status !== 'draft'}
          error={state.fieldErrors?.slug}
        />
        {shooting.status !== 'draft' ? (
          <input type="hidden" name="slug" value={shooting.slug} />
        ) : null}
        <TextField
          name="shootDate"
          label="Shooting date"
          type="date"
          defaultValue={shooting.shootDate}
        />
        <TextField
          name="year"
          label="Year"
          type="number"
          defaultValue={String(shooting.year)}
          required
          error={state.fieldErrors?.year}
        />
      </FormSection>

      <FormSection title="Editorial copy">
        <TextField
          name="locationEn"
          label="Location / English"
          defaultValue={shooting.locationEn}
        />
        <TextField
          name="locationDe"
          label="Location / German"
          defaultValue={shooting.locationDe}
        />
        <TextAreaField
          name="descriptionEn"
          label="Description / English"
          defaultValue={shooting.descriptionEn}
        />
        <TextAreaField
          name="descriptionDe"
          label="Description / German"
          defaultValue={shooting.descriptionDe}
        />
      </FormSection>

      <FormSection title="Credits">
        <TextField
          name="photographer"
          label="Photographer"
          defaultValue={shooting.photographer}
        />
        <TextField
          name="styling"
          label="Styling"
          defaultValue={shooting.styling}
        />
        <TextField
          name="makeup"
          label="Makeup"
          defaultValue={shooting.makeup}
        />
        <TextField name="hair" label="Hair" defaultValue={shooting.hair} />
        <TextField
          name="client"
          label="Client / publication"
          defaultValue={shooting.client}
        />
        <TextAreaField
          name="credits"
          label="Additional credits"
          defaultValue={shooting.credits}
        />
      </FormSection>

      <div className="studio-form-footer">
        <p
          className="studio-form-status"
          data-status={state.status}
          role="status"
          aria-live="polite"
        >
          {dirty && state.status !== 'error'
            ? 'Unsaved changes'
            : state.message}
        </p>
        <button
          className="studio-primary-button"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save metadata'}
        </button>
      </div>
    </form>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="studio-form-section">
      <legend>{title}</legend>
      <div className="studio-form-grid">{children}</div>
    </fieldset>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
  disabled = false,
  error,
  wide = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: 'text' | 'date' | 'number';
  required?: boolean;
  disabled?: boolean;
  error?: string;
  wide?: boolean;
}) {
  const errorId = `field-${name}-error`;
  return (
    <div className={`studio-field ${wide ? 'studio-field--wide' : ''}`}>
      <label htmlFor={`field-${name}`}>{label}</label>
      <input
        id={`field-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <span id={errorId} className="studio-field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function TextAreaField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div className="studio-field studio-field--wide">
      <label htmlFor={`field-${name}`}>{label}</label>
      <textarea
        id={`field-${name}`}
        name={name}
        defaultValue={defaultValue}
        rows={5}
      />
    </div>
  );
}
