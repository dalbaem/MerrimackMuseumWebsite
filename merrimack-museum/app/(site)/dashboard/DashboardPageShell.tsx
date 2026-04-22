'use client';

import type { ReactNode } from 'react';
import { Button, Text, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';
import classes from './DashboardPageShell.module.css';

interface DashboardPageShellProps {
    title: string;
    subtitle?: string;
    backHref?: string;
    shellClassName?: string;
    children: ReactNode;
}

export default function DashboardPageShell({
    title,
    subtitle,
    backHref = '/dashboard',
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
                        onClick={() => router.push(backHref)}
                    >
                        Return To Dashboard
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
