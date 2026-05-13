'use client';

import { useCallback, useState } from 'react';
import {
  Button,
  Group,
  Image,
  SimpleGrid,
  Text,
  TextInput,
  Textarea,
  Title,
  rem,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';
import type { MantineTheme } from '@mantine/core';
import type { ArtworkDto } from '@/shared/types/api';
import type { ArtworkMutationFields } from '@/shared/types/artwork';
import shellClasses from '../DashboardPageShell.module.css';
import classes from './ArtworkImageUpload.module.css';

export interface ArtworkFormValues extends ArtworkMutationFields {
  artworkId: string;
}

export const EMPTY_ARTWORK_FORM: ArtworkFormValues = {
  artworkId: '',
  title: '',
  artistName: '',
  donorName: '',
  categoryName: '',
  locationName: '',
  width: '',
  height: '',
  dateCreatedMonth: '',
  dateCreatedYear: '',
  comments: '',
  imagePath: '',
  size: '',
};

export function toArtworkFormValues(item: ArtworkDto): ArtworkFormValues {
  return {
    artworkId: item.id?.toString() || '',
    title: item.title || '',
    donorName: item.donorName || '',
    artistName: item.artistName || '',
    categoryName: item.categoryName || '',
    locationName: item.locationName || '',
    width: item.width || '',
    height: item.height || '',
    dateCreatedMonth: item.dateCreatedMonth?.toString() || '',
    dateCreatedYear: item.dateCreatedYear?.toString() || '',
    comments: item.comments || '',
    imagePath: item.imagePath || '',
    size: item.size || '',
  };
}

export function toArtworkMutationFields(
  values: ArtworkFormValues,
): ArtworkMutationFields {
  return {
    title: values.title,
    artistName: values.artistName,
    donorName: values.donorName,
    categoryName: values.categoryName,
    locationName: values.locationName,
    width: values.width,
    height: values.height,
    dateCreatedMonth: values.dateCreatedMonth,
    dateCreatedYear: values.dateCreatedYear,
    comments: values.comments,
    imagePath: values.imagePath,
    size: values.size,
  };
}

export function ArtworkFields({
  values,
  onFieldChange,
  errors = {},
}: {
  values: ArtworkFormValues;
  onFieldChange: (field: keyof ArtworkFormValues, value: string) => void;
  errors?: Partial<Record<keyof ArtworkFormValues, string | undefined>>;
}) {
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <TextInput
          label="Title"
          placeholder="Title"
          name="title"
          variant="filled"
          value={values.title}
          error={errors.title}
          onChange={(event) =>
            onFieldChange('title', event.currentTarget.value)
          }
        />
        <TextInput
          label="Artist Name"
          placeholder="Name"
          name="artistName"
          variant="filled"
          value={values.artistName}
          error={errors.artistName}
          onChange={(event) =>
            onFieldChange('artistName', event.currentTarget.value)
          }
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <TextInput
          label="Category"
          placeholder="Category"
          name="categoryName"
          variant="filled"
          value={values.categoryName}
          error={errors.categoryName}
          onChange={(event) =>
            onFieldChange('categoryName', event.currentTarget.value)
          }
        />
        <TextInput
          label="Location"
          placeholder="Location"
          name="locationName"
          variant="filled"
          value={values.locationName}
          error={errors.locationName}
          onChange={(event) =>
            onFieldChange('locationName', event.currentTarget.value)
          }
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <TextInput
          label="Width"
          placeholder="0.000"
          name="width"
          variant="filled"
          value={values.width}
          error={errors.width}
          onChange={(event) =>
            onFieldChange('width', event.currentTarget.value)
          }
        />
        <TextInput
          label="Height"
          placeholder="0.000"
          name="height"
          variant="filled"
          value={values.height}
          error={errors.height}
          onChange={(event) =>
            onFieldChange('height', event.currentTarget.value)
          }
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <TextInput
          label="Date Created - Month"
          placeholder="MM"
          name="dateCreatedMonth"
          variant="filled"
          value={values.dateCreatedMonth}
          error={errors.dateCreatedMonth}
          onChange={(event) =>
            onFieldChange('dateCreatedMonth', event.currentTarget.value)
          }
        />
        <TextInput
          label="Date Created - Year"
          placeholder="YYYY"
          name="dateCreatedYear"
          variant="filled"
          value={values.dateCreatedYear}
          error={errors.dateCreatedYear}
          onChange={(event) =>
            onFieldChange('dateCreatedYear', event.currentTarget.value)
          }
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl">
        <TextInput
          label="Donor"
          name="donorName"
          variant="filled"
          value={values.donorName}
          error={errors.donorName}
          onChange={(event) =>
            onFieldChange('donorName', event.currentTarget.value)
          }
        />
        <TextInput
          label="Size Category"
          placeholder="small"
          name="size"
          variant="filled"
          value={values.size}
          error={errors.size}
          onChange={(event) => onFieldChange('size', event.currentTarget.value)}
        />
      </SimpleGrid>

      <Textarea
        mt="md"
        label="Comments"
        placeholder="Your comments"
        maxRows={10}
        minRows={5}
        autosize
        name="comments"
        variant="filled"
        value={values.comments}
        error={errors.comments}
        onChange={(event) =>
          onFieldChange('comments', event.currentTarget.value)
        }
      />
    </>
  );
}

