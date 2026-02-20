'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import TaskPanel from './components/TaskPanel';
import DevMenu from './components/DevMenu';
import type { RestoreData, RestoreReport, ConflictItem } from './components/DevMenu/DevMenu';
import type { TaskPanelData, Task } from './components/TaskPanel/TaskPanel';

const ACTIVE_KEY = 'activeLists';
const COMPLETED_KEY = 'completedLists';
const COINS_KEY = 'coins';
const NOTES_KEY = 'notes';

interface Note {
  id: string;
  name: string;
  content: string;
}

function createEmptyList(): TaskPanelData {
  return {
    id: Date.now().toString(),
    title: 'My Tasks',
    deadline: '',
    items: [],
  };
}

// Migrate old data format (tasks array) to new format (items array with type discriminator)
function migrateListData(list: Record<string, unknown>): TaskPanelData {
  // Handle old format with 'tasks' array
  const oldTasks = list.tasks as Array<Record<string, unknown>> | undefined;
  const existingItems = list.items as Array<Record<string, unknown>> | undefined;

  const itemsToMigrate = existingItems || oldTasks || [];

  const migratedItems = itemsToMigrate.map(item => ({
    ...item,
    type: item.type || 'task', // Default to 'task' for items without type
  }));

  return {
    id: (list.id as string) || Date.now().toString(),
    title: (list.title as string) || 'My Tasks',
    deadline: (list.deadline as string) || '',
    items: migratedItems,
  } as TaskPanelData;
}

