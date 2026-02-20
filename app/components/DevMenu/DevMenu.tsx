'use client';

import { useState } from 'react';
import styles from './DevMenu.module.css';
import type { TaskPanelData, Task, Separator, TaskListItem, Subtask } from '../TaskPanel/TaskPanel';

const BACKUP_KEY = 'dataBackup';

function loadBackup(): BackupData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(BACKUP_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return null;
}

interface DevMenuProps {
  coins: number;
  onSetCoins: (coins: number) => void;
  activeLists: TaskPanelData[];
  completedLists: TaskPanelData[];
  onRestore?: (data: RestoreData) => RestoreReport;
}

interface BackupData {
  timestamp: string;
  yaml: string;
}

export interface RestoreData {
  coins: number;
  activeLists: TaskPanelData[];
  completedLists: TaskPanelData[];
}

export interface ConflictItem {
  type: 'list' | 'task' | 'subtask';
  location: string;
  existing: { id: string; title?: string; text?: string };
  incoming: { id: string; title?: string; text?: string };
}

export interface RestoreReport {
  activeListsAdded: number;
  completedListsAdded: number;
  conflicts: ConflictItem[];
}

function formatBackupDate(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}-${month} ${hours}:${minutes}`;
}

function isTask(item: TaskListItem): item is Task {
  return item.type === 'task';
}

function isSeparator(item: TaskListItem): item is Separator {
  return item.type === 'separator';
}

function taskToYaml(task: Task, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}- type: task`);
  lines.push(`${indent}  id: "${task.id}"`);
  lines.push(`${indent}  text: "${task.text.replace(/"/g, '\\"')}"`);
  lines.push(`${indent}  completed: ${task.completed}`);
  const subtasks = task.subtasks || [];
  if (subtasks.length > 0) {
    lines.push(`${indent}  subtasks:`);
    for (const subtask of subtasks) {
      lines.push(`${indent}    - id: "${subtask.id}"`);
      lines.push(`${indent}      text: "${subtask.text.replace(/"/g, '\\"')}"`);
      lines.push(`${indent}      completed: ${subtask.completed}`);
    }
  }
  return lines;
}

function separatorToYaml(sep: Separator, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}- type: separator`);
  lines.push(`${indent}  id: "${sep.id}"`);
  if (sep.name) {
    lines.push(`${indent}  name: "${sep.name.replace(/"/g, '\\"')}"`);
  }
  return lines;
}

function listToYaml(list: TaskPanelData): string[] {
  const lines: string[] = [];
  lines.push(`  - id: "${list.id}"`);
  lines.push(`    title: "${list.title}"`);
  lines.push(`    deadline: "${list.deadline}"`);
  lines.push('    items:');
  if (list.items.length === 0) {
    lines.push('      []');
  } else {
    for (const item of list.items) {
      if (isTask(item)) {
        lines.push(...taskToYaml(item, '      '));
      } else if (isSeparator(item)) {
        lines.push(...separatorToYaml(item, '      '));
      }
    }
  }
  return lines;
}

function toYaml(coins: number, activeLists: TaskPanelData[], completedLists: TaskPanelData[]): string {
  const lines: string[] = [];

  lines.push(`coins: ${coins}`);
  lines.push('');

  lines.push('activeLists:');
  if (activeLists.length === 0) {
    lines.push('  []');
  } else {
    for (const list of activeLists) {
      lines.push(...listToYaml(list));
    }
  }

  lines.push('');
  lines.push('completedLists:');
  if (completedLists.length === 0) {
    lines.push('  []');
  } else {
    for (const list of completedLists) {
      lines.push(...listToYaml(list));
    }
  }

  return lines.join('\n');
}

// Save the current pending item (task or separator) into the current list
function flushCurrentItem(
  currentItem: { type: 'task'; data: Partial<Task> } | { type: 'separator'; data: Partial<Separator> } | null,
  currentSubtask: Partial<Subtask> | null,
  currentList: Partial<TaskPanelData> | null,
): void {
  if (!currentItem || !currentList) return;
  if (!currentList.items) currentList.items = [];

  if (currentItem.type === 'task') {
    // Flush pending subtask
    if (currentSubtask) {
      if (!currentItem.data.subtasks) currentItem.data.subtasks = [];
      currentItem.data.subtasks.push(currentSubtask as Subtask);
    }
    currentList.items.push(currentItem.data as Task);
  } else {
    currentList.items.push(currentItem.data as Separator);
  }
}

