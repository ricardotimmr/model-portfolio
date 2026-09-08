export function assertPhotoDeletionAllowed({
  photoId,
  coverPhotoId,
  featuredOnIndex,
}: {
  photoId: string;
  coverPhotoId: string | null;
  featuredOnIndex: boolean;
}) {
  if (coverPhotoId === photoId && featuredOnIndex) {
    throw new Error(
      'Select a replacement cover before deleting this featured photo.',
    );
  }
}
