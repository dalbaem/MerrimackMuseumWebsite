'use client';

import { useEffect, useState } from 'react';
import {
  Affix,
  Alert,
  AspectRatio,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Image,
  Input,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Transition,
  rem,
} from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { IconArrowUp, IconSearch, IconX } from '@tabler/icons-react';
import { fetchArtworks, searchArtworks } from '@/lib/api/artworks';
import type { ArtworkDto } from '@/shared/types/api';
import {
  getArtworkAltText,
  getArtworkDimensions,
  getArtworkTitle,
  getKnownArtworkDate,
  getSearchResultsLabel,
  preventImageInteractions,
  readArtworkText,
} from './artworkPresentation';
import classes from './CollectionPage.module.css';

const PAGE_SIZE = 30;

type ArtworkState =
  | { status: 'loading'; data: ArtworkDto[] }
  | { status: 'success'; data: ArtworkDto[] }
  | { status: 'noMatch'; data: ArtworkDto[] }
  | { status: 'error'; data: ArtworkDto[] };

function CollectionArtworkGrid({
  artworkData,
  onSelectArtwork,
}: {
  artworkData: ArtworkState;
  onSelectArtwork: (artwork: ArtworkDto) => void;
}) {
  if (artworkData.status === 'loading' && artworkData.data.length === 0) {
    return (
      <Paper className={classes.emptyState}>
        <Text fw={600}>Loading the collection...</Text>
      </Paper>
    );
  }

  if (artworkData.status === 'error') {
    return (
      <Paper className={classes.emptyState}>
        <Text fw={600}>We couldn&apos;t load the artwork right now.</Text>
        <Text c="dimmed" mt="xs">
          Please try the search again in a moment.
        </Text>
      </Paper>
    );
  }

  if (artworkData.status === 'noMatch') {
    return (
      <Paper className={classes.emptyState}>
        <Text fw={600}>No works matched that search.</Text>
        <Text c="dimmed" mt="xs">
          Try an artist name, title, medium, or year.
        </Text>
      </Paper>
    );
  }

  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, lg: 3 }}
      spacing="xl"
      className={classes.grid}
    >
      {artworkData.data.map((artwork) => {
        const title = getArtworkTitle(artwork.title);
        const artist = readArtworkText(artwork.artistName);
        const category = readArtworkText(artwork.categoryName);
        const date = getKnownArtworkDate(artwork);
        const imagePath = readArtworkText(artwork.imagePath);

        return (
          <Card
            key={artwork.id}
            padding="lg"
            className={classes.card}
            onClick={() => onSelectArtwork(artwork)}
          >
            <Card.Section>
              <AspectRatio
                ratio={4 / 3}
                className={classes.imageFrame}
                onContextMenu={preventImageInteractions}
                onDragStartCapture={preventImageInteractions}
              >
                {imagePath ? (
                  <Image
                    src={imagePath}
                    alt={getArtworkAltText(artwork, title)}
                    className={classes.artImage}
                    draggable={false}
                  />
                ) : (
                  <div className={classes.imagePlaceholder}>
                    <Text size="sm" c="dimmed">
                      Image unavailable
                    </Text>
                  </div>
                )}
              </AspectRatio>
            </Card.Section>

            <Stack gap="sm" mt="md">
              {category || date ? (
                <Group
                  justify={category ? 'space-between' : 'flex-end'}
                  align="flex-start"
                >
                  {category ? (
                    <Badge
                      radius="xl"
                      variant="light"
                      className={classes.badge}
                    >
                      {category}
                    </Badge>
                  ) : null}
                  {date ? (
                    <Text size="sm" className={classes.cardDate}>
                      {date}
                    </Text>
                  ) : null}
                </Group>
              ) : null}

              <div>
                <Title order={3} size="h4" className={classes.cardTitle}>
                  {title}
                </Title>
                {artist ? (
                  <Text c="dimmed" mt={4}>
                    {artist}
                  </Text>
                ) : null}
              </div>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

function CollectionArtworkModal({
  artwork,
  onClose,
}: {
  artwork: ArtworkDto | null;
  onClose: () => void;
}) {
  const title = getArtworkTitle(artwork?.title);
  const artist = readArtworkText(artwork?.artistName);
  const category = readArtworkText(artwork?.categoryName);
  const knownDate = getKnownArtworkDate(artwork);
  const dimensions = getArtworkDimensions(artwork);
  const imagePath = readArtworkText(artwork?.imagePath);

  return (
    <Modal
      opened={artwork !== null}
      onClose={onClose}
      centered
      size="xl"
      overlayProps={{ backgroundOpacity: 0.74, blur: 4 }}
      classNames={{
        body: classes.modalWindowBody,
        close: classes.modalClose,
        content: classes.modalContent,
        header: classes.modalHeader,
      }}
    >
      {artwork ? (
        <Stack gap="md" className={classes.modalBody}>
          {imagePath ? (
            <div
              className={classes.modalImageWrap}
              onContextMenu={preventImageInteractions}
              onDragStartCapture={preventImageInteractions}
            >
              <Image
                src={imagePath}
                alt={getArtworkAltText(artwork, title)}
                className={classes.modalImage}
                draggable={false}
              />
            </div>
          ) : (
            <div
              className={`${classes.modalImageWrap} ${classes.modalImagePlaceholder}`}
            >
              <Text size="sm" c="dimmed">
                Image unavailable
              </Text>
            </div>
          )}

          <div className={classes.modalCaption}>
            <div className={classes.modalHeading}>
              <div className={classes.modalTitleBlock}>
                {category ? (
                  <Badge
                    radius="xl"
                    variant="light"
                    className={`${classes.badge} ${classes.modalBadge}`}
                  >
                    {category}
                  </Badge>
                ) : null}
                <Title order={2} className={classes.modalTitle}>
                  {title}
                </Title>
                {artist ? (
                  <Text className={classes.modalArtist}>{artist}</Text>
                ) : null}
              </div>
              {knownDate ? (
                <Text size="sm" className={classes.modalDate}>
                  {knownDate}
                </Text>
              ) : null}
            </div>

            {dimensions ? (
              <div className={classes.modalDetails}>
                <Text size="xs" className={classes.modalDetailLabel}>
                  Dimensions
                </Text>
                <Text size="sm" className={classes.modalDetailValue}>
                  {dimensions}
                </Text>
              </div>
            ) : null}
          </div>
        </Stack>
      ) : null}
    </Modal>
  );
}

function useCollectionPageData() {
  const [query, setQuery] = useState('');
  const [artworkData, setArtworkData] = useState<ArtworkState>({
    status: 'loading',
    data: [],
  });
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkDto | null>(
    null,
  );
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const loadCollectionPage = async (nextOffset: number, append = false) => {
    try {
      if (!append) {
        setArtworkData((prev) => ({ status: 'loading', data: prev.data }));
      }

      const data = await fetchArtworks({
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      setIsSearchMode(false);
      setActiveQuery('');
      setHasMore(data.length === PAGE_SIZE);

      setArtworkData((prevData) => {
        if (!append || prevData.status !== 'success') {
          return data.length === 0
            ? { status: 'noMatch', data: [] }
            : { status: 'success', data };
        }

        return {
          status: 'success',
          data: prevData.data.concat(data),
        };
      });
      setOffset(nextOffset + data.length);
    } catch (error) {
      console.error('Error fetching artwork list:', error);
      setArtworkData({ status: 'error', data: [] });
    }
  };

  const handleSearch = async (searchValue: string) => {
    const normalizedSearchValue = searchValue.trim();

    if (!normalizedSearchValue) {
      await loadCollectionPage(0);
      return;
    }

    try {
      setArtworkData((prev) => ({ status: 'loading', data: prev.data }));

      const data = await searchArtworks(normalizedSearchValue);

      setIsSearchMode(true);
      setActiveQuery(normalizedSearchValue);
      setHasMore(false);
      setOffset(0);

      if (data.length === 0) {
        setArtworkData({ status: 'noMatch', data: [] });
        return;
      }

      setArtworkData({ status: 'success', data });
    } catch (error) {
      console.error('Error searching artwork:', error);
      setArtworkData({ status: 'error', data: [] });
    }
  };

  const handleClear = async () => {
    setQuery('');
    setSelectedArtwork(null);
    await loadCollectionPage(0);
  };

  useEffect(() => {
    void loadCollectionPage(0);
  }, []);

  const handleLoadMore = async () => {
    if (isFetchingMore || isSearchMode || !hasMore) {
      return;
    }

    setIsFetchingMore(true);
    try {
      await loadCollectionPage(offset, true);
    } finally {
      setIsFetchingMore(false);
    }
  };

  return {
    artworkData,
    activeQuery,
    handleClear,
    handleLoadMore,
    handleSearch,
    hasMore,
    isFetchingMore,
    isSearchMode,
    query,
    selectedArtwork,
    setQuery,
    setSelectedArtwork,
  };
}

export default function CollectionPage() {
  const {
    artworkData,
    activeQuery,
    handleClear,
    handleLoadMore,
    handleSearch,
    hasMore,
    isFetchingMore,
    isSearchMode,
    query,
    selectedArtwork,
    setQuery,
    setSelectedArtwork,
  } = useCollectionPageData();
  const [scroll, scrollTo] = useWindowScroll();
  const [signInState, setSignInState] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSignInState(params.get('signin'));
  }, []);

  const signInNotice =
    signInState === 'access-denied'
      ? 'That Google account does not have faculty or admin access. You can still browse the collection as a guest.'
      : signInState === 'access-check-failed'
        ? 'We could not verify account access right now. You can still browse the collection as a guest.'
        : null;

  return (
    <div className={classes.page}>
      <Container size="xl" className={classes.shell}>
        <Stack gap="lg" className={classes.topSection}>
          {signInNotice ? (
            <Alert color="blue" radius="lg">
              {signInNotice}
            </Alert>
          ) : null}
          <Input
            size="lg"
            radius="xl"
            value={query}
            className={classes.searchInput}
            placeholder="Search artwork, artist, medium, or year"
            leftSection={<IconSearch size={18} />}
            rightSectionPointerEvents="all"
            rightSection={
              query ? (
                <Button
                  size="compact-sm"
                  variant="subtle"
                  color="gray"
                  onClick={handleClear}
                >
                  <IconX size={14} />
                </Button>
              ) : null
            }
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearch(query);
              }
            }}
          />

          <Text className={classes.resultsLine}>
            {getSearchResultsLabel(activeQuery, artworkData.data.length)}
            {artworkData.status === 'loading' && artworkData.data.length > 0
              ? ' • refreshing results...'
              : isSearchMode
                ? ' • search mode'
                : ' • collection mode'}
          </Text>
        </Stack>

        <CollectionArtworkGrid
          artworkData={artworkData}
          onSelectArtwork={setSelectedArtwork}
        />

        <CollectionArtworkModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
        />

        <Affix position={{ bottom: 20, right: 20 }}>
          <div className={classes.floatingBar}>
            <Transition transition="slide-up" mounted={scroll.y > 0}>
              {(transitionStyles) => (
                <Button
                  leftSection={
                    <IconArrowUp style={{ width: rem(16), height: rem(16) }} />
                  }
                  style={transitionStyles}
                  onClick={() => scrollTo({ y: 0 })}
                  variant="white"
                >
                  Scroll to top
                </Button>
              )}
            </Transition>

            <Transition
              transition="slide-up"
              mounted={scroll.y > 0 && !isSearchMode}
            >
              {(transitionStyles) => (
                <Button
                  style={transitionStyles}
                  onClick={() => void handleLoadMore()}
                  disabled={isFetchingMore || !hasMore}
                >
                  {isFetchingMore ? 'Loading...' : hasMore ? 'Load more' : 'All loaded'}
                </Button>
              )}
            </Transition>
          </div>
        </Affix>
      </Container>
    </div>
  );
}
