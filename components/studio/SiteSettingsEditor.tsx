'use client';

import { upload } from '@vercel/blob/client';
import Image from 'next/image';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  finalizeSiteMediaAction,
  removeCompCardAction,
  updateCompCardAction,
  updatePortraitDetailsAction,
  updatePublicProfileAction,
  updateYearStatementAction,
} from '@/app/studio/site-settings-actions';
import type { StudioSiteSettings } from '@/lib/site-settings';
import {
  createSiteMediaPathname,
  SITE_COMP_CARD_MAX_SIZE,
  SITE_PORTRAIT_MAX_SIZE,
} from '@/lib/site-media-core';
import {
  initialStudioActionState,
  type StudioActionState,
} from '@/lib/studio-action-state';

const text = (value: string | null) => value ?? '';
type SettingsAction = (
  previous: StudioActionState,
  formData: FormData,
) => Promise<StudioActionState>;

function useSettingsForm(serverAction: SettingsAction) {
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: StudioActionState, formData: FormData) => {
      const result = await serverAction(previous, formData);
      if (result.status === 'success') setDirty(false);
      return result;
    },
    initialStudioActionState,
  );

  useEffect(() => {
    if (state.status !== 'error') return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  return { formRef, dirty, setDirty, state, action, pending };
}

export function SiteSettingsEditor({
  settings,
}: {
  settings: StudioSiteSettings;
}) {
  return (
    <div className="studio-settings-stack">
      <ProfileSettingsForm settings={settings} />
      <PortraitSettingsForm settings={settings} />
      <CompCardSettingsForm settings={settings} />
      <YearSettingsForm settings={settings} />
    </div>
  );
}

function ProfileSettingsForm({ settings }: { settings: StudioSiteSettings }) {
  const { formRef, dirty, setDirty, state, action, pending } = useSettingsForm(
    updatePublicProfileAction,
  );
  return (
    <form
      ref={formRef}
      className="studio-form"
      action={action}
      onChange={() => setDirty(true)}
    >
      <FormIdentity settings={settings} revision={state.revision} />
      <Section title="Public profile">
        <Field
          name="modelName"
          label="Model name"
          value={settings.modelName}
          required
          error={state.fieldErrors?.modelName}
        />
        <Field name="baseEn" label="Base / English" value={settings.baseEn} />
        <Field name="baseDe" label="Base / German" value={settings.baseDe} />
        <Area
          name="bioEn"
          label="Short biography / English"
          value={settings.bioEn}
        />
        <Area
          name="bioDe"
          label="Short biography / German"
          value={settings.bioDe}
        />
      </Section>
      <Section title="Model details">
        <Field
          name="height"
          label="Height (include unit)"
          value={settings.height}
        />
        <Field name="bust" label="Bust (include unit)" value={settings.bust} />
        <Field
          name="waist"
          label="Waist (include unit)"
          value={settings.waist}
        />
        <Field name="hips" label="Hips (include unit)" value={settings.hips} />
        <Field name="shoeSize" label="Shoe size" value={settings.shoeSize} />
        <Field name="hairEn" label="Hair / English" value={settings.hairEn} />
        <Field name="hairDe" label="Hair / German" value={settings.hairDe} />
        <Field name="eyesEn" label="Eyes / English" value={settings.eyesEn} />
        <Field name="eyesDe" label="Eyes / German" value={settings.eyesDe} />
        <Area
          name="additionalDetailEn"
          label="Additional detail / English"
          value={settings.additionalDetailEn}
        />
        <Area
          name="additionalDetailDe"
          label="Additional detail / German"
          value={settings.additionalDetailDe}
        />
      </Section>
      <Section title="Representation">
        <Field name="agencyName" label="Agency" value={settings.agencyName} />
        <Field
          name="agencyLocationEn"
          label="Agency location / English"
          value={settings.agencyLocationEn}
        />
        <Field
          name="agencyLocationDe"
          label="Agency location / German"
          value={settings.agencyLocationDe}
        />
        <Field
          name="agencyUrl"
          label="Agency URL"
          type="url"
          value={settings.agencyUrl}
          error={state.fieldErrors?.agencyUrl}
        />
        <Field
          name="agencyBookingEmail"
          label="Agency booking email"
          type="email"
          value={settings.agencyBookingEmail}
          error={state.fieldErrors?.agencyBookingEmail}
        />
        <Check
          name="emphasizeAgency"
          label="Emphasize representation before direct contact"
          checked={settings.emphasizeAgency}
        />
      </Section>
      <Section title="Direct contact">
        <Field
          name="publicEmail"
          label="Public email"
          type="email"
          value={settings.publicEmail}
          error={state.fieldErrors?.publicEmail}
        />
        <Field
          name="contactLabelEn"
          label="Contact label / English"
          value={settings.contactLabelEn}
        />
        <Field
          name="contactLabelDe"
          label="Contact label / German"
          value={settings.contactLabelDe}
        />
        <Check
          name="emailClickable"
          label="Render public email as a clickable link"
          checked={settings.emailClickable}
        />
        <Field
          name="additionalContactLabelEn"
          label="Additional contact label / English"
          value={settings.additionalContactLabelEn}
        />
        <Field
          name="additionalContactLabelDe"
          label="Additional contact label / German"
          value={settings.additionalContactLabelDe}
        />
        <Field
          name="additionalContactValue"
          label="Additional contact value"
          value={settings.additionalContactValue}
        />
        <Field
          name="additionalContactUrl"
          label="Additional contact URL"
          type="url"
          value={settings.additionalContactUrl}
          error={state.fieldErrors?.additionalContactUrl}
        />
      </Section>
      <Section title="Instagram">
        <Field
          name="instagramHandle"
          label="Handle"
          value={settings.instagramHandle}
        />
        <Field
          name="instagramUrl"
          label="Profile URL"
          type="url"
          value={settings.instagramUrl}
          error={state.fieldErrors?.instagramUrl}
        />
        <Check
          name="instagramInFooter"
          label="Show Instagram in the public footer"
          checked={settings.instagramInFooter}
        />
      </Section>
      <Section title="Optional profile content">
        <Area
          name="languagesEn"
          label="Languages / English"
          value={settings.languagesEn}
        />
        <Area
          name="languagesDe"
          label="Languages / German"
          value={settings.languagesDe}
        />
        <Area
          name="baseCitiesEn"
          label="Base cities / availability / English"
          value={settings.baseCitiesEn}
        />
        <Area
          name="baseCitiesDe"
          label="Base cities / availability / German"
          value={settings.baseCitiesDe}
        />
        <Area
          name="selectedClientsEn"
          label="Selected clients or publications / English"
          value={settings.selectedClientsEn}
        />
        <Area
          name="selectedClientsDe"
          label="Selected clients or publications / German"
          value={settings.selectedClientsDe}
        />
      </Section>
      <FormFooter
        state={state}
        pending={pending}
        label="Save profile settings"
        dirty={dirty}
      />
    </form>
  );
}

function PortraitSettingsForm({ settings }: { settings: StudioSiteSettings }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { formRef, dirty, setDirty, state, action, pending } = useSettingsForm(
    updatePortraitDetailsAction,
  );
  const [uploadState, setUploadState] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const revision = state.revision ?? settings.revision;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const uploadPortrait = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setUploadState('Choose an image first.');
    if (
      !file.type.startsWith('image/') ||
      file.size === 0 ||
      file.size > SITE_PORTRAIT_MAX_SIZE
    ) {
      return setUploadState(
        'Use a non-empty JPEG, PNG, WebP or AVIF up to 25 MB.',
      );
    }
    const formData = new FormData(formRef.current ?? undefined);
    const altEn = String(formData.get('portraitAltEn') ?? '').trim();
    if (!altEn)
      return setUploadState('English alt text is required before upload.');
    setUploading(true);
    setUploadState('Uploading portrait…');
    try {
      const blob = await upload(
        createSiteMediaPathname('portrait', file.name),
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/studio/site-media',
          clientPayload: JSON.stringify({ kind: 'portrait' }),
          multipart: file.size > 4 * 1024 * 1024,
        },
      );
      const result = await finalizeSiteMediaAction({
        kind: 'portrait',
        revision,
        blobUrl: blob.url,
        originalFilename: file.name,
        portraitAltEn: altEn,
        portraitAltDe: String(formData.get('portraitAltDe') ?? ''),
        portraitPhotographer: String(
          formData.get('portraitPhotographer') ?? '',
        ),
        portraitCredit: String(formData.get('portraitCredit') ?? ''),
      });
      setUploadState(result.message);
      if (result.ok) router.refresh();
    } catch (error) {
      setUploadState(
        error instanceof Error ? error.message : 'Portrait upload failed.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      ref={formRef}
      className="studio-form"
      action={action}
      onChange={() => setDirty(true)}
    >
      <FormIdentity settings={settings} revision={state.revision} />
      <Section title="Profile portrait">
        <div className="studio-settings-preview studio-field--wide">
          <Image
            src={previewUrl ?? settings.portraitUrl}
            width={settings.portraitWidth}
            height={settings.portraitHeight}
            alt={
              previewUrl
                ? 'Local preview of the selected profile portrait'
                : 'Current public profile portrait'
            }
            sizes="240px"
            unoptimized={Boolean(previewUrl)}
          />
          <p>
            {settings.portraitOriginalFilename ?? 'Current portfolio image'} ·{' '}
            {settings.portraitWidth} × {settings.portraitHeight}
          </p>
        </div>
        <Field
          name="portraitAltEn"
          label="Alt text / English"
          value={settings.portraitAltEn}
          required
          error={state.fieldErrors?.portraitAltEn}
        />
        <Field
          name="portraitAltDe"
          label="Alt text / German"
          value={settings.portraitAltDe}
        />
        {!settings.portraitAltDe ? (
          <p className="studio-field-help studio-field--wide">
            German currently falls back to the required English alt text.
          </p>
        ) : null}
        <Field
          name="portraitPhotographer"
          label="Photographer"
          value={settings.portraitPhotographer}
        />
        <Field
          name="portraitCredit"
          label="Required credit line"
          value={settings.portraitCredit}
        />
        <div className="studio-field studio-field--wide">
          <label htmlFor="portrait-file">Replace portrait</label>
          <input
            ref={fileRef}
            id="portrait-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setPreviewUrl(file ? URL.createObjectURL(file) : undefined);
              setUploadState(file ? 'Local preview — not uploaded yet.' : '');
            }}
          />
          <p className="studio-field-help">
            JPEG, PNG, WebP or AVIF · maximum 25 MB. Uploading saves the alt
            text and credits above at the same time.
          </p>
          <button
            className="studio-secondary-button"
            type="button"
            disabled={uploading}
            onClick={uploadPortrait}
          >
            {uploading ? 'Uploading…' : 'Upload replacement'}
          </button>
          <p className="studio-form-status" role="status" aria-live="polite">
            {uploadState}
          </p>
        </div>
      </Section>
      <FormFooter
        state={state}
        pending={pending}
        label="Save portrait details"
        dirty={dirty}
      />
    </form>
  );
}

