'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Group, Image, Modal, Text, Title, useMantineTheme } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import DashboardPageShell from '../../DashboardPageShell';
import shellClasses from '../../DashboardPageShell.module.css';
import {
    deleteArtwork,
    fetchArtworkById,
    updateArtwork,
} from '@/lib/api/artworks';
import type { ArtworkDto } from '@/shared/types/api';
import {
    ArtworkFields,
    ArtworkImageUpload,
    EMPTY_ARTWORK_FORM,
    type ArtworkFormValues,
    toArtworkMutationFields,
    toArtworkFormValues,
    useArtworkImageUpload,
} from '../artworkForm';
import pageClasses from './ArtworkDetails.module.css';
function getArtworkDetails(values: ArtworkFormValues) {
    return [
        { label: 'Title', value: values.title || '-' },
        { label: 'Artist', value: values.artistName || '-' },
        { label: 'Category', value: values.categoryName || '-' },
        { label: 'Location', value: values.locationName || '-' },
        { label: 'Width', value: values.width || '-' },
        { label: 'Height', value: values.height || '-' },
        { label: 'Date Created Month', value: values.dateCreatedMonth || '-' },
        { label: 'Date Created Year', value: values.dateCreatedYear || '-' },
        { label: 'Donor', value: values.donorName || '-' },
        { label: 'Size Category', value: values.size || '-' },
        { label: 'Comments', value: values.comments || '-' },
    ];
}

export default function ArtworkDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const theme = useMantineTheme();
    const [formData, setFormData] = useState<ArtworkFormValues>(EMPTY_ARTWORK_FORM);
    const [selectedArtwork, setSelectedArtwork] = useState<ArtworkDto | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const {
        uploadedImage,
        uploadedImageBase64,
        uploadedFileName,
        previewImage,
        handleImageUpload,
        removeImage,
        resetUploadState,
    } = useArtworkImageUpload();

    const applyArtworkRecord = (artwork: ArtworkDto | null) => {
        setSelectedArtwork(artwork);
        setFormData(artwork ? toArtworkFormValues(artwork) : EMPTY_ARTWORK_FORM);
    };

    useEffect(() => {
        async function loadArtwork() {
            try {
                setPageError(null);
                const artwork = await fetchArtworkById(params.id);
                setSelectedArtwork(artwork);
                setFormData(toArtworkFormValues(artwork));
                resetUploadState();
            } catch (error) {
                console.error('Error loading artwork details:', error);
                setPageError('We could not load that artwork right now.');
                setSelectedArtwork(null);
                setFormData(EMPTY_ARTWORK_FORM);
            }
        }

        void loadArtwork();
    }, [params.id, resetUploadState]);

    const handleSave = async () => {
        try {
            setPageError(null);
            const updatedArtwork = await updateArtwork(
                formData.artworkId,
                toArtworkMutationFields(formData),
                {
                    ...(uploadedFileName ? { uploadedFileName } : {}),
                    ...(uploadedImageBase64 ? { uploadedImage: uploadedImageBase64 } : {}),
                },
            );

            applyArtworkRecord(updatedArtwork);
            setIsEditing(false);
            resetUploadState();
        } catch (error) {
            console.error('Error:', error);
            setPageError(
                error instanceof Error
                    ? error.message
                    : 'Unable to save artwork changes right now.',
            );
        }
    };
    const confirmDelete = async () => {
        try {
            setPageError(null);
            await deleteArtwork(formData.artworkId);
            router.push('/dashboard');
        } catch (error) {
            console.error('Error:', error);
            setPageError(
                error instanceof Error
                    ? error.message
                    : 'Unable to delete that artwork right now.',
            );
        }
    };

    const currentPreviewImage = previewImage || formData.imagePath;
    const subtitle = selectedArtwork
        ? formData.title || `Artwork #${selectedArtwork.id}`
        : 'We could not find that artwork record.';

    return (
        <DashboardPageShell title="Artwork Description" subtitle={subtitle}>
            {selectedArtwork ? (
                <div className={pageClasses.layout}>
                    <div className={`${shellClasses.panelSurface} ${pageClasses.panel} ${pageClasses.imageCard}`}>
                        {currentPreviewImage ? (
                            <>
                                <button
                                    type="button"
                                    className={pageClasses.imageButton}
                                    onClick={() => setImageOpen(true)}
                                >
                                    <div className={`${shellClasses.mediaFrame} ${pageClasses.imageFrame}`}>
                                        <Image src={currentPreviewImage} alt={formData.title || 'Artwork image'} />
                                    </div>
                                </button>
                                <Text className={pageClasses.metaNote}>
                                    Click the image to enlarge it.
                                </Text>
                            </>
                        ) : (
                            <Text>No artwork image is available for this record.</Text>
                        )}
                    </div>

                    <div className={`${shellClasses.panelSurface} ${pageClasses.panel}`}>
                        {pageError ? (
                            <Alert color="red" mb="md">
                                {pageError}
                            </Alert>
                        ) : null}
                        {isEditing ? (
                            <>
                                <Title order={2}>Edit Artwork</Title>
                                <ArtworkFields
                                    values={formData}
                                    onFieldChange={(field, value) => setFormData((current) => ({ ...current, [field]: value }))}
                                />

                                <ArtworkImageUpload
                                    currentImagePath={formData.imagePath}
                                    uploadedImage={uploadedImage}
                                    previewImage={previewImage}
                                    onDrop={handleImageUpload}
                                    onRemove={removeImage}
                                    theme={theme}
                                />

                                <div className={pageClasses.editActions}>
                                    <Button onClick={handleSave}>Save Changes</Button>
                                    <Button
                                        variant="light"
                                        onClick={() => {
                                            setIsEditing(false);
                                            resetUploadState();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button className={pageClasses.dangerButton} onClick={() => setDeleteOpen(true)}>
                                        Delete Artwork
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Title order={2}>Artwork Information</Title>
                                <div className={pageClasses.infoList}>
                                    {getArtworkDetails(formData).map((item) => (
                                        <div key={item.label} className={pageClasses.infoRow}>
                                            <div className={pageClasses.infoLabel}>{item.label}</div>
                                            <div className={pageClasses.infoValue}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={pageClasses.editActions}>
                                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className={pageClasses.emptyState}>
                    That artwork record could not be found.
                </div>
            )}

            <Modal opened={imageOpen} onClose={() => setImageOpen(false)} centered size="xl" withCloseButton>
                {currentPreviewImage ? (
                    <Image
                        className={pageClasses.modalImage}
                        src={currentPreviewImage}
                        alt={formData.title || 'Artwork image'}
                    />
                ) : null}
            </Modal>

            <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} centered title="Delete Artwork">
                <Text>
                    Do you want to delete {formData.title || 'this'} artwork
                </Text>
                <Group mt="xl" justify="flex-end">
                    <Button className={pageClasses.dangerButton} onClick={confirmDelete}>
                        Yes, delete the artwork
                    </Button>
                    <Button variant="light" onClick={() => setDeleteOpen(false)}>
                        No
                    </Button>
                </Group>
            </Modal>
        </DashboardPageShell>
    );
}
