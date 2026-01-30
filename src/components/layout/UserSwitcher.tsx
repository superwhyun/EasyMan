'use client';

import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { ChevronsUpDown } from 'lucide-react';

export function UserSwitcher() {
    const { currentUser, allUsers, switchUser, isLoading } = useUser();

    if (isLoading) return <div className="h-10 animate-pulse bg-sidebar-accent/50 rounded-lg mx-8 my-2" />;

    return (
        <div className="px-8 my-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60 mb-1.5 block">
                Test User Switcher
            </label>
            <div className="relative">
                <select
                    value={currentUser?.id || ''}
                    onChange={(e) => switchUser(e.target.value)}
                    className="w-full appearance-none bg-sidebar-accent text-sidebar-accent-foreground rounded-lg px-3 py-2 text-xs font-medium border border-border focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                >
                    {allUsers.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.name} ({user.role})
                        </option>
                    ))}
                </select>
                <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
        </div>
    );
}
