'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'User Management', href: '/users' },
  { icon: CheckSquare, label: 'All Tasks', href: '/tasks' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-72 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Sidebar Header */}
      <div className="flex h-[88px] items-center gap-2 px-8 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
          <svg
            width="20"
            height="20"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 4L4 16L16 28L28 16L16 4Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className="text-lg font-bold text-primary">TaskFlow</span>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground">
          Management
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 rounded-full px-4 py-3 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-sidebar-border p-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-sidebar-accent-foreground">Admin User</span>
            <span className="text-xs text-sidebar-foreground">admin@company.com</span>
          </div>
          <ChevronDown className="h-5 w-5 text-sidebar-foreground" />
        </div>
      </div>
    </div>
  );
}
