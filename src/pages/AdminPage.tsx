import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, FolderOpen, CheckSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers } from '../api/users';
import { getProjects } from '../api/projects';
import { getMyTasks } from '../api/tasks';
import { broadcastNotification } from '../api/notifications';
import { useAuthStore } from '../store/authStore';

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects });
  const { data: tasks } = useQuery({ queryKey: ['my-tasks'], queryFn: getMyTasks });

  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [userListOpen, setUserListOpen] = useState(false);

  const activeUsers = users?.filter((u) => u.is_active) ?? [];
  const otherUsers = activeUsers.filter((u) => u.id !== currentUser?.id);

  const broadcastMutation = useMutation({
    mutationFn: broadcastNotification,
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.sent_to} user${data.sent_to !== 1 ? 's' : ''}`);
      setMessage('');
      setSelectedIds(new Set());
      setSendToAll(true);
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });

  function toggleUser(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === otherUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(otherUsers.map((u) => u.id)));
    }
  }

  function handleSend() {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    if (!sendToAll && selectedIds.size === 0) {
      toast.error('Select at least one user');
      return;
    }
    broadcastMutation.mutate({
      message: message.trim(),
      send_to_all: sendToAll,
      user_ids: sendToAll ? [] : Array.from(selectedIds),
    });
  }

  const totalUsers = users?.length ?? 0;
  const totalProjects = projects?.length ?? 0;
  const openTasks = tasks?.filter((t) => t.status !== 'done').length ?? 0;

  const stats = [
    { label: 'Active Users', value: activeUsers.length, sub: `${totalUsers} total`, icon: Users, to: '/users', accent: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Projects', value: totalProjects, sub: 'all projects', icon: FolderOpen, to: '/projects', accent: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Open Tasks', value: openTasks, sub: 'assigned to you', icon: CheckSquare, to: '/', accent: 'text-green-600', bg: 'bg-green-50 border-green-100' },
  ];

  const allSelected = otherUsers.length > 0 && selectedIds.size === otherUsers.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="p-6 space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, to, accent, bg }) => (
          <Link key={label} to={to} className="bg-white rounded-xl border border-zinc-300 shadow-sm p-5 hover:border-zinc-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
                <p className={`text-3xl font-semibold mt-1 ${accent}`}>{value}</p>
                <p className="text-xs text-zinc-400 mt-1">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg border ${bg}`}>
                <Icon size={18} className={accent} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/users" className="bg-white rounded-xl border border-zinc-300 shadow-sm p-4 hover:bg-zinc-50 transition-colors flex items-center gap-3">
          <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-800">Manage Users</p>
            <p className="text-xs text-zinc-400">Create accounts, deactivate users</p>
          </div>
        </Link>
        <Link to="/projects" className="bg-white rounded-xl border border-zinc-300 shadow-sm p-4 hover:bg-zinc-50 transition-colors flex items-center gap-3">
          <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
            <FolderOpen size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-800">Manage Projects</p>
            <p className="text-xs text-zinc-400">Create projects, assign members</p>
          </div>
        </Link>
      </div>

      {/* Send Notification */}
      <div className="bg-white rounded-xl border border-zinc-300 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={15} className="text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-800">Send Notification</h3>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Write a message for your team..."
            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Recipients toggle */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-500">Recipients</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSendToAll(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                sendToAll
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              All users
            </button>
            <button
              onClick={() => { setSendToAll(false); setUserListOpen(true); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                !sendToAll
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Select users {!sendToAll && selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
          </div>

          {/* User picker — shown when "Select users" is active */}
          {!sendToAll && (
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              {/* Header row with Select All */}
              <button
                onClick={() => setUserListOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-zinc-600">
                    {allSelected ? 'Deselect all' : 'Select all'} ({otherUsers.length})
                  </span>
                </div>
                {userListOpen ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
              </button>

              {userListOpen && (
                <div className="divide-y divide-zinc-100 max-h-52 overflow-y-auto">
                  {otherUsers.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-zinc-400">No other active users.</p>
                  ) : (
                    otherUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{user.full_name}</p>
                          <p className="text-xs text-zinc-400">{user.role_label || user.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Send button */}
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={broadcastMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={13} />
            {broadcastMutation.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
