'use client';

import type { ReactNode } from 'react';
import { Button, Text, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';
import classes from './DashboardPageShell.module.css';

interface DashboardPageShellProps {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    onBack?: () => void;
    shellClassName?: string;
    children: ReactNode;
}

export default function DashboardPageShell({
    title,
    subtitle,
    backHref = '/dashboard',
    backLabel = 'Return To Dashboard',
    onBack,
    shellClassName,
    children,
}: DashboardPageShellProps) {
    const router = useRouter();

    return (
        <div className={classes.page}>
            <div className={[classes.shell, shellClassName].filter(Boolean).join(' ')}>
                <div className={classes.topBar}>
                    <Button
                        className={classes.returnButton}
                        variant="default"
                        onClick={onBack ?? (() => router.push(backHref))}
                    >
                        {backLabel}
                    </Button>
                </div>

                <div className={classes.hero}>
                    <Title order={1} className={classes.title}>
                        {title}
                    </Title>
                    {subtitle ? (
                        <Text className={classes.subtitle}>
                            {subtitle}
                        </Text>
                    ) : null}
                </div>

                {children}
            </div>
        </div>
    );
}
