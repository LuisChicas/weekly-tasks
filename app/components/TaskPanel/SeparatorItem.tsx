// Section divider — optional editable name, move/delete controls
import type { Separator } from './types';
import styles from './TaskPanel.module.css';

interface SeparatorItemProps {
  separator: Separator;
  readOnly: boolean;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onStartEditing: (separatorId: string) => void;
  onStopEditing: () => void;
  onNameChange: (separatorId: string, name: string) => void;
  onMove: (separatorId: string, direction: 'up' | 'down') => void;
  onDelete: (separatorId: string) => void;
}

export default function SeparatorItem({
  separator,
  readOnly,
  isEditing,
  isFirst,
  isLast,
  onStartEditing,
  onStopEditing,
  onNameChange,
  onMove,
  onDelete,
}: SeparatorItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onStopEditing();
  };

  return (
    <li className={styles.separatorWrapper}>
      <div className={styles.separatorItem}>
        {/* Name: inline edit, static text, or hover placeholder */}
        {!readOnly && isEditing ? (
          <input
            type="text"
            className={styles.separatorNameInput}
            value={separator.name || ''}
            placeholder="Section name"
            onChange={(e) => onNameChange(separator.id, e.target.value)}
            onBlur={onStopEditing}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : separator.name ? (
          <span
            className={styles.separatorName}
            onClick={() => !readOnly && onStartEditing(separator.id)}
          >
            {separator.name}
          </span>
        ) : (
          <span
            className={styles.separatorPlaceholder}
            onClick={() => !readOnly && onStartEditing(separator.id)}
          >
            add name
          </span>
        )}

        {/* Controls: move up/down, delete (visible on hover) */}
        {!readOnly && (
          <div className={styles.separatorControls}>
            {!isFirst && (
              <button
                className={styles.separatorMoveButton}
                onClick={() => onMove(separator.id, 'up')}
                title="Move up"
              >
                ▲
              </button>
            )}
            {!isLast && (
              <button
                className={styles.separatorMoveButton}
                onClick={() => onMove(separator.id, 'down')}
                title="Move down"
              >
                ▼
              </button>
            )}
            <button
              className={styles.separatorDeleteButton}
              onClick={() => onDelete(separator.id)}
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
