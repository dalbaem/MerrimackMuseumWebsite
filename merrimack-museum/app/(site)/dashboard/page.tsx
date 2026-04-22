"use client";

import { useEffect, useState } from "react";
import { Button, Card, Image, Tabs, Text, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
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

  useEffect(() => {
    const loadArtworks = async () => {
      try {
        const artworkResult = await fetchArtworks();
        setArtworks(artworkResult);
      } catch (error) {
        console.error("Error loading artwork search data:", error);
        setArtworks([]);
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
    filteredArtworks,
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

function DashboardActionCard({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
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
            onChange={(event) => onRequestSearchChange(event.currentTarget.value)}
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
  const { filteredArtworks, searchTerm, setSearchTerm } = useArtworkSearchData();
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

  return (
    <div className={pageClasses.page}>
      <div className={pageClasses.shell}>
        <Title order={1} className={pageClasses.title}>
          Dashboard
        </Title>

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
