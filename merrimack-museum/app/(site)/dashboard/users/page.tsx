'use client';

import { useState } from 'react';
import {
  Button,
  Container,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconChevronDown } from '@tabler/icons-react';
import { updateUserRole } from '@/lib/api/users';
import type { AppRole } from '@/shared/types/user';
import DashboardPageShell from '../DashboardPageShell';
import shellClasses from '../DashboardPageShell.module.css';
import classes from './UsersPage.module.css';

const PRIVILEGE_TYPES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Faculty/Staff', value: 'faculty' },
  { label: 'Guest', value: 'guest' },
] as const satisfies ReadonlyArray<{ label: string; value: AppRole }>;

export default function UsersPage() {
  const [opened, setOpened] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedPrivilege, setSelectedPrivilege] = useState<
    (typeof PRIVILEGE_TYPES)[number] | null
  >(null);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value: string) =>
        /^\S+@\S+\.\S+$/.test(value.trim())
          ? null
          : 'Enter a valid email address',
    },
  });

  const handleSubmit = async (values: { email: string }) => {
    if (!selectedPrivilege) {
      return;
    }

    try {
      setSubmitError(null);
      await updateUserRole(
        values.email.trim().toLowerCase(),
        selectedPrivilege.value,
      );
      form.reset();
      setSelectedPrivilege(null);
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to update that user right now.',
      );
    }
  };

  return (
    <DashboardPageShell title="Manage Users">
      <Container size={840} px={0}>
        <div className={`${shellClasses.panelSurface} ${classes.panel}`}>
          <form
            onSubmit={form.onSubmit((values) => {
              void handleSubmit(values);
            })}
          >
            <Title order={2} size="h2" className={classes.title} fw={900}>
              Manage Users
            </Title>

            <Text className={classes.subtitle} mt="xs">
              Grant or remove privileged access by entering a Merrimack email
              and assigning the right role.
            </Text>

            <Stack mt="xl" gap="lg" className={classes.formGrid}>
              <TextInput
                className={classes.emailField}
                label="Email Address"
                placeholder="example@merrimack.edu"
                name="email"
                size="md"
                variant="filled"
                {...form.getInputProps('email')}
              />
              {submitError ? (
                <Text c="red" size="sm">
                  {submitError}
                </Text>
              ) : null}

              <div className={classes.fieldBlock}>
                <div className={classes.fieldLabel}>Privilege Type</div>
                <Menu
                  onOpen={() => setOpened(true)}
                  onClose={() => setOpened(false)}
                  radius="md"
                  width="target"
                  withinPortal
                >
                  <Menu.Target>
                    <UnstyledButton
                      className={classes.selectButton}
                      data-expanded={opened || undefined}
                    >
                      <Group gap="xs">
                        <span className={classes.selectLabel}>
                          {selectedPrivilege?.label ?? 'Select Role'}
                        </span>
                      </Group>
                      <IconChevronDown
                        size={22}
                        className={classes.selectIcon}
                        stroke={1.8}
                      />
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown className={classes.menuDropdown}>
                    {PRIVILEGE_TYPES.map((item) => (
                      <Menu.Item
                        onClick={() => setSelectedPrivilege(item)}
                        key={item.value}
                      >
                        {item.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </div>
              <div className={classes.submitRow}>
                <Button
                  type="submit"
                  size="md"
                  className={classes.submitButton}
                  disabled={!selectedPrivilege}
                >
                  Save Access
                </Button>
              </div>
            </Stack>
          </form>
        </div>
      </Container>
    </DashboardPageShell>
  );
}
