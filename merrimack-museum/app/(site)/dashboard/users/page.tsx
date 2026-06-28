'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  IconChevronDown,
  IconEdit,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react';
import Link from 'next/link';
import { searchUsers, updateUserRole } from '@/lib/api/users';
import type { UserDto } from '@/shared/types/api';
import DashboardPageShell from '../DashboardPageShell';
import shellClasses from '../DashboardPageShell.module.css';
import {
  getRoleLabel,
  USER_ROLE_OPTIONS,
  type UserRoleOption,
} from './roleOptions';
import classes from './UsersPage.module.css';

function getUserDetailsHref(email: string) {
  return `/dashboard/users/${encodeURIComponent(email)}`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchRoleMenuOpened, setSearchRoleMenuOpened] = useState(false);
  const [addRoleMenuOpened, setAddRoleMenuOpened] = useState(false);
  const [selectedSearchRole, setSelectedSearchRole] =
    useState<UserRoleOption | null>(null);
  const [selectedAddRole, setSelectedAddRole] =
    useState<UserRoleOption | null>(null);

  const addUserForm = useForm({
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

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setSearchError(null);
      setUsers(await searchUsers());
    } catch (error) {
      console.error('Error:', error);
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Unable to load users right now.',
      );
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchEmail.trim().toLowerCase();

    return users.filter((user) => {
      const matchesEmail = normalizedSearch
        ? user.email.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesRole = selectedSearchRole
        ? user.role === selectedSearchRole.value
        : true;

      return matchesEmail && matchesRole;
    });
  }, [searchEmail, selectedSearchRole, users]);

  const handleAddUser = async (values: { email: string }) => {
    if (!selectedAddRole) {
      return;
    }

    try {
      setIsAddingUser(true);
      setSubmitError(null);
      setSubmitSuccess(null);
      const user = await updateUserRole(
        values.email.trim().toLowerCase(),
        selectedAddRole.value,
      );

      setSubmitSuccess(
        `Added ${user.email} as ${getRoleLabel(user.role)}.`,
      );
      addUserForm.reset();
      setSelectedAddRole(null);
      await loadUsers();
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to add that user right now.',
      );
    } finally {
      setIsAddingUser(false);
    }
  };

  const resultLabel =
    filteredUsers.length === 1 ? '1 user' : `${filteredUsers.length} users`;

  return (
    <DashboardPageShell title="Manage Users">
      <Container size={1100} px={0}>
        <div className={classes.pageGrid}>
          <div className={`${shellClasses.panelSurface} ${classes.panel}`}>
            <Title order={2} size="h2" className={classes.title} fw={900}>
              Search Users
            </Title>

            <Text className={classes.subtitle} mt="xs">
              Search by email, then select a user to edit their privilege role.
            </Text>

            <div className={classes.searchForm}>
              <TextInput
                className={classes.emailField}
                label="Search Email"
                placeholder="Start typing an email..."
                name="searchEmail"
                size="md"
                variant="filled"
                leftSection={<IconSearch size={18} stroke={1.8} />}
                value={searchEmail}
                onChange={(event) => setSearchEmail(event.currentTarget.value)}
              />

              <div className={classes.fieldBlock}>
                <div className={classes.fieldLabel}>Privilege Type</div>
                <Menu
                  onOpen={() => setSearchRoleMenuOpened(true)}
                  onClose={() => setSearchRoleMenuOpened(false)}
                  radius="md"
                  width="target"
                  withinPortal
                >
                  <Menu.Target>
                    <UnstyledButton
                      className={classes.selectButton}
                      data-expanded={searchRoleMenuOpened || undefined}
                    >
                      <Group gap="xs">
                        <span className={classes.selectLabel}>
                          {selectedSearchRole?.label ?? 'All Privileges'}
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
                    <Menu.Item onClick={() => setSelectedSearchRole(null)}>
                      All Privileges
                    </Menu.Item>
                    {USER_ROLE_OPTIONS.map((item) => (
                      <Menu.Item
                        onClick={() => setSelectedSearchRole(item)}
                        key={item.value}
                      >
                        {item.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </div>
            </div>

            {searchError ? (
              <Text c="red" size="sm" mt="md">
                {searchError}
              </Text>
            ) : null}

            <div className={classes.resultsHeader}>
              <Text fw={800} className={classes.resultsTitle}>
                Users
              </Text>
              <Text size="sm" className={classes.resultCount}>
                {isLoadingUsers ? 'Loading...' : resultLabel}
              </Text>
            </div>

            {isLoadingUsers ? (
              <div className={classes.stateBlock}>Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className={classes.stateBlock}>
                No users match that search.
              </div>
            ) : (
              <div className={classes.userResults}>
                {filteredUsers.map((user) => (
                  <Link
                    key={`${user.email}-${user.role}`}
                    className={classes.userResult}
                    href={getUserDetailsHref(user.email)}
                  >
                    <div className={classes.userSummary}>
                      <Text fw={800}>{user.email}</Text>
                    </div>
                    <span className={classes.permissionType}>
                      {getRoleLabel(user.role)}
                    </span>
                    <span className={classes.editCue}>
                      <IconEdit size={17} stroke={1.8} />
                      Edit
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={`${shellClasses.panelSurface} ${classes.panel}`}>
            <form
              onSubmit={addUserForm.onSubmit((values) => {
                void handleAddUser(values);
              })}
            >
              <Title order={3} size="h3" className={classes.title} fw={900}>
                Add User
              </Title>

              <Text className={classes.subtitle} mt="xs">
                Add an admin or faculty/staff account.
              </Text>

              <Stack mt="xl" gap="lg" className={classes.formGrid}>
                <TextInput
                  className={classes.emailField}
                  label="Email Address"
                  placeholder="example@merrimack.edu"
                  name="email"
                  size="md"
                  variant="filled"
                  {...addUserForm.getInputProps('email')}
                />

                <div className={classes.fieldBlock}>
                  <div className={classes.fieldLabel}>Privilege Type</div>
                  <Menu
                    onOpen={() => setAddRoleMenuOpened(true)}
                    onClose={() => setAddRoleMenuOpened(false)}
                    radius="md"
                    width="target"
                    withinPortal
                  >
                    <Menu.Target>
                      <UnstyledButton
                        className={classes.selectButton}
                        data-expanded={addRoleMenuOpened || undefined}
                      >
                        <Group gap="xs">
                          <span className={classes.selectLabel}>
                            {selectedAddRole?.label ?? 'Select Privilege'}
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
                      {USER_ROLE_OPTIONS.map((item) => (
                        <Menu.Item
                          onClick={() => setSelectedAddRole(item)}
                          key={item.value}
                        >
                          {item.label}
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                </div>

                {submitError ? (
                  <Text c="red" size="sm">
                    {submitError}
                  </Text>
                ) : null}
                {submitSuccess ? (
                  <Text c="green" size="sm">
                    {submitSuccess}
                  </Text>
                ) : null}

                <Button
                  type="submit"
                  size="md"
                  className={classes.primaryButton}
                  disabled={!selectedAddRole}
                  loading={isAddingUser}
                  leftSection={<IconPlus size={18} stroke={1.8} />}
                >
                  Add User
                </Button>
              </Stack>
            </form>
          </div>
        </div>
      </Container>
    </DashboardPageShell>
  );
}
