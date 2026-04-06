import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Folder, FolderOpen, FileText, Upload, FolderPlus,
  Download, Trash2, ChevronRight, Loader2, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDriveRoot, getDriveFolder, createDriveFolder,
  deleteDriveFolder, uploadDriveFile, deleteDriveFile, downloadDriveFile,
} from '../api/drive';
import type { DriveFolder, DriveFile } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.includes('zip')) return '📦';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  return '📎';
}

// ─── breadcrumb ─────────────────────────────────────────────────────────────

interface Crumb { id: number | null; name: string }

function Breadcrumb({ path, onNavigate }: { path: Crumb[]; onNavigate: (index: number) => void }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {path.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} className="text-zinc-400" />}
          {i < path.length - 1 ? (
            <button
              onClick={() => onNavigate(i)}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {crumb.name}
            </button>
          ) : (
            <span className="font-semibold text-zinc-800">{crumb.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── folder card ────────────────────────────────────────────────────────────

function FolderCard({
  folder, onOpen, onDelete,
}: { folder: DriveFolder; onOpen: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const sub = [
    folder.children_count > 0 ? `${folder.children_count} folder${folder.children_count !== 1 ? 's' : ''}` : null,
    folder.files_count > 0 ? `${folder.files_count} file${folder.files_count !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ') || 'Empty';

  return (
    <div className="group relative bg-white border border-zinc-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
          <Folder size={18} className="text-amber-500" />
        </div>
        {/* Delete button – stop propagation so click doesn't open folder */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {confirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete()}
                className="px-2 py-0.5 rounded text-[11px] bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete folder"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold text-zinc-800 truncate">{folder.name}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── file row ───────────────────────────────────────────────────────────────

function FileRow({
  file, onDelete,
}: { file: DriveFile; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try { await downloadDriveFile(file.id, file.file_name); }
    catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-zinc-50 transition-colors group border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base shrink-0">{mimeIcon(file.mime_type)}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800 truncate">{file.file_name}</p>
          <p className="text-xs text-zinc-400">
            {formatBytes(file.file_size)} · {file.uploaded_by.full_name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
          title="Download"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        </button>
        {confirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete()}
              className="px-2 py-0.5 rounded text-[11px] bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── new folder input ────────────────────────────────────────────────────────

function NewFolderInput({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="bg-white border border-blue-300 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg w-fit">
        <FolderOpen size={18} className="text-amber-500" />
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Folder name"
        className="w-full text-sm border border-zinc-300 rounded-lg px-2.5 py-1.5 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1.5">
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Check size={11} /> Create
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1 border border-zinc-300 text-zinc-500 text-xs font-medium rounded-lg hover:bg-zinc-50"
        >
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function DrivePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [path, setPath] = useState<Crumb[]>([{ id: null, name: 'Drive' }]);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const currentFolderId = path[path.length - 1].id;
  const queryKey = currentFolderId === null ? ['drive', 'root'] : ['drive', 'folder', currentFolderId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => currentFolderId === null ? getDriveRoot() : getDriveFolder(currentFolderId),
  });

  const folders: DriveFolder[] = (data as any)?.folders ?? [];
  const files: DriveFile[] = (data as any)?.files ?? [];

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createDriveFolder({ name, parent: currentFolderId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setCreatingFolder(false); toast.success('Folder created'); },
    onError: () => toast.error('Failed to create folder'),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteDriveFolder,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast.success('Folder deleted'); },
    onError: () => toast.error('Failed to delete folder'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDriveFile(file, currentFolderId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast.success('File uploaded'); },
    onError: () => toast.error('Upload failed'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: deleteDriveFile,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); toast.success('File deleted'); },
    onError: () => toast.error('Failed to delete file'),
  });

  function navigateInto(folder: DriveFolder) {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCreatingFolder(false);
  }

  function navigateTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
    setCreatingFolder(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div className="p-6 flex flex-col h-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Breadcrumb path={path} onNavigate={navigateTo} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreatingFolder(true)}
            disabled={creatingFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <FolderPlus size={13} />
            New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploadMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Upload File
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 flex-1 overflow-y-auto">
          {/* Folders */}
          {(folders.length > 0 || creatingFolder) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {creatingFolder && (
                  <NewFolderInput
                    onConfirm={(name) => createFolderMutation.mutate(name)}
                    onCancel={() => setCreatingFolder(false)}
                  />
                )}
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onOpen={() => navigateInto(folder)}
                    onDelete={() => deleteFolderMutation.mutate(folder.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* New folder input when no folders exist yet */}
          {creatingFolder && folders.length === 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                <NewFolderInput
                  onConfirm={(name) => createFolderMutation.mutate(name)}
                  onCancel={() => setCreatingFolder(false)}
                />
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Files</p>
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                {files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    onDelete={() => deleteFileMutation.mutate(file.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!creatingFolder && folders.length === 0 && files.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-60 bg-white rounded-xl border border-dashed border-zinc-300">
              <div className="p-4 bg-zinc-100 rounded-full mb-4">
                <FolderOpen size={28} className="text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">This folder is empty</p>
              <p className="text-xs text-zinc-400 mt-1">Create a folder or upload a file to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
