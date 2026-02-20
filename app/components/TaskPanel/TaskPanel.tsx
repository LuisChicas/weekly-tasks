'use client';

import { useState, useCallback } from 'react';
import styles from './TaskPanel.module.css';

const CELEBRATION_EMOJIS = [
  '🎉', '🌟', '🔥', '💪', '🚀', '⭐', '✨', '🎯',
  '💥', '👏', '🏆', '💎', '🌈', '🎊', '🥳', '😎',
];

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
}

function isTask(item: TaskListItem): item is Task {
  return item.type === 'task';
}

function isSeparator(item: TaskListItem): item is Separator {
  return item.type === 'separator';
}

interface TaskPanelProps {
  data: TaskPanelData;
  readOnly?: boolean;
  wide?: boolean;
  coins?: number;
  onChange?: (data: TaskPanelData) => void;
  onComplete?: () => void;
  onBuyDay?: () => void;
}

export default function TaskPanel({
  data,
  readOnly = false,
  wide = false,
  coins = 0,
  onChange,
  onComplete,
  onBuyDay,
}: TaskPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSeparatorId, setEditingSeparatorId] = useState<string | null>(null);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [celebrationEmoji, setCelebrationEmoji] = useState('');
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const { title, deadline, items } = data;

  const tasks = items.filter(isTask);

  const update = (partial: Partial<TaskPanelData>) => {
    onChange?.({ ...data, ...partial });
  };

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

  const handleTitleSave = () => setEditingTitle(false);
  const handleDeadlineSave = () => setEditingDeadline(false);
  const handleTaskSave = () => setEditingTaskId(null);
  const handleSeparatorSave = () => setEditingSeparatorId(null);

  const triggerCelebration = useCallback((taskId: string) => {
    const emoji = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    setCelebrationEmoji(emoji);
    setCelebratingTaskId(taskId);
    setTimeout(() => setCelebratingTaskId(null), 1200);
  }, []);

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

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    update({ items: newItems });
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

  const handleSubtaskSave = () => setEditingSubtaskId(null);

  // Separator handlers
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

  const handleKeyDown = (e: React.KeyboardEvent, saveHandler: () => void) => {
    if (e.key === 'Enter') saveHandler();
  };

  // Create new task after current one on Enter
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

  // Create new subtask after current one on Enter
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

  // Get index of item in items array for move button visibility
  const getItemIndex = (itemId: string) => items.findIndex(item => item.id === itemId);

  // Toggle subtask visibility
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

  return (
    <div className={`${styles.panel} ${readOnly ? styles.panelReadOnly : ''} ${wide ? styles.panelWide : ''}`}>
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
          <button
            className={styles.completarButton}
            onClick={onComplete}
          >
            descartar
          </button>
        )}
      </div>

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
          <button
            className={styles.buyDayButton}
            onClick={onBuyDay}
          >
            comprar 1 dia
          </button>
        )}
      </div>

      <ul className={styles.taskList}>
        {items.map((item, itemIndex) => {
          if (isSeparator(item)) {
            // Render separator
            return (
              <li key={item.id} className={styles.separatorWrapper}>
                <div className={styles.separatorItem}>
                  {!readOnly && editingSeparatorId === item.id ? (
                    <input
                      type="text"
                      className={styles.separatorNameInput}
                      value={item.name || ''}
                      placeholder="Section name"
                      onChange={(e) => handleSeparatorNameChange(item.id, e.target.value)}
                      onBlur={handleSeparatorSave}
                      onKeyDown={(e) => handleKeyDown(e, handleSeparatorSave)}
                      autoFocus
                    />
                  ) : item.name ? (
                    <span
                      className={styles.separatorName}
                      onClick={() => !readOnly && setEditingSeparatorId(item.id)}
                    >
                      {item.name}
                    </span>
                  ) : (
                    <span
                      className={styles.separatorPlaceholder}
                      onClick={() => !readOnly && setEditingSeparatorId(item.id)}
                    >
                      add name
                    </span>
                  )}

                  {!readOnly && (
                    <div className={styles.separatorControls}>
                      {itemIndex > 0 && (
                        <button
                          className={styles.separatorMoveButton}
                          onClick={() => handleMoveItem(item.id, 'up')}
                          title="Move up"
                        >
                          ▲
                        </button>
                      )}
                      {itemIndex < items.length - 1 && (
                        <button
                          className={styles.separatorMoveButton}
                          onClick={() => handleMoveItem(item.id, 'down')}
                          title="Move down"
                        >
                          ▼
                        </button>
                      )}
                      <button
                        className={styles.separatorDeleteButton}
                        onClick={() => handleDeleteSeparator(item.id)}
                        title="Delete separator"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          }

          // Render task
          const task = item;
          const taskIndex = getItemIndex(task.id);
          const prevItem = itemIndex > 0 ? items[itemIndex - 1] : null;
          const nextItem = itemIndex < items.length - 1 ? items[itemIndex + 1] : null;
          const showHitArea = !readOnly && itemIndex > 0 && (!prevItem || !isSeparator(prevItem));
          const hideBottomBorder = nextItem && isSeparator(nextItem);
          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
          const isCollapsed = collapsedTasks.has(task.id);

          return (
            <li key={task.id} className={`${styles.taskItemWrapper} ${hideBottomBorder ? styles.taskItemWrapperNoBottomBorder : ''}`}>
              {/* Separator hit area between tasks */}
              {showHitArea && (
                <div
                  className={styles.separatorHitArea}
                  onClick={() => handleAddSeparator(itemIndex - 1)}
                >
                  <span className={styles.separatorPlusIcon}>+</span>
                </div>
              )}

              <div className={styles.taskItem}>
                {hasSubtasks && (
                  <button
                    className={`${styles.chevron} ${isCollapsed ? '' : styles.chevronExpanded}`}
                    onClick={() => toggleSubtasksCollapsed(task.id)}
                    title={isCollapsed ? 'Show subtasks' : 'Hide subtasks'}
                  >
                    ›
                  </button>
                )}
                <div
                  className={`${styles.checkbox} ${task.completed ? styles.checkboxChecked : ''}`}
                  onClick={() => !readOnly && handleToggleTask(task.id)}
                  style={readOnly ? { cursor: 'default' } : undefined}
                >
                  {task.completed && <span className={styles.checkmark}>✓</span>}
                </div>

                {!readOnly && editingTaskId === task.id ? (
                  <input
                    type="text"
                    className={styles.taskInput}
                    value={task.text}
                    onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
                    onBlur={handleTaskSave}
                    onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`${styles.taskText} ${task.completed ? styles.taskTextCompleted : ''}`}
                    onClick={() => !readOnly && setEditingTaskId(task.id)}
                    style={readOnly ? { cursor: 'default' } : undefined}
                  >
                    {task.text || (readOnly ? '' : 'Click to edit')}
                  </span>
                )}

                {!readOnly && (
                  <>
                    <button
                      className={styles.addSubtaskButton}
                      onClick={() => handleAddSubtask(task.id)}
                      title="Add subtask"
                    >
                      +
                    </button>
                    {taskIndex > 0 && (
                      <button
                        className={styles.moveButton}
                        onClick={() => handleMoveItem(task.id, 'up')}
                        title="Move up"
                      >
                        ▲
                      </button>
                    )}
                    {taskIndex < items.length - 1 && (
                      <button
                        className={styles.moveButton}
                        onClick={() => handleMoveItem(task.id, 'down')}
                        title="Move down"
                      >
                        ▼
                      </button>
                    )}
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      ✕
                    </button>
                  </>
                )}

                {celebratingTaskId === task.id && (
                  <span key={celebrationEmoji} className={styles.emojiCelebration}>
                    {celebrationEmoji}
                  </span>
                )}
              </div>

              {hasSubtasks && !isCollapsed && (
                <ul className={styles.subtaskList}>
                  {task.subtasks!.map((subtask, subtaskIndex) => (
                    <li key={subtask.id} className={styles.subtaskItem}>
                      <div
                        className={`${styles.subtaskCheckbox} ${subtask.completed ? styles.subtaskCheckboxChecked : ''}`}
                        onClick={() => !readOnly && handleToggleSubtask(task.id, subtask.id)}
                        style={readOnly ? { cursor: 'default' } : undefined}
                      >
                        {subtask.completed && <span className={styles.subtaskCheckmark}>✓</span>}
                      </div>

                      {!readOnly && editingSubtaskId === subtask.id ? (
                        <input
                          type="text"
                          className={styles.subtaskInput}
                          value={subtask.text}
                          onChange={(e) => handleSubtaskTextChange(task.id, subtask.id, e.target.value)}
                          onBlur={handleSubtaskSave}
                          onKeyDown={(e) => handleSubtaskKeyDown(e, task.id, subtask.id)}
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`${styles.subtaskText} ${subtask.completed ? styles.subtaskTextCompleted : ''}`}
                          onClick={() => !readOnly && setEditingSubtaskId(subtask.id)}
                          style={readOnly ? { cursor: 'default' } : undefined}
                        >
                          {subtask.text || (readOnly ? '' : 'Click to edit')}
                        </span>
                      )}

                      {!readOnly && (
                        <>
                          {subtaskIndex > 0 && (
                            <button
                              className={styles.moveSubtaskButton}
                              onClick={() => handleMoveSubtask(task.id, subtask.id, 'up')}
                              title="Move up"
                            >
                              ▲
                            </button>
                          )}
                          {subtaskIndex < (task.subtasks?.length || 0) - 1 && (
                            <button
                              className={styles.moveSubtaskButton}
                              onClick={() => handleMoveSubtask(task.id, subtask.id, 'down')}
                              title="Move down"
                            >
                              ▼
                            </button>
                          )}
                          <button
                            className={styles.deleteSubtaskButton}
                            onClick={() => handleDeleteSubtask(task.id, subtask.id)}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

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