import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getTickets, createTicket, updateTicket } from '../api/tickets';
import { getUsers } from '../api/users';
import { useAuthStore } from '../store/authStore';
import type { TicketStatus } from '../types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_review: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-zinc-100 text-zinc-500',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open', in_review: 'In Review', resolved: 'Resolved', closed: 'Closed',
};

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Description is required'),
  related_task: z.number().nullable().optional(),
  tagged_user_ids: z.array(z.number()).optional(),
});

const adminSchema = z.object({
  status: z.enum(['open', 'in_review', 'resolved', 'closed'] as const),
  admin_note: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;
type AdminValues = z.infer<typeof adminSchema>;

function AdminUpdateRow({ ticketId, currentStatus, currentNote }: { ticketId: number; currentStatus: TicketStatus; currentNote: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm<AdminValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { status: currentStatus, admin_note: currentNote },
  });
  const { mutate, isPending } = useMutation({
    mutationFn: (data: AdminValues) => updateTicket(ticketId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Ticket updated'); setOpen(false); },
    onError: () => toast.error('Failed to update ticket'),
  });
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Collapse' : 'Update ticket'}
      </button>
      {open && (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="mt-3 flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
            <select {...register('status')} className="bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Admin note</label>
            <input {...register('admin_note')} placeholder="Optional note…" className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={isPending} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.is_admin);

  const { data: tickets, isLoading } = useQuery({ queryKey: ['tickets'], queryFn: getTickets });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: showForm });

  const { mutate: create } = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket submitted');
      setShowForm(false); setSelectedTagIds([]); reset();
    },
    onError: () => toast.error('Failed to submit ticket'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { tagged_user_ids: [] },
  });

  const onSubmit = (values: CreateValues) => create({ ...values, tagged_user_ids: selectedTagIds, related_task: values.related_task ?? null });
  const toggleTag = (id: number) => setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Tickets</h2>
        <button onClick={() => { setShowForm((v) => !v); reset(); setSelectedTagIds([]); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-zinc-300 shadow-sm p-5 max-w-xl">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Submit a Ticket</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Title *</label>
              <input {...register('title')} placeholder="Short summary" className={INPUT} />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Description *</label>
              <textarea {...register('body')} rows={4} placeholder="Describe the issue…" className={`${INPUT} resize-none`} />
              {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Related task ID <span className="text-zinc-400">(optional)</span></label>
              <input {...register('related_task', { setValueAs: (v) => (v === '' ? null : Number(v)) })} type="number" placeholder="e.g. 42" className={INPUT} />
            </div>
            {users && users.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Tag people <span className="text-zinc-400">(optional)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {users.map((u) => {
                    const selected = selectedTagIds.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleTag(u.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'}`}
                      >
                        {u.full_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {isSubmitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-zinc-200 rounded-lg animate-pulse" />)}</div>
      ) : !tickets?.length ? (
        <div className="flex items-center justify-center min-h-40 bg-white rounded-lg border border-zinc-300">
          <p className="text-zinc-400 text-sm">No tickets yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm divide-y divide-zinc-200">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{ticket.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {ticket.created_by.full_name} · {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    {ticket.related_task && <span className="ml-2 text-zinc-300">· Task #{ticket.related_task}</span>}
                  </p>
                  {ticket.body && <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{ticket.body}</p>}
                  {ticket.admin_note && (
                    <p className="mt-2 text-xs text-zinc-600 bg-zinc-50 rounded px-3 py-2 border border-zinc-300">
                      <span className="font-medium text-zinc-700">Admin: </span>{ticket.admin_note}
                    </p>
                  )}
                  {ticket.tagged_users.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ticket.tagged_users.map((u) => (
                        <span key={u.id} className="text-[11px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">@{u.full_name}</span>
                      ))}
                    </div>
                  )}
                  {isAdmin && <AdminUpdateRow ticketId={ticket.id} currentStatus={ticket.status} currentNote={ticket.admin_note} />}
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                  {STATUS_LABELS[ticket.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
