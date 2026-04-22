"use client";

import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import IllustratedState from "@/components/IllustratedState";
import { MOVE_REQUEST_NOTES_MAX_LENGTH } from "@/shared/types/moveRequest";
import { useUser } from "../AppStateProvider";
import RequestArtworkPicker from "./RequestArtworkPicker";
import RequestListSection from "./RequestListSection";
import pageClasses from "./RequestPage.module.css";
import {
  DESTINATION_OPTIONS,
  type RequestFormValues,
  useRequestPageData,
} from "./requestPageState";

export default function RequestPage() {
  const { email, isAdmin, isFaculty, permissionsResolved } = useUser();
  const {
    artworks,
    deletingRequestId,
    form,
    handleDeletePendingRequest,
    handleSubmit,
    isSubmitting,
    loadError,
    pendingRequests,
    requestsInMovement,
    selectedArtwork,
    setSelectedArtwork,
    showLocationFields,
  } = useRequestPageData(email);
  const canAccessRequestPage = isFaculty || isAdmin;

  if (!canAccessRequestPage) {
    if (!permissionsResolved) {
      return (
        <IllustratedState
          title="Checking access..."
          description="Verifying your request permissions."
          showIllustration={false}
        />
      );
    }

    return (
      <IllustratedState
        title="Faculty or Admin Access Required"
        description="Only faculty and admins can submit or review artwork movement requests. Everyone else can keep browsing the collection as a guest."
        imageAlt="Sign-in required illustration"
      />
    );
  }

  return (
    <div className={pageClasses.page}>
      <Container size="lg">
        <Stack className={pageClasses.shell}>
          <div className={pageClasses.panelGrid}>
            <Paper radius="xl" p="xl" className={pageClasses.panelCard}>
              <Stack gap="lg">
                <div>
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={2} className={pageClasses.sectionTitle}>
                        Submit a new request
                      </Title>
                    </div>
                  </Group>
                </div>

                {loadError ? (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    {loadError}
                  </Alert>
                ) : null}

                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack gap="md">
                    <div>
                      <Text
                        fw={700}
                        size="sm"
                        className={pageClasses.fieldLabel}
                      >
                        Email:{" "}
                        <span className={pageClasses.emailValue}>
                          {form.values.email || "No email associated with account"}
                        </span>
                      </Text>
                    </div>

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput
                        label="Current location"
                        placeholder="Auto-fills after artwork selection"
                        id="request-source"
                        name="source"
                        autoComplete="off"
                        readOnly
                        classNames={{
                          input: pageClasses.formInput,
                          label: pageClasses.fieldLabel,
                        }}
                        {...form.getInputProps("source")}
                      />
                      <Select
                        label="Move type"
                        placeholder="Ex. Select a move type"
                        id="request-destination"
                        name="moveType"
                        data={DESTINATION_OPTIONS}
                        allowDeselect={false}
                        classNames={{
                          input: pageClasses.formInput,
                          label: pageClasses.fieldLabel,
                        }}
                        value={form.values.moveType}
                        onChange={(value) =>
                          form.setFieldValue(
                            "moveType",
                            (value ?? "") as RequestFormValues["moveType"],
                          )
                        }
                        error={form.errors.moveType}
                        disabled={isSubmitting}
                      />
                    </SimpleGrid>

                    {showLocationFields ? (
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <TextInput
                          label="Building"
                          placeholder="Ex. Academic Building"
                          id="request-building"
                          name="building"
                          autoComplete="off"
                          classNames={{
                            input: pageClasses.formInput,
                            label: pageClasses.fieldLabel,
                          }}
                          {...form.getInputProps("building")}
                          disabled={isSubmitting}
                        />
                        <TextInput
                          label="Office number"
                          placeholder="Ex. 214"
                          id="request-office-number"
                          name="officeNumber"
                          autoComplete="off"
                          classNames={{
                            input: pageClasses.formInput,
                            label: pageClasses.fieldLabel,
                          }}
                          {...form.getInputProps("officeNumber")}
                          disabled={isSubmitting}
                        />
                      </SimpleGrid>
                    ) : null}

                    <RequestArtworkPicker
                      items={artworks}
                      selectedArtwork={selectedArtwork}
                      onSelectArtwork={setSelectedArtwork}
                    />

                    <Textarea
                      label="Request notes"
                      placeholder="Add any request notes."
                      description={`${form.values.requestNotes.length}/${MOVE_REQUEST_NOTES_MAX_LENGTH} characters`}
                      id="request-message"
                      name="requestNotes"
                      autoComplete="off"
                      maxLength={MOVE_REQUEST_NOTES_MAX_LENGTH}
                      minRows={5}
                      autosize
                      classNames={{
                        input: pageClasses.textareaInput,
                        label: pageClasses.fieldLabel,
                      }}
                      {...form.getInputProps("requestNotes")}
                      disabled={isSubmitting}
                    />

                    <Group justify="space-between" mt="sm">
                      <Button type="submit" size="md" loading={isSubmitting}>
                        Submit request
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Stack>
            </Paper>

            <div className={pageClasses.requestLists}>
              <RequestListSection
                title="Pending Requests"
                description="Requests that are still waiting for review."
                items={pendingRequests}
                emptyLabel="No current pending requests."
                deletingRequestId={deletingRequestId}
                onDeleteRequest={handleDeletePendingRequest}
              />
              <RequestListSection
                title="Requests in movement"
                description="Approved requests that are currently being moved."
                items={requestsInMovement}
                emptyLabel="No requests currently in movement."
                badgeLabel="In movement"
                badgeColor="blue"
              />
            </div>
          </div>
        </Stack>
      </Container>
    </div>
  );
}
