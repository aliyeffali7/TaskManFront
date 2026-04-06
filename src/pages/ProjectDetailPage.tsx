import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, FileText, Download, Loader2, Users, X, Check, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getProject, getProjectFiles, uploadProjectFile, updateProject, downloadProjectFile, deleteProjectFile } from '../api/projects';
import { getTasks } from '../api/tasks';
import { getUsers } from '../api/users';
import { STATUS_CONFIG } from '../utils/statusConfig';
import { useAuthStore } from '../store/authStore';
import SlideOver from '../components/ui/SlideOver';
import CreateTaskForm from '../components/tasks/CreateTaskForm';
import type { ProjectFile } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-amber-600',
  high: 'text-red-500',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file, projectId, isAdmin, onDelete,
}: { file: ProjectFile; projectId: number; isAdmin: boolean; onDelete: () => void }) {
  const [downloading, setDownloading] = useState(false);
  // Two-step delete: null → 'first' → 'second'
  const [deleteStep, setDeleteStep] = useState<null | 'first' | 'second'>(null);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadProjectFile(projectId, file.id, file.file_name);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-zinc-50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={16} className="text-zinc-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800 truncate">{file.file_name}</p>
          <p className="text-xs text-zinc-400">
            {formatBytes(file.file_size)} · {file.uploaded_by.full_name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-500 disabled:opacity-40"
          title="Download"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
        {isAdmin && (
          deleteStep === null ? (
            <button
              onClick={() => setDeleteStep('first')}
              className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete file"
            >
              <Trash2 size={14} />
            </button>
          ) : deleteStep === 'first' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDeleteStep('second')}
                className="px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-600 hover:bg-red-200 font-medium"
              >
                Delete?
              </button>
              <button
                onClick={() => setDeleteStep(null)}
                className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(); setDeleteStep(null); }}
                className="px-2 py-0.5 rounded text-[11px] bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setDeleteStep(null)}
                className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.is_admin;
  const [createOpen, setCreateOpen] = useState(false);
  const [manageMembers, setManageMembers] = useState(false);
  const [pendingMemberIds, setPendingMemberIds] = useState<number[]>([]);
  const [renamingProject, setRenamingProject] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId),
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => getProjectFiles(projectId),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: manageMembers,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProjectFile(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast.success('File uploaded');
    },
    onError: () => {
      toast.error('Upload failed');
    },
  });

  const renameProjectMutation = useMutation({
    mutationFn: (name: string) => updateProject(projectId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project renamed');
      setRenamingProject(false);
    },
    onError: () => toast.error('Failed to rename project'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => deleteProjectFile(projectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast.success('File deleted');
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const updateMembersMutation = useMutation({
    mutationFn: (member_ids: number[]) => updateProject(projectId, { member_ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Members updated');
      setManageMembers(false);
    },
    onError: () => toast.error('Failed to update members'),
  });

  function openManageMembers() {
    setPendingMemberIds(project?.members.map((m) => m.id) ?? []);
    setManageMembers(true);
  }

  function togglePendingMember(uid: number) {
    setPendingMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  }

  const visibleTasks = isAdmin
    ? tasks
    : tasks?.filter((t) => t.assigned_to?.id === currentUser?.id);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  if (projectLoading || tasksLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const activeUsers = allUsers?.filter((u) => u.is_active) ?? [];

  return (
    <>
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {renamingProject ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) renameProjectMutation.mutate(renameValue.trim());
                    if (e.key === 'Escape') setRenamingProject(false);
                  }}
                  className="text-lg font-semibold text-zinc-800 border border-blue-400 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
                <button
                  onClick={() => renameValue.trim() && renameProjectMutation.mutate(renameValue.trim())}
                  disabled={!renameValue.trim() || renameProjectMutation.isPending}
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setRenamingProject(false)}
                  className="p-1.5 rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-lg font-semibold text-zinc-800">{project?.name}</h2>
                {isAdmin && (
                  <button
                    onClick={() => { setRenameValue(project?.name ?? ''); setRenamingProject(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Rename project"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
            {project?.description && (
              <p className="text-sm text-zinc-500 mt-1">{project.description}</p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} />
              New Task
            </button>
          )}
        </div>

        {/* Members section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={13} className="text-zinc-400" />
            <span className="text-xs text-zinc-400 font-medium">
              {project?.members.length ?? 0} member{project?.members.length !== 1 ? 's' : ''}
            </span>
            {isAdmin && !manageMembers && (
              <button
                onClick={openManageMembers}
                className="ml-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage
              </button>
            )}
          </div>

          {!manageMembers ? (
            <div className="flex flex-wrap gap-1.5">
              {project?.members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs border border-zinc-200"
                >
                  {m.full_name}
                </span>
              ))}
              {!project?.members.length && (
                <span className="text-xs text-zinc-400">No members yet.</span>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-zinc-300 p-4 space-y-3 max-w-lg">
              <p className="text-xs font-medium text-zinc-600">Select project members:</p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {activeUsers.length === 0 ? (
                  <p className="text-xs text-zinc-400">Loading users…</p>
                ) : (
                  activeUsers.map((u) => {
                    const selected = pendingMemberIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => togglePendingMember(u.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        {selected && <Check size={10} />}
                        {u.full_name}
                        <span className="opacity-60">{u.role_label}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => updateMembersMutation.mutate(pendingMemberIds)}
                  disabled={updateMembersMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  <Check size={11} />
                  {updateMembersMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setManageMembers(false)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-zinc-300 text-zinc-500 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <X size={11} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Left panel — Tasks */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Tasks
            </h3>
            {!visibleTasks?.length ? (
              <div className="flex items-center justify-center min-h-40 bg-white rounded-lg border border-zinc-200">
                <p className="text-zinc-400 text-sm">
                  {isAdmin
                    ? 'No tasks yet. Create the first one.'
                    : 'No tasks assigned to you in this project.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Title</th>
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Priority</th>
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Assigned to</th>
                      <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {visibleTasks.map((task) => {
                      const config = STATUS_CONFIG[task.status];
                      return (
                        <tr key={task.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/tasks/${task.id}`}
                              className="font-medium text-zinc-800 hover:text-blue-600 transition-colors"
                            >
                              {task.title}
                            </Link>
                            {task.prerequisites.length > 0 && (
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Blocked by {task.prerequisites.length} task
                                {task.prerequisites.length > 1 ? 's' : ''}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}
                            >
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium capitalize ${PRIORITY_COLORS[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {task.assigned_to?.full_name ?? (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-400 text-xs">
                            {task.due_date ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel — Files */}
          <div className="w-72 shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Files
              </h3>
              {isAdmin && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    Upload
                  </button>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm flex-1 overflow-auto">
              {filesLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : !files?.length ? (
                <div className="flex flex-col items-center justify-center h-full min-h-40 text-center px-4">
                  <FileText size={24} className="text-zinc-300 mb-2" />
                  <p className="text-zinc-400 text-xs">
                    {isAdmin ? 'No files yet. Upload the first one.' : 'No files uploaded yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      projectId={projectId}
                      isAdmin={!!isAdmin}
                      onDelete={() => deleteFileMutation.mutate(file.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="New Task">
        <CreateTaskForm
          projectId={projectId}
          members={project?.members ?? []}
          onClose={() => setCreateOpen(false)}
        />
      </SlideOver>
    </>
  );
}
