import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { getUsers, createUser, updateUser, activateUser, deactivateUser, deleteUser } from '../api/users';
import { toast } from 'sonner';

const createSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  role_label: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  is_admin: z.boolean(),
});

const editSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  role_label: z.string().min(1, 'Required'),
  is_admin: z.boolean(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const INPUT_SM = 'bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function EditUserRow({ userId, defaultValues, onDone }: { userId: number; defaultValues: EditValues; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues,
  });
  const { mutate, isPending } = useMutation({
    mutationFn: (data: EditValues) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      onDone();
    },
    onError: () => toast.error('Failed to update user'),
  });

  return (
    <tr className="bg-blue-50/40 border-b border-zinc-300">
      <td className="px-4 py-3" colSpan={5}>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-32">
            <input {...register('full_name')} placeholder="Full name" className={INPUT_SM + ' w-full'} />
            {errors.full_name && <p className="text-[11px] text-red-500 mt-0.5">{errors.full_name.message}</p>}
          </div>
          <div className="flex-1 min-w-28">
            <input {...register('role_label')} placeholder="Title" className={INPUT_SM + ' w-full'} />
            {errors.role_label && <p className="text-[11px] text-red-500 mt-0.5">{errors.role_label.message}</p>}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 shrink-0">
            <input {...register('is_admin')} type="checkbox" className="w-3.5 h-3.5 accent-blue-600" />
            Admin
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <button type="submit" disabled={isPending} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              <Check size={12} />
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onDone} className="px-3 py-1.5 border border-zinc-300 text-zinc-500 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const { mutate: activate } = useMutation({
    mutationFn: activateUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User activated'); },
    onError: () => toast.error('Failed to activate user'),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated'); },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); setConfirmDeleteId(null); },
    onError: () => toast.error('Failed to delete user'),
  });

  const { mutate: create } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowForm(false); reset();
    },
    onError: () => toast.error('Failed to create user'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { is_admin: false },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Users</h2>
        <button
          onClick={() => { setShowForm((v) => !v); reset(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-zinc-300 shadow-sm p-5 max-w-lg">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Create User</h3>
          <form onSubmit={handleSubmit((v) => create(v))} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Full name</label>
              <input {...register('full_name')} placeholder="John Smith" className={INPUT} />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Title</label>
              <input {...register('role_label')} placeholder="e.g. Backend, Designer, QA" className={INPUT} />
              {errors.role_label && <p className="mt-1 text-xs text-red-500">{errors.role_label.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
              <input {...register('email')} type="email" placeholder="john@example.com" className={INPUT} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Password</label>
              <input {...register('password')} type="password" placeholder="Min 6 characters" className={INPUT} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input {...register('is_admin')} type="checkbox" id="is_admin" className="w-4 h-4 rounded border-zinc-300 accent-blue-600" />
              <label htmlFor="is_admin" className="text-sm text-zinc-600">Admin privileges</label>
            </div>
            <div className="pt-1">
              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {isSubmitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse" />)}</div>
      ) : !users?.length ? (
        <div className="flex items-center justify-center min-h-40 bg-white rounded-lg border border-zinc-300">
          <p className="text-zinc-400 text-sm">No users yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-50">
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Title</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <>
                  <tr key={user.id} className={`border-b border-zinc-200 hover:bg-zinc-50 transition-colors ${editingId === user.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-800">{user.full_name}</span>
                      {user.is_admin && <span className="ml-2 text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Admin</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{user.role_label}</td>
                    <td className="px-4 py-3 text-zinc-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Edit */}
                        <button
                          onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>

                        {/* Activate / Deactivate */}
                        {user.is_active ? (
                          <button
                            onClick={() => deactivate(user.id)}
                            className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Deactivate"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => activate(user.id)}
                            className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Activate"
                          >
                            Activate
                          </button>
                        )}

                        {/* Delete */}
                        {confirmDeleteId === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => remove(user.id)}
                              className="px-2 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:bg-zinc-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(user.id)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === user.id && (
                    <EditUserRow
                      key={`edit-${user.id}`}
                      userId={user.id}
                      defaultValues={{ full_name: user.full_name, role_label: user.role_label, is_admin: user.is_admin }}
                      onDone={() => setEditingId(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
