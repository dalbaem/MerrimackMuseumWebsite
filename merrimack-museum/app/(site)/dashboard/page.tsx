"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Image,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPrinter, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchArtworks } from "@/lib/api/artworks";
import {
  applyMoveRequestCompletion,
  fetchMoveRequestsByState,
} from "@/lib/api/moveRequests";
import type { ArtworkDto, MoveRequestDto } from "@/shared/types/api";
import {
  formatMoveRequestDateTime,
  type MoveRequestCompletionActionInput,
} from "@/shared/types/moveRequest";
import pageClasses from "./DashboardHome.module.css";

function formatArtworkPrintValue(value: string | number | null | undefined) {
  if (value == null) {
    return "-";
  }

  const normalizedValue = value.toString().trim();
  return normalizedValue || "-";
}

function getArtworkPrintFields(artwork: ArtworkDto) {
  return [
    { label: "Artwork ID", value: artwork.id },
    { label: "Title", value: artwork.title },
    { label: "Artist", value: artwork.artistName },
    { label: "Donor", value: artwork.donorName },
    { label: "Category", value: artwork.categoryName },
    { label: "Location", value: artwork.locationName },
    { label: "Width", value: artwork.width },
    { label: "Height", value: artwork.height },
    { label: "Size", value: artwork.size },
    { label: "Date Created Month", value: artwork.dateCreatedMonth },
    { label: "Date Created Year", value: artwork.dateCreatedYear },
    { label: "Comments", value: artwork.comments },
  ];
}

function escapePrintHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toAbsoluteImageUrl(imagePath: string | null) {
  if (!imagePath) {
    return null;
  }

  return new URL(imagePath, window.location.origin).toString();
}

