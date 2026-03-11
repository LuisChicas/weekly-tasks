// Task row — checkbox, inline text editing, action buttons, and collapsible subtask list
import type { Task } from './types';
import SubtaskItem from './SubtaskItem';
import styles from './TaskPanel.module.css';

interface TaskItemProps {
  task: Task;
  readOnly: boolean;
  // Editing state (managed by parent to ensure one-at-a-time editing)
  isEditing: boolean;
  editingSubtaskId: string | null;
  // Subtask collapse state
  isCollapsed: boolean;
  // Celebration animation
  celebrationEmoji: string | null;
  // Position within the items array (for move button visibility)
  isFirst: boolean;
  isLast: boolean;
  // Whether to show the separator hit area above this task
  showHitArea: boolean;
  // Whether to hide the bottom border (when followed by a separator)
  hideBottomBorder: boolean;

  // Task callbacks
  onToggle: (taskId: string) => void;
  onTextChange: (taskId: string, text: string) => void;
  onStartEditing: (taskId: string) => void;
  onStopEditing: () => void;
  onKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMove: (taskId: string, direction: 'up' | 'down') => void;
  onAddSubtask: (taskId: string) => void;
  onToggleCollapse: (taskId: string) => void;
  onAddSeparator: (afterIndex: number) => void;
  itemIndex: number;

  // Subtask callbacks
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onSubtaskTextChange: (taskId: string, subtaskId: string, text: string) => void;
  onStartEditingSubtask: (subtaskId: string) => void;
  onStopEditingSubtask: () => void;
  onSubtaskKeyDown: (e: React.KeyboardEvent, taskId: string, subtaskId: string) => void;
  onMoveSubtask: (taskId: string, subtaskId: string, direction: 'up' | 'down') => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

export default function TaskItem({
  task,
  readOnly,
  isEditing,
  editingSubtaskId,
  isCollapsed,
  celebrationEmoji,
  isFirst,
  isLast,
  showHitArea,
  hideBottomBorder,
  onToggle,
  onTextChange,
  onStartEditing,
  onStopEditing,
  onKeyDown,
  onDelete,
  onMove,
  onAddSubtask,
  onToggleCollapse,
  onAddSeparator,
  itemIndex,
  onToggleSubtask,
  onSubtaskTextChange,
  onStartEditingSubtask,
  onStopEditingSubtask,
  onSubtaskKeyDown,
  onMoveSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <li className={`${styles.taskItemWrapper} ${hideBottomBorder ? styles.taskItemWrapperNoBottomBorder : ''}`}>
      {/* Hit area between tasks — clicking inserts a separator */}
      {showHitArea && (
        <div
          className={styles.separatorHitArea}
          onClick={() => onAddSeparator(itemIndex - 1)}
        >
          <span className={styles.separatorPlusIcon}>+</span>
        </div>
      )}

      <div className={styles.taskItem}>
        {/* Chevron to collapse/expand subtasks */}
        {hasSubtasks && (
          <button
            className={`${styles.chevron} ${isCollapsed ? '' : styles.chevronExpanded}`}
            onClick={() => onToggleCollapse(task.id)}
            title={isCollapsed ? 'Show subtasks' : 'Hide subtasks'}
          >
            ›
          </button>
        )}

        {/* Square checkbox */}
        <div
          className={`${styles.checkbox} ${task.completed ? styles.checkboxChecked : ''}`}
          onClick={() => !readOnly && onToggle(task.id)}
          style={readOnly ? { cursor: 'default' } : undefined}
        >
          {task.completed && <span className={styles.checkmark}>✓</span>}
        </div>

        {/* Text: inline edit or view */}
        {!readOnly && isEditing ? (
          <input
            type="text"
            className={styles.taskInput}
            value={task.text}
            onChange={(e) => onTextChange(task.id, e.target.value)}
            onBlur={onStopEditing}
            onKeyDown={(e) => onKeyDown(e, task.id)}
            autoFocus
          />
        ) : (
          <span
            className={`${styles.taskText} ${task.completed ? styles.taskTextCompleted : ''}`}
            onClick={() => !readOnly && onStartEditing(task.id)}
            style={readOnly ? { cursor: 'default' } : undefined}
          >
            {task.text || (readOnly ? '' : 'Click to edit')}
          </span>
        )}

        {/* Action buttons: add subtask, move up/down, delete (visible on hover) */}
        {!readOnly && (
          <>
            <button
              className={styles.addSubtaskButton}
              onClick={() => onAddSubtask(task.id)}
              title="Add subtask"
            >
              +
            </button>
            {!isFirst && (
              <button
                className={styles.moveButton}
                onClick={() => onMove(task.id, 'up')}
                title="Move up"
              >
                ▲
              </button>
            )}
            {!isLast && (
              <button
                className={styles.moveButton}
                onClick={() => onMove(task.id, 'down')}
                title="Move down"
              >
                ▼
              </button>
            )}
            <button
              className={styles.deleteButton}
              onClick={() => onDelete(task.id)}
            >
              ✕
            </button>
          </>
        )}

        {/* Celebration emoji animation on task completion */}
        {celebrationEmoji && (
          <span key={celebrationEmoji} className={styles.emojiCelebration}>
            {celebrationEmoji}
          </span>
        )}
      </div>

      {/* Subtask list (collapsible) */}
      {hasSubtasks && !isCollapsed && (
        <ul className={styles.subtaskList}>
          {task.subtasks!.map((subtask, subtaskIndex) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              taskId={task.id}
              readOnly={readOnly}
              isEditing={editingSubtaskId === subtask.id}
              isFirst={subtaskIndex === 0}
              isLast={subtaskIndex === task.subtasks!.length - 1}
              onToggle={onToggleSubtask}
              onTextChange={onSubtaskTextChange}
              onStartEditing={onStartEditingSubtask}
              onStopEditing={onStopEditingSubtask}
              onKeyDown={onSubtaskKeyDown}
              onMove={onMoveSubtask}
              onDelete={onDeleteSubtask}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
