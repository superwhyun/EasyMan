'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';

interface UserContextType {
    currentUser: User | null;
    allUsers: User[];
    switchUser: (userId: string) => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const users = await res.json();
                    setAllUsers(users);

                    // Recover from localStorage or default to first user (Admin)
                    const savedUserId = localStorage.getItem('currentUserId');
                    const initialUser = users.find((u: User) => u.id === savedUserId) || users[0];
                    setCurrentUser(initialUser);
                }
            } catch (e) {
                console.error("Failed to load users", e);
            } finally {
                setIsLoading(false);
            }
        };

        initUsers();
    }, []);

    const switchUser = (userId: string) => {
        const user = allUsers.find(u => u.id === userId) || null;
        setCurrentUser(user);
        if (user) {
            localStorage.setItem('currentUserId', user.id);
        }
    };

    return (
        <UserContext.Provider value={{ currentUser, allUsers, switchUser, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
