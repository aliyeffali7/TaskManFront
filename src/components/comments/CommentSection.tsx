import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getComments, createComment } from '../../api/comments';
import { getUsers } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

interface Props {
  taskId: number;
}

function renderBody(body: string) {
  const parts = body.split(/(@\S+(?:\s\S+)?)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="bg-blue-50 text-blue-700 text-xs font-medium rounded px-1 py-0.5">{part}</span>
      : <span key={i}>{part}</span>,
  );
}

export default function CommentSection({ taskId }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [body, setBody] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: showMentions,
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => createComment(taskId, body.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setBody('');
    },
    onError: () => toast.error('Failed to post comment'),
  });

  const filtered: User[] = (users ?? []).filter((u) =>
    u.full_name.toLowerCase().includes(mentionSearch.toLowerCase()),
  );

  const selectMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const before = body.slice(0, cursor);
    const after = body.slice(cursor);
    const match = before.match(/@(\S*)$/);
    if (match) {
      const newBody = before.slice(0, match.index) + `@${user.full_name} ` + after;
      setBody(newBody);
    }
    setShowMentions(false);
    textarea.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\S*)$/);
    if (match) {
      setMentionSearch(match[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); selectMention(filtered[mentionIndex]); return; }
      if (e.key === 'Escape') { setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && body.trim()) {
      submit();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-700">Comments</h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !comments?.length ? (
        <p className="text-xs text-zinc-400 py-2">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0 mt-0.5">
                {c.author.full_name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-800">{c.author.full_name}</span>
                  <span className="text-[11px] text-zinc-400">{format(new Date(c.created_at), 'MMM d, HH:mm')}</span>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed">{renderBody(c.body)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative border border-zinc-300 rounded-lg overflow-visible bg-white">
        {showMentions && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-zinc-300 rounded-lg shadow-lg z-10 overflow-hidden">
            {filtered.slice(0, 6).map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(u); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${i === mentionIndex ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'}`}
              >
                <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-medium shrink-0">
                  {u.full_name[0].toUpperCase()}
                </span>
                <span>{u.full_name}</span>
                <span className="text-xs text-zinc-400 ml-auto">{u.role_label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 p-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-medium text-white shrink-0 mt-1">
            {currentUser?.full_name[0].toUpperCase() ?? '?'}
          </div>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Write a comment… type @ to mention someone (Ctrl+Enter to send)"
            className="flex-1 text-sm text-zinc-800 placeholder:text-zinc-400 resize-none focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => body.trim() && submit()}
            disabled={!body.trim() || isPending}
            className="self-end p-1.5 rounded-md bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
