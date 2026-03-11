// Subtask row — circular checkbox, inline text editing, move/delete buttons
import type { Subtask } from './types';
import styles from './TaskPanel.module.css';

interface SubtaskItemProps {
  subtask: Subtask;
  taskId: string;
  readOnly: boolean;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (taskId: string, subtaskId: string) => void;
  onTextChange: (taskId: string, subtaskId: string, text: string) => void;
  onStartEditing: (subtaskId: string) => void;
  onStopEditing: () => void;
  onKeyDown: (e: React.KeyboardEvent, taskId: string, subtaskId: string) => void;
  onMove: (taskId: string, subtaskId: string, direction: 'up' | 'down') => void;
  onDelete: (taskId: string, subtaskId: string) => void;
}

export default function SubtaskItem({
  subtask,
  taskId,
  readOnly,
  isEditing,
  isFirst,
  isLast,
  onToggle,
  onTextChange,
  onStartEditing,
  onStopEditing,
  onKeyDown,
  onMove,
  onDelete,
}: SubtaskItemProps) {
  return (
    <li className={styles.subtaskItem}>
      {/* Circular checkbox */}
      <div
        className={`${styles.subtaskCheckbox} ${subtask.completed ? styles.subtaskCheckboxChecked : ''}`}
        onClick={() => !readOnly && onToggle(taskId, subtask.id)}
        style={readOnly ? { cursor: 'default' } : undefined}
      >
        {subtask.completed && <span className={styles.subtaskCheckmark}>✓</span>}
      </div>

      {/* Text: inline edit or view */}
      {!readOnly && isEditing ? (
        <input
          type="text"
          className={styles.subtaskInput}
          value={subtask.text}
          onChange={(e) => onTextChange(taskId, subtask.id, e.target.value)}
          onBlur={onStopEditing}
          onKeyDown={(e) => onKeyDown(e, taskId, subtask.id)}
          autoFocus
        />
      ) : (
        <span
          className={`${styles.subtaskText} ${subtask.completed ? styles.subtaskTextCompleted : ''}`}
          onClick={() => !readOnly && onStartEditing(subtask.id)}
          style={readOnly ? { cursor: 'default' } : undefined}
        >
          {subtask.text || (readOnly ? '' : 'Click to edit')}
        </span>
      )}

      {/* Action buttons: move up/down, delete (visible on hover) */}
      {!readOnly && (
        <>
          {!isFirst && (
            <button
              className={styles.moveSubtaskButton}
              onClick={() => onMove(taskId, subtask.id, 'up')}
              title="Move up"
            >
              ▲
            </button>
          )}
          {!isLast && (
            <button
              className={styles.moveSubtaskButton}
              onClick={() => onMove(taskId, subtask.id, 'down')}
              title="Move down"
            >
              ▼
            </button>
          )}
          <button
            className={styles.deleteSubtaskButton}
            onClick={() => onDelete(taskId, subtask.id)}
          >
            ✕
          </button>
        </>
      )}
    </li>
  );
}
