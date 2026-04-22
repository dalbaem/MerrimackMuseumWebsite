"use client";

import { useState } from "react";
import { Menu, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import type { ArtworkDto } from "@/shared/types/api";
import pageClasses from "./RequestPage.module.css";

interface RequestArtworkPickerProps {
  items: ArtworkDto[];
  selectedArtwork: ArtworkDto | null;
  onSelectArtwork: (artwork: ArtworkDto | null) => void;
}

export default function RequestArtworkPicker({
  items,
  selectedArtwork,
  onSelectArtwork,
}: RequestArtworkPickerProps) {
  const [opened, setOpened] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = normalizedSearch
    ? items.filter(
        (item) =>
          item.id.toString().includes(normalizedSearch) ||
          Boolean(item.title?.toLowerCase().includes(normalizedSearch)),
      )
    : items;

  const selectedArtworkLabel = selectedArtwork
    ? `${selectedArtwork.id}${selectedArtwork.title ? ` - ${selectedArtwork.title}` : ""}`
    : "Select";

  return (
    <div>
      <Text fw={600} size="sm" mb="xs" className={pageClasses.fieldLabel}>
        Artwork
      </Text>
      <Menu
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
        shadow="md"
        radius="lg"
        width="target"
        withinPortal
      >
        <Menu.Target>
          <UnstyledButton
            className={pageClasses.pickerButton}
            data-expanded={opened || undefined}
          >
            <div className={pageClasses.pickerCopy}>
              <span className={pageClasses.pickerLabel}>Selected artwork</span>
              <span className={pageClasses.pickerValue}>
                {selectedArtworkLabel}
              </span>
            </div>
            <IconChevronDown size={20} />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown className={pageClasses.menuDropdown}>
          <Stack gap="xs">
            <TextInput
              placeholder="Search by ID or title..."
              id="request-artwork-search"
              name="artworkSearch"
              autoComplete="off"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
            />
            <div className={pageClasses.menuList}>
              <Menu.Item onClick={() => onSelectArtwork(null)}>
                <Text fw={600}>Select</Text>
                <Text size="sm" c="dimmed">
                  No artwork selected yet
                </Text>
              </Menu.Item>
              {filteredItems.map((item) => (
                <Menu.Item key={item.id} onClick={() => onSelectArtwork(item)}>
                  <Text fw={600}>#{item.id}</Text>
                  <Text size="sm" c="dimmed">
                    {item.title || "Untitled"}
                    {item.locationName ? ` • ${item.locationName}` : ""}
                  </Text>
                </Menu.Item>
              ))}
            </div>
          </Stack>
        </Menu.Dropdown>
      </Menu>

      {selectedArtwork ? (
        <div className={pageClasses.previewCard}>
          <Text fw={600} size="sm" className={pageClasses.previewTitle}>
            Artwork preview
          </Text>
          <div className={pageClasses.previewContent}>
            {selectedArtwork.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedArtwork.imagePath}
                alt={selectedArtwork.title || `Artwork ${selectedArtwork.id}`}
                className={pageClasses.previewImage}
              />
            ) : (
              <div className={pageClasses.previewImageFallback}>
                <Text c="dimmed" size="sm">
                  No image available
                </Text>
              </div>
            )}
            <div className={pageClasses.previewMeta}>
              <Text fw={700}>{selectedArtwork.title || "Untitled"}</Text>
              <Text size="sm" c="dimmed">
                ID {selectedArtwork.id}
              </Text>
              {selectedArtwork.artistName ? (
                <Text size="sm" c="dimmed">
                  Artist: {selectedArtwork.artistName}
                </Text>
              ) : null}
              {selectedArtwork.locationName ? (
                <Text size="sm" c="dimmed">
                  Current location: {selectedArtwork.locationName}
                </Text>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
