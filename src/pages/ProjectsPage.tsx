import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Plus, X, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { getProjects, createProject } from '../api/projects';
import { getUsers } from '../api/users';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string(),
  member_ids: z.array(z.number()).min(1, 'Select at least one member'),
});

type FormValues = z.infer<typeof schema>;

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: showForm });

  const { mutate: create } = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('Failed to create project'),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { member_ids: [] },
  });

  const selectedIds = watch('member_ids');
  const toggleMember = (id: number) => {
    const current = selectedIds ?? [];
    setValue('member_ids', current.includes(id) ? current.filter((x) => x !== id) : [...current, id], { shouldValidate: true });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Projects</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-zinc-300 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Create Project</h3>
          <form onSubmit={handleSubmit((v) => create(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Project name</label>
                <input {...register('name')} placeholder="e.g. TaskMan v2" className={INPUT} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
                <input {...register('description')} placeholder="Optional" className={INPUT} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-2">
                Members {selectedIds.length > 0 && <span className="text-zinc-400">({selectedIds.length})</span>}
              </label>
              {!users ? (
                <p className="text-xs text-zinc-400">Loading users…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const selected = selectedIds.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'}`}
                      >
                        {u.full_name} <span className="opacity-60">{u.role_label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.member_ids && <p className="mt-1 text-xs text-red-500">{errors.member_ids.message}</p>}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {isSubmitting ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="flex items-center justify-center min-h-40 bg-white rounded-xl border border-zinc-300">
          <p className="text-zinc-400 text-sm">No projects yet. Create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-white rounded-xl border border-zinc-300 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{project.name[0].toUpperCase()}</span>
                </div>
                <ArrowRight size={14} className="text-zinc-300 group-hover:text-blue-500 transition-colors mt-1" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 mb-1 leading-snug">{project.name}</p>
              {project.description ? (
                <p className="text-xs text-zinc-500 line-clamp-2 flex-1">{project.description}</p>
              ) : (
                <p className="text-xs text-zinc-300 flex-1">No description</p>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-200">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Users size={12} />
                  {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                </div>
                <span className="text-[11px] text-zinc-300">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