export function useArtworkImageUpload() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(
    null,
  );
  const [uploadedFileName, setUploadedFileName] = useState('');

  const resetUploadState = useCallback(() => {
    setUploadedImage(null);
    setUploadedImageBase64(null);
    setUploadedFileName('');
  }, []);

  const handleImageUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setUploadedImage(file);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  return {
    uploadedImage,
    uploadedImageBase64,
    uploadedFileName,
    previewImage: uploadedImageBase64,
    handleImageUpload,
    removeImage: resetUploadState,
    resetUploadState,
  };
}

export function ArtworkImageUpload({
  currentImagePath,
  uploadedImage,
  previewImage,
  onDrop,
  onRemove,
  theme,
}: {
  currentImagePath?: string;
  uploadedImage: File | null;
  previewImage: string | null;
  onDrop: (files: File[]) => void;
  onRemove: () => void;
  theme: MantineTheme;
}) {
  const isReplacingImage = Boolean(currentImagePath);
  const uploadTitle = isReplacingImage
    ? 'Upload replacement image'
    : 'Upload artwork image';
  const uploadHelpText = isReplacingImage
    ? 'Choose or drop a replacement image. It will replace the current artwork image when you save changes.'
    : 'Choose or drop the image you want associated with this record.';

  return (
    <>
      {currentImagePath ? (
        <div className={classes.imageComparison}>
          <div>
            <Title order={4} className={classes.previewTitle}>
              Current image
            </Title>
            <div className={`${shellClasses.mediaFrame} ${classes.uploadPreview}`}>
              <Image src={currentImagePath} alt="Current artwork preview" />
            </div>
          </div>

          {uploadedImage && previewImage ? (
            <div>
              <Title order={4} className={classes.previewTitle}>
                Replacement image
              </Title>
              <div className={`${shellClasses.mediaFrame} ${classes.uploadPreview} ${classes.replacementPreview}`}>
                <Image src={previewImage} alt="Replacement artwork preview" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!uploadedImage ? (
        <Dropzone
          onDrop={onDrop}
          radius="md"
          accept={['image/*']}
          maxSize={30 * 1024 ** 2}
        >
          <div style={{ pointerEvents: 'none' }}>
            <Group justify="center">
              <Dropzone.Accept>
                <IconDownload
                  style={{ width: rem(50), height: rem(50) }}
                  color={theme.colors.blue[6]}
                  stroke={1.5}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX
                  style={{ width: rem(50), height: rem(50) }}
                  color={theme.colors.red[6]}
                  stroke={1.5}
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconCloudUpload
                  style={{ width: rem(50), height: rem(50) }}
                  stroke={1.5}
                />
              </Dropzone.Idle>
            </Group>

            <Text ta="center" fw={700} fz="lg" mt="xl">
              <Dropzone.Accept>
                {isReplacingImage ? 'Drop replacement image here' : 'Drop image here'}
              </Dropzone.Accept>
              <Dropzone.Reject>Images must be less than 30mb</Dropzone.Reject>
              <Dropzone.Idle>{uploadTitle}</Dropzone.Idle>
            </Text>
            <Text ta="center" fz="sm" mt="xs" c="dimmed">
              {uploadHelpText} Images must be less than 30mb.
            </Text>
          </div>
        </Dropzone>
      ) : null}

      {uploadedImage && previewImage && !currentImagePath ? (
        <div style={{ position: 'relative', paddingTop: '10px', textAlign: 'center' }}>
          <div className={`${shellClasses.mediaFrame} ${classes.uploadPreview}`}>
            <Image src={previewImage} alt="Uploaded artwork preview" />
          </div>
        </div>
      ) : null}

      {uploadedImage ? (
        <div className={classes.uploadActions}>
          <Button onClick={onRemove} color="red" variant="light">
            Remove selected image
          </Button>
        </div>
      ) : null}
    </>
  );
}