function buildPrintMarkup(artworks: ArtworkDto[]) {
  const artworkMarkup = artworks
    .map((artwork) => {
      const imageUrl = toAbsoluteImageUrl(artwork.imagePath);
      const fieldsMarkup = getArtworkPrintFields(artwork)
        .map(
          (item) =>
            `<li><strong>${escapePrintHtml(item.label)}:</strong> ${escapePrintHtml(
              formatArtworkPrintValue(item.value),
            )}</li>`,
        )
        .join("");

      const imageMarkup = imageUrl
        ? `<div class="imageWrap"><img class="image" src="${escapePrintHtml(imageUrl)}" alt="${escapePrintHtml(artwork.title || `Artwork ${artwork.id}`)}" /></div>`
        : '<div class="noImage">No image available for this artwork.</div>';

      return `<section class="artworkPage">${imageMarkup}<ul class="infoList">${fieldsMarkup}</ul></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Artwork Database Print</title>
    <style>
      @page {
        margin: 0.6in;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #111827;
        background: #fff;
      }

      :root {
        --print-page-height: 9.8in;
        --print-page-gap: 0.18in;
      }

      .document {
        display: grid;
        gap: 0;
      }

      .artworkPage {
        display: flex;
        flex-direction: column;
        gap: var(--print-page-gap);
        min-height: var(--print-page-height);
        height: var(--print-page-height);
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .artworkPage:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .imageWrap {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1 1 auto;
        min-height: 0;
      }

      .image {
        max-width: 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .noImage {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 auto;
        min-height: 0;
        border: 1px solid #d1d5db;
        padding: 1rem;
        text-align: center;
      }

      .infoList {
        flex: 0 0 auto;
        margin: 0;
        padding-left: 1.2rem;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .infoList li {
        margin: 0 0 0.2rem;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>
    <div class="document">${artworkMarkup}</div>
  </body>
</html>`;
}

function waitForPrintImages(printDocument: Document) {
  const imageElements = Array.from(printDocument.images);
  const pendingImages = imageElements.filter(
    (imageElement) => !imageElement.complete,
  );

  if (pendingImages.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(
    pendingImages.map(
      (imageElement) =>
        new Promise<void>((resolve) => {
          const finish = () => {
            imageElement.removeEventListener("load", finish);
            imageElement.removeEventListener("error", finish);
            resolve();
          };

          imageElement.addEventListener("load", finish);
          imageElement.addEventListener("error", finish);
        }),
    ),
  ).then(() => undefined);
}

async function openPrintDialogForArtworks(artworks: ArtworkDto[]) {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "8.5in";
  printFrame.style.height = "11in";
  printFrame.style.border = "0";
  printFrame.style.opacity = "0";
  printFrame.style.pointerEvents = "none";

  document.body.appendChild(printFrame);

  const printWindow = printFrame.contentWindow;
  const printDocument = printWindow?.document;

  if (!printWindow || !printDocument) {
    document.body.removeChild(printFrame);
    throw new Error("Unable to open the browser print dialog.");
  }

  printDocument.open();
  printDocument.write(buildPrintMarkup(artworks));
  printDocument.close();

  await waitForPrintImages(printDocument);

  await new Promise<void>((resolve) => {
    const cleanup = () => {
      printWindow.removeEventListener("afterprint", cleanup);
      window.clearTimeout(fallbackTimer);
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
      resolve();
    };

    const fallbackTimer = window.setTimeout(cleanup, 60000);
    printWindow.addEventListener("afterprint", cleanup);
    printWindow.focus();
    printWindow.print();
  });
}

function matchesRequestSearch(item: MoveRequestDto, rawSearchTerm: string) {
  const normalizedSearch = rawSearchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const searchableFields = [
    item.id.toString(),
    item.artwork.id.toString(),
    item.artwork.title,
    item.artwork.artistName,
    item.user.email,
    item.artwork.locationName,
    item.toLocation,
    formatMoveRequestDateTime(item.requestedAt, "-"),
  ];

  return searchableFields.some((field) =>
    field?.toLowerCase().includes(normalizedSearch),
  );
}

function useArtworkSearchData() {
  const [searchTerm, setSearchTerm] = useState("");
  const [artworks, setArtworks] = useState<ArtworkDto[]>([]);
  const [isLoadingArtworks, setIsLoadingArtworks] = useState(true);

  useEffect(() => {
    const loadArtworks = async () => {
      try {
        setIsLoadingArtworks(true);
        const artworkResult = await fetchArtworks();
        setArtworks(artworkResult);
      } catch (error) {
        console.error("Error loading artwork search data:", error);
        setArtworks([]);
      } finally {
        setIsLoadingArtworks(false);
      }
    };

    void loadArtworks();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredArtworks = normalizedSearch
    ? artworks.filter(
        (item) =>
          item.id.toString().includes(normalizedSearch) ||
          item.title?.toLowerCase().includes(normalizedSearch) ||
          item.artistName?.toLowerCase().includes(normalizedSearch),
      )
    : artworks;

  return {
    allArtworks: artworks,
    filteredArtworks,
    isLoadingArtworks,
    searchTerm,
    setSearchTerm,
  };
}

function useRequestManagerData() {
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [requestTab, setRequestTab] = useState<string | null>("requests");
  const [pendingRequests, setPendingRequests] = useState<MoveRequestDto[]>([]);
  const [requestsInMovement, setRequestsInMovement] = useState<
    MoveRequestDto[]
  >([]);
  const [activeMovementAction, setActiveMovementAction] = useState<
    string | null
  >(null);
  const [requestManagerError, setRequestManagerError] = useState("");

  const loadRequests = async () => {
    const [pendingResult, approvedResult] = await Promise.allSettled([
      fetchMoveRequestsByState("pending"),
      fetchMoveRequestsByState("approved"),
    ]);

    if (pendingResult.status === "fulfilled") {
      setPendingRequests(pendingResult.value);
    } else {
      console.error("Error refreshing pending requests:", pendingResult.reason);
      setPendingRequests([]);
    }

    if (approvedResult.status === "fulfilled") {
      setRequestsInMovement(approvedResult.value);
    } else {
      console.error(
        "Error refreshing requests in movement:",
        approvedResult.reason,
      );
      setRequestsInMovement([]);
    }
  };

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPendingRequests = pendingRequests.filter((item) =>
    matchesRequestSearch(item, requestSearchTerm),
  );
  const filteredRequestsInMovement = requestsInMovement.filter((item) =>
    matchesRequestSearch(item, requestSearchTerm),
  );

  const hasRequestSearch = requestSearchTerm.trim().length > 0;

  const handleMovementAction = async (
    actionKey: string,
    requestId: number,
    input: MoveRequestCompletionActionInput,
  ) => {
    try {
      setRequestManagerError("");
      setActiveMovementAction(actionKey);
      await applyMoveRequestCompletion(requestId, input);
      await loadRequests();
    } catch (error) {
      console.error("Error updating movement request:", error);
      setRequestManagerError(
        error instanceof Error
          ? error.message
          : "Unable to update that movement request right now.",
      );
    } finally {
      setActiveMovementAction(null);
    }
  };

  return {
    activeMovementAction,
    filteredPendingRequests,
    filteredRequestsInMovement,
    hasRequestSearch,
    requestManagerError,
    requestSearchTerm,
    requestTab,
    handleMovementAction,
    setRequestSearchTerm,
    setRequestTab,
  };
}

function DashboardActionCard({ href, title }: { href: string; title: string }) {
  return (
    <Card className={pageClasses.actionCard} radius="lg">
      <Link href={href} className={pageClasses.actionLink}>
        <Text className={pageClasses.actionEyebrow}>Collection Tools</Text>
        <Title order={3}>{title}</Title>
        <div className={pageClasses.actionFooter}>
          <span>Open workspace</span>
          <span>→</span>
        </div>
      </Link>
    </Card>
  );
}

function PrintDatabaseButton({
  disabled,
  isLoading,
  onPrintDatabase,
}: {
  disabled: boolean;
  isLoading: boolean;
  onPrintDatabase: () => void;
}) {
  return (
    <Button
      onClick={onPrintDatabase}
      leftSection={<IconPrinter size={18} />}
      className={pageClasses.printButton}
      disabled={disabled}
      loading={isLoading}
      size="md"
    >
      Print Database
    </Button>
  );
}

function ArtworkSearchPanel({
  artworks,
  onOpenArtwork,
  onSearchChange,
  searchTerm,
}: {
  artworks: ArtworkDto[];
  onOpenArtwork: (artworkId: number) => void;
  onSearchChange: (value: string) => void;
  searchTerm: string;
}) {
  return (
    <Card className={pageClasses.searchCard} radius="lg">
      <Title order={2}>Search and Edit Artwork</Title>
      <Text c="dimmed" mt="xs">
        Search by artwork ID, title, or artist, then open the artwork
        description page to edit details.
      </Text>
      <TextInput
        mt="lg"
        size="md"
        leftSection={<IconSearch size={18} />}
        placeholder="Search artwork..."
        value={searchTerm}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
      />

      <div className={pageClasses.searchResults}>
        {artworks.map((item) => (
          <div key={item.id} className={pageClasses.searchResult}>
            {item.imagePath ? (
              <Image
                className={pageClasses.thumb}
                src={item.imagePath}
                alt={item.title || `Artwork ${item.id}`}
              />
            ) : (
              <div className={pageClasses.thumb} />
            )}
            <div>
              <Text fw={700}>{item.title || `Artwork #${item.id}`}</Text>
              <Text size="sm" c="dimmed">
                ID {item.id}
                {item.artistName ? ` • ${item.artistName}` : ""}
              </Text>
            </div>
            <Button variant="light" onClick={() => onOpenArtwork(item.id)}>
              View Description
            </Button>
          </div>
        ))}
        {artworks.length === 0 ? (
          <div className={pageClasses.emptyState}>
            No artwork matched that search.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function RequestManagerList({
  activeMovementAction,
  emptyLabel,
  items,
  onRunMovementAction,
  showMovementActions = false,
}: {
  activeMovementAction: string | null;
  emptyLabel: string;
  items: MoveRequestDto[];
  onRunMovementAction: (
    actionKey: string,
    requestId: number,
    input: MoveRequestCompletionActionInput,
  ) => Promise<void>;
  showMovementActions?: boolean;
}) {
  if (items.length === 0) {
    return <div className={pageClasses.emptyState}>{emptyLabel}</div>;
  }

  return (
    <div className={pageClasses.requestScrollArea}>
      <div className={pageClasses.miniList}>
        {items.map((item) => (
          <div
            key={`${item.id}-${item.artwork.id}`}
            className={pageClasses.miniListItem}
          >
            <div className={pageClasses.requestItemHeader}>
              <Text fw={700}>
                {item.artwork.title || `Artwork #${item.artwork.id}`}
              </Text>
              <Text size="sm" c="dimmed">
                Request #{item.id}
              </Text>
            </div>
            <Text size="sm" c="dimmed">
              {item.user.email}
            </Text>
            <Text size="sm">
              Current: {item.artwork.locationName || "Unknown location"}
            </Text>
            <Text size="sm">To: {item.toLocation || "Unknown location"}</Text>
            <Text size="sm">
              Date: {formatMoveRequestDateTime(item.requestedAt, "-")}
            </Text>
            <div className={pageClasses.requestActions}>
              <Button
                variant="subtle"
                size="compact-sm"
                component={Link}
                href={`/dashboard/requests/${item.id}`}
              >
                {showMovementActions ? "View Details" : "Open Request"}
              </Button>
              {showMovementActions ? (
                <>
                  <Button
                    color="green"
                    size="compact-sm"
                    loading={activeMovementAction === `complete-${item.id}`}
                    onClick={() =>
                      void onRunMovementAction(`complete-${item.id}`, item.id, {
                        artworkId: item.artwork.id,
                        completionStatus: "complete",
                        toLocation: item.toLocation,
                      })
                    }
                  >
                    Complete
                  </Button>
                  <Button
                    color="orange"
                    size="compact-sm"
                    loading={activeMovementAction === `sendback-${item.id}`}
                    onClick={() =>
                      void onRunMovementAction(`sendback-${item.id}`, item.id, {
                        completionStatus: "sendback",
                      })
                    }
                  >
                    Send Back
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestManagerPanel({
  activeMovementAction,
  filteredPendingRequests,
  filteredRequestsInMovement,
  hasRequestSearch,
  onRequestSearchChange,
  onRunMovementAction,
  onRequestTabChange,
  requestManagerError,
  requestSearchTerm,
  requestTab,
}: {
  activeMovementAction: string | null;
  filteredPendingRequests: MoveRequestDto[];
  filteredRequestsInMovement: MoveRequestDto[];
  hasRequestSearch: boolean;
  onRequestSearchChange: (value: string) => void;
  onRunMovementAction: (
    actionKey: string,
    requestId: number,
    input: MoveRequestCompletionActionInput,
  ) => Promise<void>;
  onRequestTabChange: (value: string | null) => void;
  requestManagerError: string;
  requestSearchTerm: string;
  requestTab: string | null;
}) {
  return (
    <aside className={pageClasses.sideCard}>
      <div className={pageClasses.requestManagerHeader}>
        <Title order={3}>Requests and Active Moves</Title>
        <Text size="sm" c="dimmed">
          Review pending requests and finish items already in movement.
        </Text>
      </div>
      {requestManagerError ? (
        <Text size="sm" c="red">
          {requestManagerError}
        </Text>
      ) : null}
      <Tabs
        value={requestTab}
        onChange={onRequestTabChange}
        className={pageClasses.requestTabs}
      >
        <Tabs.List className={pageClasses.requestTabsList}>
          <Tabs.Tab value="requests" className={pageClasses.requestTab}>
            Pending Requests
          </Tabs.Tab>
          <Tabs.Tab value="movement" className={pageClasses.requestTab}>
            Requests In Movement
          </Tabs.Tab>
        </Tabs.List>
        <div className={pageClasses.requestSearchWrap}>
          <TextInput
            size="sm"
            leftSection={<IconSearch size={16} />}
            placeholder="Search by artwork, requester, destination, or date..."
            value={requestSearchTerm}
            onChange={(event) =>
              onRequestSearchChange(event.currentTarget.value)
            }
          />
        </div>

        <Tabs.Panel value="requests" pt="md">
          <RequestManagerList
            activeMovementAction={activeMovementAction}
            emptyLabel={
              hasRequestSearch
                ? "No pending requests matched that search."
                : "No pending requests right now."
            }
            items={filteredPendingRequests}
            onRunMovementAction={onRunMovementAction}
          />
        </Tabs.Panel>

        <Tabs.Panel value="movement" pt="md">
          <RequestManagerList
            activeMovementAction={activeMovementAction}
            emptyLabel={
              hasRequestSearch
                ? "No requests in movement matched that search."
                : "No requests in movement right now."
            }
            items={filteredRequestsInMovement}
            onRunMovementAction={onRunMovementAction}
            showMovementActions
          />
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}

export default function DashboardHomePage() {
  const router = useRouter();
  const {
    allArtworks,
    filteredArtworks,
    isLoadingArtworks,
    searchTerm,
    setSearchTerm,
  } = useArtworkSearchData();
  const {
    activeMovementAction,
    filteredPendingRequests,
    filteredRequestsInMovement,
    hasRequestSearch,
    requestManagerError,
    requestSearchTerm,
    requestTab,
    handleMovementAction,
    setRequestSearchTerm,
    setRequestTab,
  } = useRequestManagerData();
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printError, setPrintError] = useState("");

  const handlePrintDatabase = async () => {
    if (isLoadingArtworks) {
      return;
    }

    if (allArtworks.length === 0) {
      setPrintError("There are no artwork records to print yet.");
      return;
    }

    try {
      setPrintError("");
      setIsPreparingPrint(true);
      await openPrintDialogForArtworks(allArtworks);
    } catch (error) {
      console.error("Error opening print dialog:", error);
      setPrintError(
        error instanceof Error
          ? error.message
          : "Unable to open the print dialog right now.",
      );
    } finally {
      setIsPreparingPrint(false);
    }
  };

  return (
    <div className={pageClasses.page}>
      <div className={pageClasses.shell}>
        <div className={pageClasses.header}>
          <Title order={1} className={pageClasses.title}>
            Dashboard
          </Title>
          <PrintDatabaseButton
            disabled={isLoadingArtworks}
            isLoading={isPreparingPrint}
            onPrintDatabase={() => void handlePrintDatabase()}
          />
        </div>
        {printError ? (
          <Text size="sm" c="red" className={pageClasses.printError}>
            {printError}
          </Text>
        ) : null}

        <div className={pageClasses.layout}>
          <div className={pageClasses.leftColumn}>
            <DashboardActionCard title="Add Artwork" href="/dashboard/add" />
            <DashboardActionCard title="Manage Users" href="/dashboard/users" />
          </div>

          <div className={pageClasses.middleColumn}>
            <ArtworkSearchPanel
              artworks={filteredArtworks}
              onOpenArtwork={(artworkId) =>
                router.push(`/dashboard/artworks/${artworkId}`)
              }
              onSearchChange={setSearchTerm}
              searchTerm={searchTerm}
            />
          </div>

          <RequestManagerPanel
            activeMovementAction={activeMovementAction}
            filteredPendingRequests={filteredPendingRequests}
            filteredRequestsInMovement={filteredRequestsInMovement}
            hasRequestSearch={hasRequestSearch}
            onRequestSearchChange={setRequestSearchTerm}
            onRequestTabChange={setRequestTab}
            onRunMovementAction={handleMovementAction}
            requestManagerError={requestManagerError}
            requestSearchTerm={requestSearchTerm}
            requestTab={requestTab}
          />
        </div>
      </div>
    </div>
  );
}
