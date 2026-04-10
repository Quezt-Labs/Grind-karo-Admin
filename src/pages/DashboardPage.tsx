import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { StatsCard } from '@/components/ui/StatsCard';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { DebouncedSearch } from '@/components/shared/DebouncedSearch';
import { dashboardService } from '@/services/dashboardService';
import type { Column, UserRecord } from '@/types/dashboard';
import { cn } from '@/utils/cn';

// --- Form schema ---
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

// --- Table columns ---
const userColumns: Column<UserRecord>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (value) => (
      <span
        className={cn(
          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
          value === 'active'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
        )}
      >
        {value as string}
      </span>
    ),
  },
  { key: 'joinedAt', header: 'Joined', sortable: true },
];

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: dashboardService.getUsers,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
        u.status.toLowerCase().includes(term),
    );
  }, [users, searchTerm]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { isActive: true },
  });

  function onCreateUser(data: CreateUserFormData) {
    toast.success(`User "${data.name}" created successfully!`);
    reset();
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your application metrics and user management
        </p>
      </div>

      {/* Stats cards */}
      {statsError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load stats. Please try again later.
        </div>
      ) : statsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats?.map((stat) => (
            <StatsCard key={stat.id} {...stat} />
          ))}
        </div>
      )}

      {/* Users table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Users
          </h2>
          <DebouncedSearch
            onSearch={handleSearch}
            placeholder="Search users..."
            className="w-full sm:w-72"
          />
        </div>

        {usersError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Failed to load users. Please try again later.
          </div>
        ) : (
          <DataTable
            data={filteredUsers}
            columns={userColumns}
            isLoading={usersLoading}
          />
        )}
      </div>

      {/* Create user form */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create User
          </h2>
        </div>

        <form
          onSubmit={handleSubmit(onCreateUser)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Input
            id="create-name"
            label="Name"
            placeholder="John Doe"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            id="create-email"
            label="Email"
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Select
            id="create-role"
            label="Role"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role')}
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                {...register('isActive')}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
