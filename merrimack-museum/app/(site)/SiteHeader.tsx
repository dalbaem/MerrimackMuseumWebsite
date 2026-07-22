"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Burger, Button, Collapse, Container, Group, Stack, type ButtonProps } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import classes from "./SiteHeader.module.css";
import { useUser } from "./AppStateProvider";
import { signIn, signOut, useSession } from "next-auth/react";

interface NavLink {
  link: string;
  label: string;
  auth: "admin" | "faculty" | null;
}

const links: NavLink[] = [
  { link: "/collection", label: "Collection", auth: null },
  { link: "/about", label: "About", auth: null },
  { link: "/request", label: "Request", auth: "faculty" },
  { link: "/dashboard", label: "Dashboard", auth: "admin" },
];

const defaultCollectionPath = "/collection";

function canAccessLink(link: NavLink, isAdmin: boolean, isFaculty: boolean) {
  if (link.auth === null) {
    return true;
  }

  if (link.auth === "admin") {
    return isAdmin;
  }

  if (link.auth === "faculty") {
    return isAdmin || isFaculty;
  }

  return false;
}

function LogInButton({
  className,
  buttonProps,
  signInCallbackUrl,
  signOutCallbackUrl,
}: {
  className?: string;
  buttonProps?: ButtonProps;
  signInCallbackUrl?: string;
  signOutCallbackUrl?: string;
}) {
  const { data: session } = useSession();
  const mergedClassName = [className, buttonProps?.className]
    .filter(Boolean)
    .join(" ");

  const commonButtonProps: ButtonProps = {
    size: "xl",
    variant: "filled",
    color: "#003768",
    styles: {
      root: {
        border: "1px solid #003768",
      },
    },
    ...buttonProps,
    className: mergedClassName || undefined,
  };

  if (session?.user) {
    return (
      <div suppressHydrationWarning>
        <Button
          {...commonButtonProps}
          onClick={() =>
            signOut({ callbackUrl: signOutCallbackUrl ?? defaultCollectionPath })
          }
        >
          Log Out
        </Button>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      <Button
        {...commonButtonProps}
        onClick={() =>
          signIn("google", {
            callbackUrl: signInCallbackUrl ?? defaultCollectionPath,
          })
        }
      >
        Log In
      </Button>
    </div>
  );
}

export default function SiteHeader() {
  const [opened, { toggle }] = useDisclosure(false);
  const pathname = usePathname();
  const {
    isAdmin,
    isFaculty,
  } = useUser();

  const visibleLinks = links.filter((link) => canAccessLink(link, isAdmin, isFaculty));

  const closeMobileMenu = () => {
    if (opened) {
      toggle();
    }
  };

  return (
    <header className={classes.header}>
      <Container size="lg">
        <div className={classes.inner}>
          <div className={classes.logoContainer}>
            <a href="https://www.merrimack.edu" className={classes.headerLink}>
              <Image
                src="/McLogoHoriz2.png"
                alt="Merrimack College logo"
                width={240}
                height={56}
                priority
              />
            </a>
          </div>
          <Group gap={10} visibleFrom="sm" className={classes.desktopNav}>
            {visibleLinks.map((link) => (
              <Link key={link.link} href={link.link} className={classes.link}>
                {link.label}
              </Link>
            ))}
          </Group>
          <div className={classes.actions}>
            <div className={classes.desktopAuth}>
              <LogInButton
                buttonProps={{ size: "sm" }}
                signInCallbackUrl={pathname}
                signOutCallbackUrl="/collection"
              />
            </div>
            <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" />
          </div>
        </div>
        <Collapse in={opened} hiddenFrom="sm">
          <Stack gap={4} className={classes.mobileMenu}>
            {visibleLinks.map((link) => (
              <Link
                key={link.link}
                href={link.link}
                className={classes.mobileNavLink}
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
            <div className={classes.mobileAuth}>
              <LogInButton
                buttonProps={{ size: "sm", fullWidth: true }}
                signInCallbackUrl={pathname}
                signOutCallbackUrl="/collection"
              />
            </div>
          </Stack>
        </Collapse>
      </Container>
    </header>
  );
}
