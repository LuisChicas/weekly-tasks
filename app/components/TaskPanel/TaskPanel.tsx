// Task panel — manages editing state and handlers, delegates rendering to sub-components
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import styles from './TaskPanel.module.css';
import { CELEBRATION_EMOJIS, isTask, isSeparator } from './types';
import type { TaskPanelData, Task, Subtask, Separator } from './types';
import TaskItem from './TaskItem';
import SeparatorItem from './SeparatorItem';

// Re-export types for backward compatibility
export type { TaskPanelData, Task, Subtask, Separator };
export type { TaskListItem } from './types';

interface TaskPanelProps {
  data: TaskPanelData;
  readOnly?: boolean;
  wide?: boolean;
  coins?: number;
  isOwner?: boolean;
  sharedWith?: string[];
  onShare?: (username: string) => void;
  onUnshare?: (username: string) => void;
  onChange?: (data: TaskPanelData) => void;
  onComplete?: () => void;
  onBuyDay?: () => void;
}

export default function TaskPanel({
  data,
  readOnly = false,
  wide = false,
  coins = 0,
  isOwner = true,
  sharedWith = [],
  onShare,
  onUnshare,
  onChange,
  onComplete,
  onBuyDay,
}: TaskPanelProps) {
  // --- Editing state (one item per category at a time) ---
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSeparatorId, setEditingSeparatorId] = useState<string | null>(null);

  // --- Celebration animation state ---
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [celebrationEmoji, setCelebrationEmoji] = useState('');

  // --- Menu state ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu/share panel on outside click
  useEffect(() => {
    if (!menuOpen && !shareOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, shareOpen]);

  // --- Subtask collapse state ---
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const { title, deadline, items } = data;
  const tasks = items.filter(isTask);

  // Helper to update data and notify parent
  const update = (partial: Partial<TaskPanelData>) => {
    onChange?.({ ...data, ...partial });
  };

  // --- Derived state ---

  const allCompleted = tasks.length > 0 && tasks.every(task => task.completed);

  const isOverdue = (() => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    deadlineDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  })();

  const formatDeadline = (dateString: string) => {
    if (!dateString) return 'Set deadline';
    const date = new Date(dateString);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // --- Title & deadline handlers ---

  const handleTitleSave = () => setEditingTitle(false);
  const handleDeadlineSave = () => setEditingDeadline(false);

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void) => {
    if (e.key === 'Enter') saveHandler();
  };

  // --- Celebration ---

  const triggerCelebration = useCallback((taskId: string) => {
    const emoji = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    setCelebrationEmoji(emoji);
    setCelebratingTaskId(taskId);
    setTimeout(() => setCelebratingTaskId(null), 1200);
  }, []);

  // --- Task handlers ---

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      triggerCelebration(taskId);
      // Collapse subtasks when completing a task
      if (task.subtasks && task.subtasks.length > 0) {
        setCollapsedTasks(prev => new Set(prev).add(taskId));
      }
    }
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const handleTaskTextChange = (taskId: string, newText: string) => {
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId ? { ...item, text: newText } : item
      ),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    update({ items: items.filter(item => item.id !== taskId) });
    if (editingTaskId === taskId) setEditingTaskId(null);
  };

  const handleAddTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      type: 'task',
      text: '',
      completed: false,
      subtasks: [],
    };
    update({ items: [...items, newTask] });
    setEditingTaskId(newTask.id);
  };

  // Enter key in a task input creates a new task below
  const handleTaskKeyDown = (e: React.KeyboardEvent, currentTaskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === currentTaskId);
      if (currentIndex === -1) return;

      const newTask: Task = {
        id: Date.now().toString(),
        type: 'task',
        text: '',
        completed: false,
        subtasks: [],
      };

      const newItems = [...items];
      newItems.splice(currentIndex + 1, 0, newTask);
      update({ items: newItems });
      setEditingTaskId(newTask.id);
    }
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    update({ items: newItems });
  };

  // --- Subtask handlers ---

  const handleAddSubtask = (taskId: string) => {
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      text: '',
      completed: false,
    };
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId
          ? { ...item, subtasks: [...(item.subtasks || []), newSubtask] }
          : item
      ),
    });
    // Expand subtasks if collapsed
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setEditingSubtaskId(newSubtask.id);
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId
          ? {
              ...item,
              subtasks: (item.subtasks || []).map(st =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : item
      ),
    });
  };

  const handleSubtaskTextChange = (taskId: string, subtaskId: string, newText: string) => {
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId
          ? {
              ...item,
              subtasks: (item.subtasks || []).map(st =>
                st.id === subtaskId ? { ...st, text: newText } : st
              ),
            }
          : item
      ),
    });
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    update({
      items: items.map(item =>
        isTask(item) && item.id === taskId
          ? { ...item, subtasks: (item.subtasks || []).filter(st => st.id !== subtaskId) }
          : item
      ),
    });
    if (editingSubtaskId === subtaskId) setEditingSubtaskId(null);
  };

  const handleMoveSubtask = (taskId: string, subtaskId: string, direction: 'up' | 'down') => {
    update({
      items: items.map(item => {
        if (!isTask(item) || item.id !== taskId) return item;
        const subtasks = item.subtasks || [];
        const index = subtasks.findIndex(st => st.id === subtaskId);
        if (index === -1) return item;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= subtasks.length) return item;
        const newSubtasks = [...subtasks];
        [newSubtasks[index], newSubtasks[newIndex]] = [newSubtasks[newIndex], newSubtasks[index]];
        return { ...item, subtasks: newSubtasks };
      }),
    });
  };

  // Enter key in a subtask input creates a new subtask below
  const handleSubtaskKeyDown = (e: React.KeyboardEvent, taskId: string, subtaskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const task = items.find(item => isTask(item) && item.id === taskId) as Task | undefined;
      if (!task) return;

      const subtasks = task.subtasks || [];
      const currentIndex = subtasks.findIndex(st => st.id === subtaskId);
      if (currentIndex === -1) return;

      const newSubtask: Subtask = {
        id: Date.now().toString(),
        text: '',
        completed: false,
      };

      const newSubtasks = [...subtasks];
      newSubtasks.splice(currentIndex + 1, 0, newSubtask);

      update({
        items: items.map(item =>
          isTask(item) && item.id === taskId
            ? { ...item, subtasks: newSubtasks }
            : item
        ),
      });
      setEditingSubtaskId(newSubtask.id);
    }
  };

  // --- Separator handlers ---

  const handleAddSeparator = (afterIndex: number) => {
    const newSeparator: Separator = {
      id: Date.now().toString(),
      type: 'separator',
    };
    const newItems = [...items];
    newItems.splice(afterIndex + 1, 0, newSeparator);
    update({ items: newItems });
  };

  const handleDeleteSeparator = (separatorId: string) => {
    update({ items: items.filter(item => item.id !== separatorId) });
    if (editingSeparatorId === separatorId) setEditingSeparatorId(null);
  };

  const handleSeparatorNameChange = (separatorId: string, name: string) => {
    update({
      items: items.map(item =>
        isSeparator(item) && item.id === separatorId ? { ...item, name } : item
      ),
    });
  };

  // --- Collapse ---

  const toggleSubtasksCollapsed = (taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // --- Render ---

  return (
    <div className={`${styles.panel} ${readOnly ? styles.panelReadOnly : ''} ${wide ? styles.panelWide : ''}`}>
      {/* Title row */}
      <div className={styles.titleRow}>
        {!readOnly && editingTitle ? (
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            onBlur={handleTitleSave}
            onKeyDown={(e) => handleKeyDown(e, handleTitleSave)}
            autoFocus
          />
        ) : (
          <h2
            className={styles.title}
            onClick={() => !readOnly && setEditingTitle(true)}
            style={readOnly ? { cursor: 'default' } : undefined}
          >
            {title}
          </h2>
        )}

        {!readOnly && (
          <div className={styles.menuContainer} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={() => setMenuOpen(prev => !prev)}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className={styles.menuDropdown}>
                {isOwner && (
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      setShareOpen(true);
                    }}
                  >
                    compartir
                  </button>
                )}
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onComplete?.();
                  }}
                >
                  completar
                </button>
              </div>
            )}
            {shareOpen && (
              <div className={styles.sharePanel}>
                {sharedWith.length > 0 && (
                  <ul className={styles.sharedUsersList}>
                    {sharedWith.map(u => (
                      <li key={u} className={styles.sharedUser}>
                        <span>{u}</span>
                        <button
                          className={styles.unshareButton}
                          onClick={() => { onUnshare?.(u); }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  className={styles.shareInput}
                  type="text"
                  placeholder="username"
                  value={shareUsername}
                  onChange={e => setShareUsername(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && shareUsername.trim()) {
                      onShare?.(shareUsername.trim());
                      setShareUsername('');
                      setShareOpen(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  className={styles.shareButton}
                  onClick={() => {
                    if (shareUsername.trim()) {
                      onShare?.(shareUsername.trim());
                      setShareUsername('');
                      setShareOpen(false);
                    }
                  }}
                >
                  compartir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared by label (non-owners only) */}
      {data.ownerUsername && !isOwner && (
        <p className={styles.sharedByLabel}>shared by {data.ownerUsername}</p>
      )}

      {/* Deadline row */}
      <div className={styles.deadlineRow}>
        {!readOnly && editingDeadline ? (
          <input
            type="date"
            className={styles.deadlineInput}
            value={deadline}
            onChange={(e) => update({ deadline: e.target.value })}
            onBlur={handleDeadlineSave}
            onKeyDown={(e) => handleKeyDown(e, handleDeadlineSave)}
            autoFocus
          />
        ) : (
          <p
            className={`${styles.deadline} ${isOverdue ? styles.deadlineOverdue : ''}`}
            onClick={() => !readOnly && setEditingDeadline(true)}
            style={readOnly ? { cursor: 'default' } : undefined}
          >
            {formatDeadline(deadline)}
          </p>
        )}

        {!readOnly && isOverdue && coins >= 1 && (
          <button className={styles.buyDayButton} onClick={onBuyDay}>
            comprar 1 dia
          </button>
        )}
      </div>

      {/* Task list */}
      <ul className={styles.taskList}>
        {items.map((item, itemIndex) => {
          if (isSeparator(item)) {
            return (
              <SeparatorItem
                key={item.id}
                separator={item}
                readOnly={readOnly}
                isEditing={editingSeparatorId === item.id}
                isFirst={itemIndex === 0}
                isLast={itemIndex === items.length - 1}
                onStartEditing={setEditingSeparatorId}
                onStopEditing={() => setEditingSeparatorId(null)}
                onNameChange={handleSeparatorNameChange}
                onMove={handleMoveItem}
                onDelete={handleDeleteSeparator}
              />
            );
          }

          // Task item — compute context for hit area and border visibility
          const prevItem = itemIndex > 0 ? items[itemIndex - 1] : null;
          const nextItem = itemIndex < items.length - 1 ? items[itemIndex + 1] : null;
          const showHitArea = !readOnly && itemIndex > 0 && (!prevItem || !isSeparator(prevItem));
          const hideBottomBorder = !!nextItem && isSeparator(nextItem);

          return (
            <TaskItem
              key={item.id}
              task={item}
              readOnly={readOnly}
              isEditing={editingTaskId === item.id}
              editingSubtaskId={editingSubtaskId}
              isCollapsed={collapsedTasks.has(item.id)}
              celebrationEmoji={celebratingTaskId === item.id ? celebrationEmoji : null}
              isFirst={itemIndex === 0}
              isLast={itemIndex === items.length - 1}
              showHitArea={showHitArea}
              hideBottomBorder={hideBottomBorder}
              itemIndex={itemIndex}
              onToggle={handleToggleTask}
              onTextChange={handleTaskTextChange}
              onStartEditing={setEditingTaskId}
              onStopEditing={() => setEditingTaskId(null)}
              onKeyDown={handleTaskKeyDown}
              onDelete={handleDeleteTask}
              onMove={handleMoveItem}
              onAddSubtask={handleAddSubtask}
              onToggleCollapse={toggleSubtasksCollapsed}
              onAddSeparator={handleAddSeparator}
              onToggleSubtask={handleToggleSubtask}
              onSubtaskTextChange={handleSubtaskTextChange}
              onStartEditingSubtask={setEditingSubtaskId}
              onStopEditingSubtask={() => setEditingSubtaskId(null)}
              onSubtaskKeyDown={handleSubtaskKeyDown}
              onMoveSubtask={handleMoveSubtask}
              onDeleteSubtask={handleDeleteSubtask}
            />
          );
        })}
      </ul>

      {/* Bottom controls */}
      {!readOnly && (
        <>
          <button className={styles.addButton} onClick={handleAddTask}>
            + Add task
          </button>

          {allCompleted && (
            <button className={styles.completeButton} onClick={onComplete}>
              Complete
            </button>
          )}
        </>
      )}
    </div>
  );
}
