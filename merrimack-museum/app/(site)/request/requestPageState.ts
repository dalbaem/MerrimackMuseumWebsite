"use client";

import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { format } from "date-fns";
import { fetchAvailableArtworks } from "@/lib/api/artworks";
import {
  createMoveRequest,
  deleteMoveRequest,
  fetchMoveRequestsForUser,
} from "@/lib/api/moveRequests";
import type { ArtworkDto, MoveRequestDto } from "@/shared/types/api";
import { MOVE_REQUEST_NOTES_MAX_LENGTH } from "@/shared/types/moveRequest";

export type MoveType = "remove" | "office";

export interface RequestFormValues {
  email: string;
  source: string;
  moveType: MoveType | "";
  building: string;
  officeNumber: string;
  requestNotes: string;
}

interface RequestPageResult {
  artworks: ArtworkDto[];
  userRequests: MoveRequestDto[];
}

export const DESTINATION_OPTIONS = [
  {
    value: "remove",
    label: "Remove from office",
  },
  {
    value: "office",
    label: "Move to office",
  },
];

const EMPTY_REQUEST_FORM: RequestFormValues = {
  email: "",
  source: "",
  moveType: "",
  building: "",
  officeNumber: "",
  requestNotes: "",
};

function safeTrim(value: string | undefined | null) {
  return (value ?? "").trim();
}

function buildFormattedDestination(values: RequestFormValues) {
  const trimmedBuilding = safeTrim(values.building);
  const trimmedOfficeNumber = safeTrim(values.officeNumber);

  if (values.moveType === "office") {
    return `${trimmedBuilding} ${trimmedOfficeNumber}`.trim();
  }

  return null;
}

function useRequestFormState(email: string, selectedArtwork: ArtworkDto | null) {
  const form = useForm<RequestFormValues>({
    initialValues: EMPTY_REQUEST_FORM,
    validate: {
      email: (value: string) =>
        !/^\S+@\S+$/.test(value) ? "Enter a valid email address" : null,
      source: (value: string) =>
        safeTrim(value).length === 0 ? "Artwork is required" : null,
      moveType: (value: string) =>
        safeTrim(value).length === 0 ? "Move type is required" : null,
      building: (value: string, values: RequestFormValues) =>
        values.moveType === "office"
          ? safeTrim(value).length === 0
            ? "Building is required"
            : null
          : null,
      officeNumber: (value: string, values: RequestFormValues) =>
        values.moveType === "office"
          ? safeTrim(value).length === 0
            ? "Office number is required"
            : null
          : null,
      requestNotes: (value: string) =>
        value.length > MOVE_REQUEST_NOTES_MAX_LENGTH
          ? `Request notes must be ${MOVE_REQUEST_NOTES_MAX_LENGTH} characters or fewer`
          : null,
    },
  });

  const showLocationFields = form.values.moveType === "office";

  useEffect(() => {
    if (email && form.values.email !== email) {
      form.setFieldValue("email", email);
    }
  }, [email, form]);

  useEffect(() => {
    const source = selectedArtwork
      ? safeTrim(selectedArtwork.locationName) || "Unknown"
      : "";

    if (source !== form.values.source) {
      form.setFieldValue("source", source);
    }
  }, [form, selectedArtwork]);

  useEffect(() => {
    if (!showLocationFields && form.values.building) {
      form.setFieldValue("building", "");
    }

    if (!showLocationFields && form.values.officeNumber) {
      form.setFieldValue("officeNumber", "");
    }
  }, [form, showLocationFields]);

  return {
    form,
    showLocationFields,
  };
}

export function useRequestPageData(email: string) {
  const [artworks, setArtworks] = useState<ArtworkDto[]>([]);
  const [userRequests, setUserRequests] = useState<MoveRequestDto[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkDto | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const { form, showLocationFields } = useRequestFormState(
    email,
    selectedArtwork,
  );

  const pendingRequests = userRequests.filter((item) => item.status === "pending");
  const requestsInMovement = userRequests.filter(
    (item) => item.status === "in_movement",
  );

  const fetchRequestPageData = async (
    currentEmail: string,
  ): Promise<RequestPageResult> => {
    const userRequestsPromise = currentEmail
      ? fetchMoveRequestsForUser(currentEmail)
      : Promise.resolve([]);

    const artworksPromise = fetchAvailableArtworks();

    const [userRequests, artworks] = await Promise.all([
      userRequestsPromise,
      artworksPromise,
    ]);

    return {
      artworks,
      userRequests,
    };
  };

  useEffect(() => {
    let ignore = false;

    const initializeRequestPage = async () => {
      try {
        const pageData = await fetchRequestPageData(email);
        if (ignore) {
          return;
        }

        setArtworks(pageData.artworks);
        setUserRequests(pageData.userRequests);
        setLoadError(null);
      } catch (error) {
        if (ignore) {
          return;
        }

        console.error("Error initializing request data:", error);
        setLoadError("We could not load your request data right now.");
        setArtworks([]);
        setUserRequests([]);
      }
    };

    void initializeRequestPage();

    return () => {
      ignore = true;
    };
  }, [email]);

  const loadPage = async (currentEmail: string) => {
    const pageData = await fetchRequestPageData(currentEmail);
    setArtworks(pageData.artworks);
    setUserRequests(pageData.userRequests);
  };

  const handleDeletePendingRequest = async (requestId: number | null) => {
    if (!requestId) {
      return;
    }

    setDeletingRequestId(requestId);
    setLoadError(null);

    try {
      await deleteMoveRequest(requestId);
      await loadPage(form.values.email);
    } catch (error) {
      console.error("Error deleting request:", error);
      setLoadError("We could not delete that request. Please try again.");
    } finally {
      setDeletingRequestId(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedArtwork) {
      form.setFieldError("source", "Artwork is required");
      return;
    }

    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }

    setIsSubmitting(true);
    setLoadError(null);

    try {
      if (form.values.moveType !== "office" && form.values.moveType !== "remove") {
        form.setFieldError("moveType", "Move type is required");
        return;
      }

      const formattedDestination = buildFormattedDestination(form.values);
      const requestNotes = safeTrim(form.values.requestNotes);
      const currentEmail = form.values.email;

      await createMoveRequest({
        artworkId: selectedArtwork.id,
        email: currentEmail,
        requestNotes,
        requestedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        toLocation: formattedDestination,
      });

      await loadPage(currentEmail);
      form.setValues({
        ...EMPTY_REQUEST_FORM,
        email: currentEmail,
      });
      setSelectedArtwork(null);
    } catch (error) {
      console.error("Error submitting request:", error);
      setLoadError("We could not submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