// Simple YAML parser for our specific backup format
// Supports both new format (items: with type: task/separator) and old format (tasks: without type)
function parseYaml(yaml: string): RestoreData | null {
  try {
    const lines = yaml.split('\n');
    let coins = 0;
    const activeLists: TaskPanelData[] = [];
    const completedLists: TaskPanelData[] = [];

    let currentSection: 'none' | 'activeLists' | 'completedLists' = 'none';
    let currentList: Partial<TaskPanelData> | null = null;
    let currentItem: { type: 'task'; data: Partial<Task> } | { type: 'separator'; data: Partial<Separator> } | null = null;
    let currentSubtask: Partial<Subtask> | null = null;
    let inSubtasks = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '[]') continue;

      // Parse coins
      if (trimmed.startsWith('coins:')) {
        coins = parseInt(trimmed.split(':')[1].trim(), 10) || 0;
        continue;
      }

      // Section headers
      if (trimmed === 'activeLists:') {
        currentSection = 'activeLists';
        continue;
      }
      if (trimmed === 'completedLists:') {
        // Save current item and list before switching sections
        flushCurrentItem(currentItem, currentSubtask, currentList);
        if (currentList && currentSection === 'activeLists') {
          activeLists.push(currentList as TaskPanelData);
        }
        currentList = null;
        currentItem = null;
        currentSubtask = null;
        inSubtasks = false;
        currentSection = 'completedLists';
        continue;
      }

      if (currentSection === 'none') continue;

      // Determine indent level
      const indent = line.search(/\S/);

      // List level (indent ~2)
      if (indent <= 4 && trimmed.startsWith('- id:')) {
        // Save previous item and list
        flushCurrentItem(currentItem, currentSubtask, currentList);
        if (currentList) {
          if (currentSection === 'activeLists') {
            activeLists.push(currentList as TaskPanelData);
          } else {
            completedLists.push(currentList as TaskPanelData);
          }
        }

        // Start new list
        currentList = { items: [] };
        currentItem = null;
        currentSubtask = null;
        inSubtasks = false;
        const idMatch = trimmed.match(/id:\s*"([^"]*)"/);
        if (idMatch) currentList.id = idMatch[1];
        continue;
      }

      // List properties
      if (indent <= 6 && currentList && !trimmed.startsWith('-')) {
        if (trimmed.startsWith('title:')) {
          const match = trimmed.match(/title:\s*"([^"]*)"/);
          if (match) currentList.title = match[1];
        } else if (trimmed.startsWith('deadline:')) {
          const match = trimmed.match(/deadline:\s*"([^"]*)"/);
          if (match) currentList.deadline = match[1];
        } else if (trimmed === 'tasks:' || trimmed === 'items:') {
          inSubtasks = false;
        }
        continue;
      }

      // Item level (indent ~6): new format starts with "- type:", old format starts with "- id:"
      if (indent >= 6 && indent <= 8 && trimmed.startsWith('- type:')) {
        // New format: flush previous item
        flushCurrentItem(currentItem, currentSubtask, currentList);
        currentSubtask = null;
        inSubtasks = false;

        const typeVal = trimmed.match(/type:\s*(\S+)/)?.[1];
        if (typeVal === 'separator') {
          currentItem = { type: 'separator', data: { type: 'separator' } };
        } else {
          currentItem = { type: 'task', data: { type: 'task', subtasks: [] } };
        }
        continue;
      }

      // Old format: task starts with "- id:" at item level
      if (indent >= 6 && indent <= 8 && trimmed.startsWith('- id:')) {
        // Flush previous
        flushCurrentItem(currentItem, currentSubtask, currentList);
        currentSubtask = null;
        inSubtasks = false;

        currentItem = { type: 'task', data: { type: 'task', subtasks: [] } };
        const idMatch = trimmed.match(/id:\s*"([^"]*)"/);
        if (idMatch) currentItem.data.id = idMatch[1];
        continue;
      }

      // Item properties (indent ~8)
      if (indent >= 8 && indent <= 10 && currentItem && !trimmed.startsWith('-') && !inSubtasks) {
        if (trimmed.startsWith('id:')) {
          const match = trimmed.match(/id:\s*"([^"]*)"/);
          if (match) currentItem.data.id = match[1];
        } else if (trimmed.startsWith('name:') && currentItem.type === 'separator') {
          const match = trimmed.match(/name:\s*"(.*)"/);
          if (match) (currentItem.data as Partial<Separator>).name = match[1].replace(/\\"/g, '"');
        } else if (trimmed.startsWith('text:') && currentItem.type === 'task') {
          const match = trimmed.match(/text:\s*"(.*)"/);
          if (match) (currentItem.data as Partial<Task>).text = match[1].replace(/\\"/g, '"');
        } else if (trimmed.startsWith('completed:') && currentItem.type === 'task') {
          (currentItem.data as Partial<Task>).completed = trimmed.includes('true');
        } else if (trimmed === 'subtasks:' && currentItem.type === 'task') {
          inSubtasks = true;
        }
        continue;
      }

      // Subtask level (indent >= 10)
      if (inSubtasks && indent >= 10 && trimmed.startsWith('- id:')) {
        // Save previous subtask
        if (currentSubtask && currentItem?.type === 'task') {
          if (!(currentItem.data as Partial<Task>).subtasks) (currentItem.data as Partial<Task>).subtasks = [];
          (currentItem.data as Partial<Task>).subtasks!.push(currentSubtask as Subtask);
        }

        currentSubtask = {};
        const idMatch = trimmed.match(/id:\s*"([^"]*)"/);
        if (idMatch) currentSubtask.id = idMatch[1];
        continue;
      }

      // Subtask properties (indent >= 12)
      if (inSubtasks && currentSubtask && !trimmed.startsWith('-')) {
        if (trimmed.startsWith('text:')) {
          const match = trimmed.match(/text:\s*"(.*)"/);
          if (match) currentSubtask.text = match[1].replace(/\\"/g, '"');
        } else if (trimmed.startsWith('completed:')) {
          currentSubtask.completed = trimmed.includes('true');
        }
        continue;
      }
    }

    // Save final items
    flushCurrentItem(currentItem, currentSubtask, currentList);
    if (currentList) {
      if (currentSection === 'activeLists') {
        activeLists.push(currentList as TaskPanelData);
      } else {
        completedLists.push(currentList as TaskPanelData);
      }
    }

    return { coins, activeLists, completedLists };
  } catch (e) {
    console.error('Failed to parse YAML:', e);
    return null;
  }
}