export default function TasksPage() {
  const hydrated = useRef(false);
  const [activeLists, setActiveLists] = useState<TaskPanelData[]>([]);
  const [completedLists, setCompletedLists] = useState<TaskPanelData[]>([]);
  const [coins, setCoins] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('single');
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [activeSideSection, setActiveSideSection] = useState<string | null>(null);
  // const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    try {
      const storedActive = localStorage.getItem(ACTIVE_KEY);
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        const migrated = parsed.map((list: Record<string, unknown>) => migrateListData(list));
        setActiveLists(migrated);
      }

      const storedCompleted = localStorage.getItem(COMPLETED_KEY);
      if (storedCompleted) {
        const parsed = JSON.parse(storedCompleted);
        const migrated = parsed.map((list: Record<string, unknown>, i: number) => {
          const migratedList = migrateListData(list);
          return {
            ...migratedList,
            id: migratedList.id || `migrated-${i}-${Date.now()}`,
          };
        });
        setCompletedLists(migrated);
      }

      const storedCoins = localStorage.getItem(COINS_KEY);
      if (storedCoins) setCoins(JSON.parse(storedCoins));

      // const storedNotes = localStorage.getItem(NOTES_KEY);
      // if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch { /* ignore parse errors */ }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeLists));
  }, [activeLists]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedLists));
  }, [completedLists]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(COINS_KEY, JSON.stringify(coins));
  }, [coins]);

  // useEffect(() => {
  //   if (!hydrated.current) return;
  //   localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  // }, [notes]);

  const handleComplete = (listId: string) => {
    const list = activeLists.find(l => l.id === listId);
    if (!list) return;
    let earned = 0;
    if (list.deadline) {
      const deadline = new Date(list.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadline.setHours(0, 0, 0, 0);
      const daysEarly = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysEarly >= 0) {
        earned = 1 + daysEarly;
      }
    }
    setCoins(prev => prev + earned);
    setCompletedLists(prev => [list, ...prev]);
    setActiveLists(prev => prev.filter(l => l.id !== listId));
  };

  const handleChangeList = (listId: string, updatedData: TaskPanelData) => {
    setActiveLists(prev =>
      prev.map(l => (l.id === listId ? updatedData : l))
    );
  };

  const handleCreateNew = () => {
    setActiveLists(prev => [...prev, createEmptyList()]);
    // If in single view, navigate to the new list
    if (viewMode === 'single') {
      setCurrentIndex(activeLists.length);
    }
  };

  // Ensure currentIndex stays valid when lists change
  const safeCurrentIndex = Math.min(currentIndex, Math.max(0, activeLists.length - 1));

  const handlePrevList = () => {
    setCurrentIndex(prev => prev === 0 ? activeLists.length - 1 : prev - 1);
  };

  const handleNextList = () => {
    setCurrentIndex(prev => prev === activeLists.length - 1 ? 0 : prev + 1);
  };

  const handleDeleteCompleted = (listId: string) => {
    setCompletedLists(prev => prev.filter(l => l.id !== listId));
  };

  const handleBuyDay = (listId: string) => {
    if (coins < 1) return;
    setCoins(prev => prev - 1);
    setActiveLists(prev =>
      prev.map(list => {
        if (list.id !== listId) return list;
        const currentDeadline = new Date(list.deadline);
        currentDeadline.setDate(currentDeadline.getDate() + 1);
        const newDeadline = currentDeadline.toISOString().split('T')[0];
        return { ...list, deadline: newDeadline };
      })
    );
  };

  const handleRestore = (data: RestoreData): RestoreReport => {
    const conflicts: ConflictItem[] = [];
    let activeListsAdded = 0;
    let completedListsAdded = 0;

    // Helper to check for task/subtask conflicts within a list
    const findTaskConflicts = (
      existingList: TaskPanelData,
      incomingList: TaskPanelData,
      listLocation: string
    ) => {
      const existingTasks = existingList.items.filter((item): item is Task => item.type === 'task');
      const incomingTasks = incomingList.items.filter((item): item is Task => item.type === 'task');

      for (const incomingTask of incomingTasks) {
        const existingTask = existingTasks.find(t => t.id === incomingTask.id);
        if (existingTask) {
          conflicts.push({
            type: 'task',
            location: `${listLocation}`,
            existing: { id: existingTask.id, text: existingTask.text },
            incoming: { id: incomingTask.id, text: incomingTask.text },
          });

          // Check subtasks
          const existingSubtasks = existingTask.subtasks || [];
          const incomingSubtasks = incomingTask.subtasks || [];
          for (const incomingSub of incomingSubtasks) {
            const existingSub = existingSubtasks.find(s => s.id === incomingSub.id);
            if (existingSub) {
              conflicts.push({
                type: 'subtask',
                location: `${listLocation} > "${existingTask.text}"`,
                existing: { id: existingSub.id, text: existingSub.text },
                incoming: { id: incomingSub.id, text: incomingSub.text },
              });
            }
          }
        }
      }
    };

    // Process active lists
    const newActiveLists: TaskPanelData[] = [];
    for (const incomingList of data.activeLists) {
      const existingList = activeLists.find(l => l.id === incomingList.id);
      if (existingList) {
        // List ID conflict
        conflicts.push({
          type: 'list',
          location: 'Active Lists',
          existing: { id: existingList.id, title: existingList.title },
          incoming: { id: incomingList.id, title: incomingList.title },
        });
        findTaskConflicts(existingList, incomingList, `Active: "${existingList.title}"`);
      } else {
        newActiveLists.push(incomingList);
        activeListsAdded++;
      }
    }

    // Process completed lists
    const newCompletedLists: TaskPanelData[] = [];
    for (const incomingList of data.completedLists) {
      const existingList = completedLists.find(l => l.id === incomingList.id);
      if (existingList) {
        // List ID conflict
        conflicts.push({
          type: 'list',
          location: 'Completed Lists',
          existing: { id: existingList.id, title: existingList.title },
          incoming: { id: incomingList.id, title: incomingList.title },
        });
        findTaskConflicts(existingList, incomingList, `Completed: "${existingList.title}"`);
      } else {
        newCompletedLists.push(incomingList);
        completedListsAdded++;
      }
    }

    // Add non-conflicting lists
    if (newActiveLists.length > 0) {
      setActiveLists(prev => [...prev, ...newActiveLists]);
    }
    if (newCompletedLists.length > 0) {
      setCompletedLists(prev => [...prev, ...newCompletedLists]);
    }

    return {
      activeListsAdded,
      completedListsAdded,
      conflicts,
    };
  };

  return (
    <div className={styles.container}>
      {/* Top bar with controls */}
      <div className={styles.topBar}>
        <div className={styles.viewToggle}>
          <button
            className={styles.viewToggleButton}
            onClick={() => setViewMode('single')}
            title="View one by one"
          >
            <div className={`${styles.singleSquare} ${viewMode === 'single' ? styles.active : ''}`} />
          </button>
          <span className={styles.viewToggleDivider}>|</span>
          <button
            className={styles.viewToggleButton}
            onClick={() => setViewMode('all')}
            title="View all"
          >
            <div className={styles.tripleSquares}>
              <div className={`${styles.tripleSquare} ${viewMode === 'all' ? styles.active : ''}`} />
              <div className={`${styles.tripleSquare} ${viewMode === 'all' ? styles.active : ''}`} />
              <div className={`${styles.tripleSquare} ${viewMode === 'all' ? styles.active : ''}`} />
            </div>
          </button>
        </div>

        <div className={styles.coinsLabel}>
          <span className={styles.coinIcon}>&#9733;</span>
          {coins}
        </div>

        <button className={styles.createButton} onClick={handleCreateNew}>
          + create
        </button>
      </div>

      {/* View all mode */}
      {viewMode === 'all' && activeLists.length > 0 && (
        <div className={activeLists.length <= 3 ? styles.activeGridCentered : styles.activeGrid}>
          {activeLists.map((list) => (
            <TaskPanel
              key={list.id}
              data={list}
              coins={coins}
              onChange={(updated) => handleChangeList(list.id, updated)}
              onComplete={() => handleComplete(list.id)}
              onBuyDay={() => handleBuyDay(list.id)}
            />
          ))}
        </div>
      )}

      {/* Single view mode */}
      {viewMode === 'single' && activeLists.length > 0 && (
        <>
          <div className={styles.singleViewContainer}>
            {activeLists.length > 1 && (
              <button
                className={styles.navArrow}
                onClick={handlePrevList}
              >
                ‹
              </button>
            )}

            <div className={styles.singleViewPanel}>
              <TaskPanel
                data={activeLists[safeCurrentIndex]}
                wide
                coins={coins}
                onChange={(updated) => handleChangeList(activeLists[safeCurrentIndex].id, updated)}
                onComplete={() => handleComplete(activeLists[safeCurrentIndex].id)}
                onBuyDay={() => handleBuyDay(activeLists[safeCurrentIndex].id)}
              />
            </div>

            {activeLists.length > 1 && (
              <button
                className={styles.navArrow}
                onClick={handleNextList}
              >
                ›
              </button>
            )}
          </div>
          {activeLists.length > 1 && (
            <div className={styles.listIndicator}>
              {activeLists.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicatorDot} ${index === safeCurrentIndex ? styles.indicatorDotActive : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {completedLists.length > 0 && (
        <div className={styles.completedSection}>
          <button
            className={styles.completedToggle}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Hide completed lists' : 'Show completed lists'}
            <span className={styles.arrow}>
              {showCompleted ? '▼' : '▲'}
            </span>
          </button>

          {showCompleted && (
            <div className={styles.completedGrid}>
              {completedLists.map((list) => (
                <div key={list.id} className={styles.completedPanelWrapper}>
                  <TaskPanel data={list} readOnly />
                  <button
                    className={styles.deletePanelButton}
                    onClick={() => handleDeleteCompleted(list.id)}
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Side menu - hidden for now */}

      <DevMenu
          coins={coins}
          onSetCoins={setCoins}
          activeLists={activeLists}
          completedLists={completedLists}
          onRestore={handleRestore}
        />
    </div>
  );
}