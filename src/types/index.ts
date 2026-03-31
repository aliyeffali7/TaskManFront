export interface User {
  id: number;
  email: string;
  full_name: string;
  role_label: string;
  is_admin: boolean;
  is_active: boolean;
  avatar: string | null;
  created_at: string;
}

export type TaskStatus = 'todo' | 'blocked' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  project: number;
  title: string;
  description: string;
  assigned_to: User | null;
  created_by: User | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  prerequisites: number[];
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  created_by: User | null;
  members: User[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  task: number;
  author: User;
  body: string;
  mentions: Mention[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: number;
  mentioned_user: User;
}

export interface Attachment {
  id: number;
  file: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: User;
  created_at: string;
}

export interface ProjectFile {
  id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: User;
  created_at: string;
}

export type TicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface Ticket {
  id: number;
  title: string;
  body: string;
  created_by: User;
  related_task: number | null;
  tagged_users: User[];
  status: TicketStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_unblocked'
  | 'mentioned_in_comment'
  | 'ticket_status_changed'
  | 'tagged_in_ticket'
  | 'admin_broadcast';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  is_read: boolean;
  object_id: number | null;
  object_type: 'task' | 'ticket' | 'comment' | null;
  created_at: string;
}
