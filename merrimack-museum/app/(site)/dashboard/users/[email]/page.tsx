'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Group,
  Menu,
  Modal,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { deleteUser, fetchUserAccess, updateUserRole } from '@/lib/api/users';
import type { UserDto } from '@/shared/types/api';
import type { AppRole } from '@/shared/types/user';
import DashboardPageShell from '../../DashboardPageShell';
import shellClasses from '../../DashboardPageShell.module.css';
import { getRoleLabel, USER_ROLE_OPTIONS } from '../roleOptions';
import classes from './UserDetails.module.css';

export default function UserDetailsPage() {
  const params = useParams<{ email: string }>();
  const router = useRouter();
  const email = decodeURIComponent(params.email);
  const [user, setUser] = useState<UserDto | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [roleMenuOpened, setRoleMenuOpened] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        setPageError(null);
        const result = await fetchUserAccess(email);
        setUser(result);
        setSelectedRole(result.role);
      } catch (error) {
        console.error('Error loading user:', error);
        setPageError(
          error instanceof Error
            ? error.message
            : 'Unable to load that user right now.',
        );
        setUser(null);
        setSelectedRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, [email]);

  const hasChanges = Boolean(user && selectedRole && selectedRole !== user.role);
  const selectedRoleLabel = selectedRole ? getRoleLabel(selectedRole) : '';
  const currentRoleLabel = user ? getRoleLabel(user.role) : '';

  const goBack = () => {
    router.push('/dashboard/users');
  };

  const handleBack = () => {
    if (hasChanges) {
      setConfirmBackOpen(true);
      return;
    }

    goBack();
  };

  const handleSave = async () => {
    if (!user || !selectedRole || !hasChanges) {
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setConfirmSaveOpen(false);
      const updatedUser = await updateUserRole(user.email, selectedRole);

      setUser(updatedUser);
      setSelectedRole(updatedUser.role);
      setSuccessMessage(
        `${updatedUser.email} is now ${getRoleLabel(updatedUser.role)}.`,
      );
    } catch (error) {
      console.error('Error updating user:', error);
      setPageError(
        error instanceof Error
          ? error.message
          : 'Unable to save user changes right now.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      return;
    }

    try {
      setIsDeleting(true);
      setPageError(null);
      await deleteUser(user.email);
      router.push('/dashboard/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      setConfirmDeleteOpen(false);
      setPageError(
        error instanceof Error
          ? error.message
          : 'Unable to delete that user right now.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardPageShell
      title="Edit User"
      subtitle={user?.email ?? email}
      backHref="/dashboard/users"
      backLabel="Back To Users"
      onBack={handleBack}
    >
      <Container size={760} px={0}>
        {isLoading ? (
          <div className={classes.emptyState}>Loading user...</div>
        ) : user ? (
          <div className={`${shellClasses.panelSurface} ${classes.panel}`}>
            <Title order={2} size="h2" className={classes.title} fw={900}>
              User Privileges
            </Title>

            <Text className={classes.subtitle} mt="xs">
              Review the user email and update their privilege role.
            </Text>

            {pageError ? (
              <Alert color="red" mt="lg">
                {pageError}
              </Alert>
            ) : null}
            {successMessage ? (
              <Alert color="green" mt="lg">
                {successMessage}
              </Alert>
            ) : null}

            <div className={classes.infoList}>
              <div className={classes.infoRow}>
                <div className={classes.infoLabel}>Email</div>
                <div className={classes.infoValue}>{user.email}</div>
              </div>

              <div className={classes.infoRow}>
                <div className={classes.infoLabel}>Privilege Type</div>
                <div className={classes.fieldBlock}>
                  <Menu
                    onOpen={() => setRoleMenuOpened(true)}
                    onClose={() => setRoleMenuOpened(false)}
                    radius="md"
                    width="target"
                    withinPortal
                  >
                    <Menu.Target>
                      <UnstyledButton
                        className={classes.selectButton}
                        data-expanded={roleMenuOpened || undefined}
                      >
                        <Group gap="xs">
                          <span className={classes.selectLabel}>
                            {selectedRoleLabel}
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
                          onClick={() => {
                            setSelectedRole(item.value);
                            setSuccessMessage(null);
                          }}
                          key={item.value}
                        >
                          {item.label}
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                </div>
              </div>
            </div>

            <div className={classes.actions}>
              <Button
                type="button"
                className={classes.dangerButton}
                loading={isDeleting}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete User
              </Button>
              <div className={classes.saveActions}>
                <Button
                  type="button"
                  variant="light"
                  className={classes.backButton}
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className={classes.saveButton}
                  disabled={!hasChanges}
                  loading={isSaving}
                  onClick={() => setConfirmSaveOpen(true)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={classes.emptyState}>
            That user record could not be loaded.
            {pageError ? (
              <Text c="red" mt="xs">
                {pageError}
              </Text>
            ) : null}
            <Button mt="lg" variant="light" onClick={goBack}>
              Back
            </Button>
          </div>
        )}
      </Container>

      <Modal
        opened={confirmBackOpen}
        onClose={() => setConfirmBackOpen(false)}
        centered
        title="Discard changes?"
      >
        <Text>
          Do you want to go back without saving changes?
        </Text>
        <Group mt="xl" justify="flex-end">
          <Button variant="light" onClick={() => setConfirmBackOpen(false)}>
            No
          </Button>
          <Button onClick={goBack}>Yes</Button>
        </Group>
      </Modal>

      <Modal
        opened={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        centered
        title="Save privilege change?"
      >
        <Text>
          Do you want to change {user?.email} from {currentRoleLabel} to{' '}
          {selectedRoleLabel}?
        </Text>
        <Group mt="xl" justify="flex-end">
          <Button variant="light" onClick={() => setConfirmSaveOpen(false)}>
            No
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Yes
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        centered
        title="Delete user?"
      >
        <Text>
          Do you want to delete {user?.email}? This cannot be undone.
        </Text>
        <Group mt="xl" justify="flex-end">
          <Button variant="light" onClick={() => setConfirmDeleteOpen(false)}>
            No
          </Button>
          <Button
            className={classes.dangerButton}
            onClick={handleDelete}
            loading={isDeleting}
          >
            Yes, delete user
          </Button>
        </Group>
      </Modal>
    </DashboardPageShell>
  );
}