function CompCardSettingsForm({ settings }: { settings: StudioSiteSettings }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { formRef, dirty, setDirty, state, action, pending } =
    useSettingsForm(updateCompCardAction);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const revision = state.revision ?? settings.revision;

  const uploadCompCard = async () => {
    const file = fileRef.current?.files?.[0];
    if (
      !file ||
      file.type !== 'application/pdf' ||
      file.size === 0 ||
      file.size > SITE_COMP_CARD_MAX_SIZE
    ) {
      return setMessage('Choose a non-empty PDF up to 10 MB.');
    }
    setWorking(true);
    setMessage('Uploading Comp Card…');
    try {
      const blob = await upload(
        createSiteMediaPathname('comp-card', file.name),
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/studio/site-media',
          clientPayload: JSON.stringify({ kind: 'comp-card' }),
          multipart: file.size > 4 * 1024 * 1024,
        },
      );
      const result = await finalizeSiteMediaAction({
        kind: 'comp-card',
        revision,
        blobUrl: blob.url,
        originalFilename: file.name,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Comp Card upload failed.',
      );
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm('Remove the current Comp Card from the public profile?')
    )
      return;
    setWorking(true);
    const result = await removeCompCardAction({ id: settings.id, revision });
    setMessage(result.message);
    setWorking(false);
    if (result.ok) router.refresh();
  };

  return (
    <form
      ref={formRef}
      className="studio-form"
      action={action}
      onChange={() => setDirty(true)}
    >
      <FormIdentity settings={settings} revision={state.revision} />
      <Section title="Comp Card">
        <Check
          name="compCardEnabled"
          label="Make the Comp Card link public when a URL or file exists"
          checked={settings.compCardEnabled}
        />
        <Field
          name="compCardUrl"
          label="External Comp Card URL"
          type="url"
          value={settings.compCardUrl}
          error={state.fieldErrors?.compCardUrl}
        />
        <div className="studio-field studio-field--wide">
          <label htmlFor="comp-card-file">Upload PDF</label>
          <input
            ref={fileRef}
            id="comp-card-file"
            type="file"
            accept="application/pdf"
          />
          {settings.compCardOriginalFilename ? (
            <p className="studio-field-help">
              Current file: {settings.compCardOriginalFilename}
            </p>
          ) : null}
          <div className="studio-inline-actions">
            <button
              className="studio-secondary-button"
              type="button"
              disabled={working}
              onClick={uploadCompCard}
            >
              Upload PDF
            </button>
            {settings.compCardStoragePath ? (
              <button
                className="studio-text-button"
                type="button"
                disabled={working}
                onClick={remove}
              >
                Remove uploaded PDF
              </button>
            ) : null}
          </div>
          <p className="studio-form-status" role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </Section>
      <FormFooter
        state={state}
        pending={pending}
        label="Save Comp Card settings"
        dirty={dirty}
      />
    </form>
  );
}

