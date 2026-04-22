"use client";

import { Badge, Button, Card, Divider, Group, Paper, Stack, Text, Title } from "@mantine/core";
import type { MoveRequestDto } from "@/shared/types/api";
import { formatMoveRequestDateTime } from "@/shared/types/moveRequest";
import pageClasses from "./RequestPage.module.css";

interface RequestListSectionProps {
  badgeColor?: string;
  badgeLabel?: string;
  deletingRequestId?: number | null;
  description: string;
  emptyLabel: string;
  items: MoveRequestDto[];
  onDeleteRequest?: (requestId: number | null) => void;
  title: string;
}

export default function RequestListSection({
  badgeColor,
  badgeLabel,
  deletingRequestId = null,
  description,
  emptyLabel,
  items,
  onDeleteRequest,
  title,
}: RequestListSectionProps) {
  return (
    <Paper radius="xl" p="xl" className={pageClasses.statusCard}>
      <Stack gap="md" className={pageClasses.requestListCard}>
        <div>
          <Title order={3} className={pageClasses.sectionTitle}>
            {title}
          </Title>
          <Text size="sm" className={pageClasses.sectionText}>
            {description}
          </Text>
        </div>
        <Divider />
        <div className={pageClasses.requestListScroller}>
          {items.length > 0 ? (
            <Stack gap="sm">
              {items.map((item) => (
                <Card
                  key={item.id ?? `${item.artwork.id}-${item.requestedAt}`}
                  radius="lg"
                  padding="md"
                  className={pageClasses.requestItem}
                >
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>{item.artwork.title || "Untitled"}</Text>
                      <Text c="dimmed" size="sm">
                        ID {item.artwork.id}
                      </Text>
                    </div>
                    {badgeLabel ? (
                      <Badge color={badgeColor} variant="light">
                        {badgeLabel}
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="sm" mt="sm">
                    Destination: {item.toLocation || "Not provided"}
                  </Text>
                  <Text c="dimmed" size="xs" mt="xs">
                    Submitted {formatMoveRequestDateTime(item.requestedAt)}
                  </Text>
                  {onDeleteRequest ? (
                    <Button
                      mt="sm"
                      size="xs"
                      color="red"
                      variant="light"
                      loading={deletingRequestId === item.id}
                      onClick={() => onDeleteRequest(item.id)}
                    >
                      Delete request
                    </Button>
                  ) : null}
                </Card>
              ))}
            </Stack>
          ) : (
            <Text className={pageClasses.sectionText}>{emptyLabel}</Text>
          )}
        </div>
      </Stack>
    </Paper>
  );
}
