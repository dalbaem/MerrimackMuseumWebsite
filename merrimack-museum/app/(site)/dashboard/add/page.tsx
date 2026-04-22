"use client";

import { useState } from 'react';
import { Button, Text, Title, useMantineTheme } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createArtwork } from '@/lib/api/artworks';
import DashboardPageShell from "../DashboardPageShell";
import {
  ArtworkFields,
  ArtworkImageUpload,
  EMPTY_ARTWORK_FORM,
  type ArtworkFormValues,
  toArtworkMutationFields,
  useArtworkImageUpload,
} from "../artworks/artworkForm";
import shellClasses from "../DashboardPageShell.module.css";
import pageClasses from "./AddArtworkPage.module.css";

export default function AddArtworkPage() {
  const theme = useMantineTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    uploadedImage,
    uploadedImageBase64,
    uploadedFileName,
    previewImage,
    handleImageUpload,
    removeImage,
    resetUploadState,
  } = useArtworkImageUpload();

  const form = useForm({
    initialValues: EMPTY_ARTWORK_FORM,
    validate: {
      title: (value: string) =>
        value.trim().length === 0 ? 'Title is required' : null,
      artistName: (value: string) =>
        value.trim().length === 0 ? 'Artist name is required' : null,
      locationName: (value: string) =>
        value.trim().length === 0 ? 'Location is required' : null,
      categoryName: (value: string) =>
        value.trim().length === 0 ? 'Category is required' : null,
    },
  });

  const handleSubmit = async (values: ArtworkFormValues) => {
    if (!uploadedFileName || !uploadedImageBase64) {
      setSubmitError('Artwork image is required.');
      return;
    }

    try {
      setSubmitError(null);
      await createArtwork(toArtworkMutationFields(values), {
        uploadedFileName,
        uploadedImage: uploadedImageBase64,
      });

      form.reset();
      resetUploadState();
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to add artwork right now.',
      );
    }
  };

  return (
    <DashboardPageShell title="Add Artwork">
      <div className={pageClasses.shell}>
        <div className={`${shellClasses.panelSurface} ${pageClasses.panel}`}>
          <form
            onSubmit={form.onSubmit((values) => {
              void handleSubmit(values);
            })}
          >
            <div className={pageClasses.formHeader}>
              <Title order={2}>Artwork Details</Title>
              <Text c="dimmed" mt="xs">
                Fill out the record below, then attach the artwork image before
                saving it to the collection.
              </Text>
            </div>

            <ArtworkFields
              values={form.values}
              onFieldChange={(field, value) => form.setFieldValue(field, value)}
              errors={form.errors}
            />

            <div className={pageClasses.uploadSection}>
              <Title order={3}>Artwork Image</Title>
              <Text c="dimmed" mt="xs" mb="md">
                Upload the image you want associated with this record.
              </Text>
              <ArtworkImageUpload
                uploadedImage={uploadedImage}
                previewImage={previewImage}
                onDrop={(files) => {
                  setSubmitError(null);
                  handleImageUpload(files);
                }}
                onRemove={() => {
                  setSubmitError(null);
                  removeImage();
                }}
                theme={theme}
              />
              {submitError ? (
                <Text c="red" size="sm" mt="sm">
                  {submitError}
                </Text>
              ) : null}
            </div>

            <div className={pageClasses.submitRow}>
              <Button type="submit" size="md" className={pageClasses.submitButton}>
                Add Artwork
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardPageShell>
  );
}
