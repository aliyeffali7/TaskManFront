import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Download, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTaskAttachments, uploadTaskAttachment, deleteTaskAttachment, downloadTaskAttachment } from '../../api/attachments';
import type { Attachment } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ att, taskId, isAdmin }: { att: Attachment; taskId: number; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteTaskAttachment(taskId, att.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast.success('Attachment deleted');
    },
    onError: () => toast.error('Failed to delete attachment'),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTaskAttachment(att.file, att.file_name);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-zinc-50 transition-colors group border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={15} className="text-zinc-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-800 truncate">{att.file_name}</p>
          <p className="text-[11px] text-zinc-400">{formatBytes(att.file_size)} · {att.uploaded_by.full_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 rounded hover:bg-zinc-200 text-zinc-500 disabled:opacity-40"
          title="Download"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        </button>
        {isAdmin && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => remove()}
                disabled={isDeleting}
                className="px-2 py-0.5 rounded text-[11px] bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 font-medium"
              >
                {isDeleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 rounded text-[11px] text-zinc-400 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface Props {
  taskId: number;
  isAdmin: boolean;
}

export default function TaskAttachments({ taskId, isAdmin }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => getTaskAttachments(taskId),
  });

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: (file: File) => uploadTaskAttachment(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast.success('File uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700">Attachments</h3>
        {isAdmin && (
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload
            </button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />
          ))}
        </div>
      ) : !attachments?.length ? (
        <p className="text-xs text-zinc-400 py-2">No attachments yet.</p>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          {attachments.map((att) => (
            <AttachmentRow key={att.id} att={att} taskId={taskId} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
