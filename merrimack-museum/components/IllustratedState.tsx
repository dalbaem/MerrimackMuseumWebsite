import type { ReactNode } from "react";
import Link from "next/link";
import { Button, Container, Image, SimpleGrid, Text, Title } from "@mantine/core";
import illustration from "@/public/404.svg";
import classes from "./IllustratedState.module.css";

interface IllustratedStateProps {
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
  imageAlt?: string;
  showIllustration?: boolean;
  title: string;
}

export default function IllustratedState({
  actionHref,
  actionLabel,
  description,
  imageAlt = "Illustration",
  showIllustration = true,
  title,
}: IllustratedStateProps) {
  const actionButton =
    actionHref && actionLabel ? (
      <Button
        component={Link}
        href={actionHref}
        variant="outline"
        size="md"
        mt="xl"
        className={classes.control}
      >
        {actionLabel}
      </Button>
    ) : null;

  if (!showIllustration) {
    return (
      <Container className={classes.root}>
        <Title className={classes.title}>{title}</Title>
        <Text c="dimmed" size="lg">
          {description}
        </Text>
        {actionButton}
      </Container>
    );
  }

  return (
    <Container className={classes.root}>
      <SimpleGrid spacing={{ base: 40, sm: 80 }} cols={{ base: 1, sm: 2 }}>
        <Image
          src={illustration.src}
          alt={imageAlt}
          className={classes.mobileImage}
        />
        <div>
          <Title className={classes.title}>{title}</Title>
          <Text c="dimmed" size="lg">
            {description}
          </Text>
          {actionButton}
        </div>
        <Image
          src={illustration.src}
          alt={imageAlt}
          className={classes.desktopImage}
        />
      </SimpleGrid>
    </Container>
  );
}