export default function DevMenu({ coins, onSetCoins, activeLists, completedLists, onRestore }: DevMenuProps) {
  const [open, setOpen] = useState(false);
  const [coinInput, setCoinInput] = useState(0);
  const [backup, setBackup] = useState<BackupData | null>(loadBackup);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoreReport, setRestoreReport] = useState<RestoreReport | null>(null);

  const handleIncrement = () => {
    setCoinInput(prev => prev + 1);
  };

  const handleDecrement = () => {
    setCoinInput(prev => Math.max(0, prev - 1));
  };

  const handleAddCoins = () => {
    if (coinInput > 0) {
      onSetCoins(coins + coinInput);
      setCoinInput(0);
    }
  };

  const handleSubtractCoins = () => {
    if (coinInput > 0) {
      onSetCoins(Math.max(0, coins - coinInput));
      setCoinInput(0);
    }
  };

  const handleBackup = () => {
    const yaml = toYaml(coins, activeLists, completedLists);
    const newBackup: BackupData = {
      timestamp: new Date().toISOString(),
      yaml,
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(newBackup));
    setBackup(newBackup);
  };

  const handleShowBackup = () => {
    setShowBackupPanel(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (backup) {
      await navigator.clipboard.writeText(backup.yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (backup) {
      const blob = new Blob([backup.yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-backup-${backup.timestamp.slice(0, 10)}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleRestore = () => {
    if (!backup || !onRestore) return;

    const parsed = parseYaml(backup.yaml);
    if (!parsed) {
      alert('Failed to parse backup data');
      return;
    }

    const report = onRestore(parsed);
    setRestoreReport(report);
  };

  const handleRestoreFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;
        const parsed = parseYaml(content);
        if (!parsed) {
          alert('Failed to parse file');
          return;
        }
        if (onRestore) {
          const report = onRestore(parsed);
          setRestoreReport(report);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className={`${styles.devMenu} ${open ? styles.devMenuOpen : ''}`}>
      <button className={styles.tab} onClick={() => setOpen(!open)}>
        {open ? 'Hide dev menu' : 'Show dev menu'}
        <span className={styles.tabArrow}>{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Dev Menu</h3>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Add/Remove coins</div>
            <div className={styles.row}>
              <div className={styles.rowControls}>
                <button className={styles.controlButton} onClick={handleDecrement}>
                  −
                </button>
                <input
                  type="number"
                  className={styles.coinInput}
                  value={coinInput}
                  onChange={(e) => setCoinInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  min="0"
                />
                <button className={styles.controlButton} onClick={handleIncrement}>
                  +
                </button>
              </div>
              <div className={styles.spacer} />
              <button className={styles.actionButton} onClick={handleAddCoins}>
                add
              </button>
              <button className={styles.actionButton} onClick={handleSubtractCoins}>
                subtract
              </button>
            </div>
          </div>

          <div className={styles.separator} />

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Data backup</div>
            <div className={styles.row}>
              <span className={styles.backupStatus}>
                {backup ? `Last backup: ${formatBackupDate(backup.timestamp)}` : 'No backup yet.'}
              </span>
              <button
                className={styles.actionButton}
                onClick={handleShowBackup}
                disabled={!backup}
              >
                show backup
              </button>
              <button className={styles.actionButton} onClick={handleBackup}>
                update backup
              </button>
              <button
                className={styles.actionButton}
                onClick={handleRestore}
                disabled={!backup || !onRestore}
              >
                restore
              </button>
            </div>
            <div className={styles.row} style={{ marginTop: 8 }}>
              <div className={styles.spacer} />
              <button
                className={styles.actionButton}
                onClick={handleDownload}
                disabled={!backup}
              >
                download
              </button>
              <button
                className={styles.actionButton}
                onClick={handleRestoreFromFile}
                disabled={!onRestore}
              >
                restore from file
              </button>
            </div>
          </div>

          {showBackupPanel && backup && (
            <div className={styles.backupPanel}>
              <div className={styles.backupHeader}>
                <span>Backup data</span>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowBackupPanel(false)}
                >
                  ✕
                </button>
              </div>
              <pre className={styles.backupContent}>{backup.yaml}</pre>
              <button className={styles.copyButton} onClick={handleCopy}>
                {copied ? 'Copied!' : 'copy'}
              </button>
            </div>
          )}

          {restoreReport && (
            <div className={styles.reportPanel}>
              <div className={styles.backupHeader}>
                <span>Restore Report</span>
                <button
                  className={styles.closeButton}
                  onClick={() => setRestoreReport(null)}
                >
                  ✕
                </button>
              </div>
              <div className={styles.reportContent}>
                <div className={styles.reportSection}>
                  <div className={styles.reportSectionTitle}>Added</div>
                  <div className={styles.reportItem}>
                    Active lists: {restoreReport.activeListsAdded}
                  </div>
                  <div className={styles.reportItem}>
                    Completed lists: {restoreReport.completedListsAdded}
                  </div>
                </div>

                {restoreReport.conflicts.length > 0 && (
                  <div className={styles.reportSection}>
                    <div className={styles.reportSectionTitle}>
                      Merge Conflicts ({restoreReport.conflicts.length})
                    </div>
                    <div className={styles.conflictList}>
                      {restoreReport.conflicts.map((conflict, index) => (
                        <div key={index} className={styles.conflictItem}>
                          <div className={styles.conflictType}>
                            {conflict.type.toUpperCase()} conflict in {conflict.location}
                          </div>
                          <div className={styles.conflictDetails}>
                            <div className={styles.conflictExisting}>
                              <span className={styles.conflictLabel}>Existing:</span>
                              <span className={styles.conflictValue}>
                                {conflict.existing.title || conflict.existing.text || conflict.existing.id}
                              </span>
                            </div>
                            <div className={styles.conflictIncoming}>
                              <span className={styles.conflictLabel}>Incoming:</span>
                              <span className={styles.conflictValue}>
                                {conflict.incoming.title || conflict.incoming.text || conflict.incoming.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {restoreReport.conflicts.length === 0 && (
                  <div className={styles.reportSuccess}>
                    No conflicts detected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}