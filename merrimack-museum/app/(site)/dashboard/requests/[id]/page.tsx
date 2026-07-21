'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Group, Image, SimpleGrid, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import DashboardPageShell from '../../DashboardPageShell';
import {
    applyMoveRequestApproval,
    applyMoveRequestCompletion,
    fetchMoveRequestById,
    updateMoveRequest,
} from '@/lib/api/moveRequests';
import type { MoveRequestDto } from '@/shared/types/api';
import {
    formatMoveRequestDateTime,
    getMoveRequestStatusLabel,
    MOVE_REQUEST_NOTES_MAX_LENGTH,
} from '@/shared/types/moveRequest';

function readErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage;
}

export default function RequestDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [request, setRequest] = useState<MoveRequestDto | null>(null);
    const [destination, setDestination] = useState('');
    const [requestNotes, setRequestNotes] = useState('');
    const [loadErrorMessage, setLoadErrorMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isCancelled = false;

        async function loadRequest() {
            setIsLoading(true);
            setLoadErrorMessage('');

            try {
                const data = await fetchMoveRequestById(params.id);
                if (isCancelled) {
                    return;
                }

                setRequest(data);
                setDestination(data.toLocation || '');
                setRequestNotes(data.requestNotes || '');
            } catch (error) {
                console.error('Error loading move request:', error);
                if (isCancelled) {
                    return;
                }

                setLoadErrorMessage(
                    readErrorMessage(error, 'Unable to load request details right now.'),
                );
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        void loadRequest();

        return () => {
            isCancelled = true;
        };
    }, [params.id]);

    const saveEdits = async () => {
        try {
            setErrorMessage('');
            const updated = await updateMoveRequest(params.id, {
                requestNotes,
                toLocation: destination,
            });
            setRequest(updated);
            setDestination(updated.toLocation || '');
            setRequestNotes(updated.requestNotes || '');
            return updated;
        } catch (error) {
            console.error('Error updating move request:', error);
            setErrorMessage('Unable to save request updates right now.');
            return null;
        }
    };

    const runRequestAction = async (
        requestId: number | undefined,
        action: (requestId: number) => Promise<unknown>,
    ) => {
        if (!requestId) {
            setErrorMessage('We could not determine which request to update.');
            return;
        }

        try {
            setErrorMessage('');
            await action(requestId);
            router.push('/dashboard');
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage(readErrorMessage(error, 'Unable to update the request right now.'));
        }
    };

    const handleApprove = async () => {
        if (!destination.trim()) {
            setErrorMessage('Enter a destination before approving this request.');
            return;
        }

        const updatedRequest = await saveEdits();
        if (!updatedRequest) {
            return;
        }

        await runRequestAction(updatedRequest.id, (requestId) =>
            applyMoveRequestApproval(requestId, 'approve'),
        );
    };

    const handleDecline = async () => {
        await runRequestAction(request?.id, (requestId) =>
            applyMoveRequestApproval(requestId, 'deny'),
        );
    };

    const handleComplete = async () => {
        const updatedRequest = await saveEdits();
        if (!updatedRequest) {
            return;
        }

        await runRequestAction(updatedRequest.id, (requestId) =>
            applyMoveRequestCompletion(requestId, {
                artworkId: updatedRequest.artwork.id,
                completionStatus: 'complete',
                toLocation: destination,
            }),
        );
    };

    const handleCancelMove = async () => {
        await runRequestAction(request?.id, (requestId) =>
            applyMoveRequestCompletion(requestId, {
                completionStatus: 'cancel',
            }),
        );
    };

    const submittedWithoutDestination = !request?.toLocation?.trim();
    const cannotApproveWithoutDestination = request?.status === 'pending' && !destination.trim();
    const canEditRequest = request?.status === 'pending' || request?.status === 'in_movement';

    if (isLoading) {
        return (
            <DashboardPageShell title="Request Details">
                <Text>Loading request...</Text>
            </DashboardPageShell>
        );
    }

    if (!request) {
        return (
            <DashboardPageShell title="Request Details">
                <Alert color="red">
                    {loadErrorMessage || 'Unable to load request details right now.'}
                </Alert>
            </DashboardPageShell>
        );
    }

    return (
        <DashboardPageShell title="Request Details">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                <Card radius="lg" withBorder>
                    <Title order={2}>Request Details</Title>
                    <Stack gap="sm" mt="lg">
                        <Text><strong>Request ID:</strong> {request.id}</Text>
                        <Text><strong>Artwork:</strong> {request.artwork.title || `Artwork #${request.artwork.id}`}</Text>
                        <Text><strong>Artist:</strong> {request.artwork.artistName || '-'}</Text>
                        <Text><strong>Requested By:</strong> {request.user.email || '-'}</Text>
                        <Text><strong>Requested On:</strong> {formatMoveRequestDateTime(request.requestedAt, '-')}</Text>
                        <Text><strong>From Location:</strong> {request.fromLocation || '-'}</Text>
                        <Text><strong>Current Location:</strong> {request.artwork.locationName || '-'}</Text>
                        <Text><strong>Submitted Destination:</strong> {request.toLocation || 'To be entered during approval'}</Text>
                        <Text>
                            <strong>Status:</strong>{' '}
                            {getMoveRequestStatusLabel(request.status)}
                        </Text>
                    </Stack>
                    {request.artwork.imagePath ? (
                        <Image
                            mt="lg"
                            radius="md"
                            src={request.artwork.imagePath}
                            alt={request.artwork.title || 'Artwork image'}
                        />
                    ) : null}
                </Card>

                <Card radius="lg" withBorder>
                    <Title order={2}>Review And Edit</Title>
                    <Stack mt="lg">
                        {errorMessage ? (
                            <Alert color="red">
                                {errorMessage}
                            </Alert>
                        ) : null}
                        <TextInput
                            label="Destination"
                            value={destination}
                            disabled={!canEditRequest}
                            onChange={(event) => {
                                setDestination(event.currentTarget.value);
                                if (errorMessage) {
                                    setErrorMessage('');
                                }
                            }}
                        />
                        {request.status === 'pending' && submittedWithoutDestination ? (
                            <Text size="sm" c="dimmed">
                                This request was submitted without a destination. Enter one before approving it.
                            </Text>
                        ) : null}
                        <Textarea
                            label="Request Notes"
                            description={`${requestNotes.length}/${MOVE_REQUEST_NOTES_MAX_LENGTH} characters`}
                            maxLength={MOVE_REQUEST_NOTES_MAX_LENGTH}
                            minRows={5}
                            autosize
                            value={requestNotes}
                            disabled={!canEditRequest}
                            onChange={(event) => {
                                setRequestNotes(event.currentTarget.value);
                                if (errorMessage) {
                                    setErrorMessage('');
                                }
                            }}
                        />
                        <Group>
                            {canEditRequest ? (
                                <Button onClick={saveEdits} variant="light">
                                    Save Edits
                                </Button>
                            ) : null}
                            {request.status === 'pending' ? (
                                <>
                                    <Button
                                        color="green"
                                        onClick={handleApprove}
                                        disabled={cannotApproveWithoutDestination}
                                    >
                                        Approve
                                    </Button>
                                    <Button color="red" onClick={handleDecline}>
                                        Decline
                                    </Button>
                                </>
                            ) : null}
                            {request.status === 'in_movement' ? (
                                <>
                                    <Button color="green" onClick={handleComplete}>
                                        Complete
                                    </Button>
                                    <Button color="orange" onClick={handleCancelMove}>
                                        Cancel Move
                                    </Button>
                                </>
                            ) : null}
                        </Group>
                    </Stack>
                </Card>
            </SimpleGrid>
        </DashboardPageShell>
    );
}