function YearSettingsForm({ settings }: { settings: StudioSiteSettings }) {
  const { formRef, dirty, setDirty, state, action, pending } = useSettingsForm(
    updateYearStatementAction,
  );
  return (
    <form
      ref={formRef}
      className="studio-form"
      action={action}
      onChange={() => setDirty(true)}
    >
      <FormIdentity settings={settings} revision={state.revision} />
      <Section title={`Current-year overlay / ${new Date().getFullYear()}`}>
        <Area
          name="yearStatementEn"
          label="Statement / English"
          value={settings.yearStatementEn}
        />
        <Area
          name="yearStatementDe"
          label="Statement / German"
          value={settings.yearStatementDe}
        />
      </Section>
      <FormFooter
        state={state}
        pending={pending}
        label="Save year statement"
        dirty={dirty}
      />
    </form>
  );
}

function FormIdentity({
  settings,
  revision,
}: {
  settings: StudioSiteSettings;
  revision?: number;
}) {
  return (
    <>
      <input type="hidden" name="id" value={settings.id} />
      <input
        type="hidden"
        name="revision"
        value={revision ?? settings.revision}
      />
    </>
  );
}

function Section({
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

function Field({
  name,
  label,
  value,
  type = 'text',
  required,
  error,
}: {
  name: string;
  label: string;
  value: string | null;
  type?: 'text' | 'url' | 'email';
  required?: boolean;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="studio-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={text(value)}
        required={required}
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

function Area({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string | null;
}) {
  return (
    <div className="studio-field studio-field--wide">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} defaultValue={text(value)} rows={4} />
    </div>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="studio-check-field studio-field--wide">
      <input name={name} type="checkbox" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

function FormFooter({
  state,
  pending,
  label,
  dirty,
}: {
  state: StudioActionState;
  pending: boolean;
  label: string;
  dirty: boolean;
}) {
  return (
    <div className="studio-form-footer">
      <p
        className="studio-form-status"
        data-status={state.status}
        role={state.status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {dirty && state.status !== 'error' ? 'Unsaved changes' : state.message}
      </p>
      <button
        className="studio-primary-button"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Saving…' : label}
      </button>
    </div>
  );
}
