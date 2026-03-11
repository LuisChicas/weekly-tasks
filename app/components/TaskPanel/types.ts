// Celebration emojis shown when a task is checked off
export const CELEBRATION_EMOJIS = [
  '🎉', '🌟', '🔥', '💪', '🚀', '⭐', '✨', '🎯',
  '💥', '👏', '🏆', '💎', '🌈', '🎊', '🥳', '😎',
];

// --- Data types ---

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  type: 'task';
  text: string;
  completed: boolean;
  subtasks?: Subtask[];
}

export interface Separator {
  id: string;
  type: 'separator';
  name?: string;
}

export type TaskListItem = Task | Separator;

export interface TaskPanelData {
  id: string;
  title: string;
  deadline: string;
  items: TaskListItem[];
  ownerId?: string;
  ownerUsername?: string;
  sharedWith?: string[];
  isShared?: boolean;
  isOwner?: boolean;
}

// --- Type guards ---

export function isTask(item: TaskListItem): item is Task {
  return item.type === 'task';
}

export function isSeparator(item: TaskListItem): item is Separator {
  return item.type === 'separator';
}
