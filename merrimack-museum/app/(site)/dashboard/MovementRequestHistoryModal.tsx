"use client";

import { Badge, Modal, ScrollArea, Stack, Table, Text } from "@mantine/core";
import type { MoveRequestDto } from "@/shared/types/api";
import {
  formatMoveRequestDateTime,
  getMoveRequestStatusColor,
  getMoveRequestStatusLabel,
} from "@/shared/types/moveRequest";
import classes from "./MovementRequestHistoryModal.module.css";

function formatLocationHistory(request: MoveRequestDto) {
  const fromLocation =
    request.fromLocation || request.artwork.locationName || "Unknown location";
  const toLocation = request.toLocation || "Not provided";

  return `${fromLocation} - ${toLocation}`;
}

function formatArtworkLabel(request: MoveRequestDto) {
  return request.artwork.title
    ? `${request.artwork.title} (#${request.artwork.id})`
    : `Artwork #${request.artwork.id}`;
}

export default function MovementRequestHistoryModal({
  error,
  isLoading,
  onClose,
  opened,
  requests,
  title,
}: {
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  opened: boolean;
  requests: MoveRequestDto[];
  title: string;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      title={title}
      classNames={{
        body: classes.modalBody,
        title: classes.modalTitle,
      }}
    >
      {isLoading ? (
        <Text className={classes.stateText}>Loading movement request history...</Text>
      ) : error ? (
        <Text c="red" className={classes.stateText}>
          {error}
        </Text>
      ) : requests.length === 0 ? (
        <Text className={classes.stateText}>
          No movement request history is available.
        </Text>
      ) : (
        <Stack gap="sm">
          <ScrollArea className={classes.tableScroll}>
            <Table striped highlightOnHover className={classes.historyTable}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User email</Table.Th>
                  <Table.Th>Artwork</Table.Th>
                  <Table.Th>Date/time</Table.Th>
                  <Table.Th>Stage</Table.Th>
                  <Table.Th>Location</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {requests.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td className={classes.wrapCell}>
                      {request.user.email || "-"}
                    </Table.Td>
                    <Table.Td className={classes.wrapCell}>
                      {formatArtworkLabel(request)}
                    </Table.Td>
                    <Table.Td>
                      {formatMoveRequestDateTime(request.requestedAt, "-")}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getMoveRequestStatusColor(request.status)}
                        variant="light"
                      >
                        {getMoveRequestStatusLabel(request.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td className={classes.wrapCell}>
                      {formatLocationHistory(request)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      )}
    </Modal>
  );
}
