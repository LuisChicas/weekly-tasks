# Weekly Tasks

## Summary

Application to create, share, and manage lists of tasks to complete with a deadline. It also will include gamification ideas starting with coins.

## Components

### TaskPanel

A card-like panel component that displays a single to-do list with its tasks.

#### Layout

- Container: Card with padding (32px horizontal), border, and subtle shadow
- Default width: 450px
- Wide mode: Expands to 100% of its container (used in single/focused view)

#### Fields

The panel contains three main fields, each with view and edit states:

##### 1. Title Row

- **Title (left)**
  - **View state**: Displays the title as an h2 heading
  - **Edit state**: Text input field for editing the title
  - **Interaction**: Click on title to enter edit mode, blur or Enter to save

- **Descartar button (right)**
  - Text link "descartar", no border/outline
  - Visibility: Hidden by default, shown on panel hover
  - Underline appears on hover
  - Clicking completes/discards the list (same as the Complete button)

##### 2. Deadline Row

- **Deadline (left)**
  - **View state**: Displays the deadline date with subtitle styling (smaller, muted text)
  - **Edit state**: Date input with visible calendar picker icon
  - **Format**: Display as readable date (e.g., "THU 1 JAN")
  - **Interaction**: Click on deadline to enter edit mode, blur or Enter to save
  - **Overdue**: When the deadline has passed, the date text turns red

- **Buy Day button (right, conditional)**
  - Shown only when the deadline is overdue AND the user has at least 1 coin
  - Green outlined pill with text "comprar 1 dia"
  - Fills green on hover
  - Clicking adds 1 day to the deadline and subtracts 1 coin

##### 3. Task List

A vertical list of items (tasks and separators) with the following elements:

###### Add Task Button

- Position: At the bottom of the task list
- Label: "+ Add task"
- Behavior: When clicked, adds a new empty task in edit mode

###### Task Item

Each task in the list contains:

- **Chevron** (for tasks with subtasks)
  - Position: Absolutely positioned to the left of the checkbox (-20px)
  - Points right when subtasks are collapsed, rotates 90° down when expanded
  - 0.2s rotation transition on click
  - Clicking toggles subtask visibility

- **Checkbox**: A square box
  - Unchecked: Empty square border
  - Checked: Green square with white checkmark
  - Interaction: Click to toggle checked/unchecked state
  - When checked: Task text shows strikethrough styling
  - When checking a task with subtasks: Subtasks auto-collapse

- **Task Text**
  - **View state**: Plain text display
  - **Edit state**: Text input field
  - **Interaction**: Click on text to enter edit mode, blur or Enter to save
  - **Enter key**: Creates a new empty task directly below and focuses it
  - New tasks start in edit mode with focus

- **Add Subtask Button**: "+" icon, visible on task hover
  - Adds a new subtask to the task
  - Auto-expands subtasks if collapsed

- **Move Buttons**: Up/down arrows, visible on task hover
  - Reorder the task within the list

- **Delete Button**: "✕" icon, visible on task hover
  - Red on hover, click to remove the task

- **Emoji Celebration**: Random emoji animation when a task is checked
  - Picks from a set of celebration emojis
  - Pops in with a wiggle animation, then fades out (1.2s)

###### Subtask Item

Each subtask contains:

- **Checkbox**: Circular (16px), checked state shows a muted checkmark
- **Subtask Text**: Same edit behavior as task text
  - **Enter key**: Creates a new empty subtask directly below and focuses it
- **Move Buttons**: Up/down arrows, visible on subtask hover
- **Delete Button**: "✕" icon, visible on subtask hover

###### Separator

A section divider that can be inserted between tasks:

- **Creation**: A hit area between tasks shows a "+" icon on hover; clicking inserts a separator
- **Name**: Optional, editable text label displayed in uppercase
  - Placeholder text shown on hover if no name is set
- **Border**: 2px solid bottom border
- **Controls**: Move up/down and delete buttons, visible on hover

#### Component States

| Field | View State | Edit State | Trigger |
|-------|-----------|------------|---------|
| Title | Text heading | Text input | Click |
| Deadline | Formatted date text | Date input | Click |
| Task text | Plain text | Text input | Click |
| Subtask text | Plain text | Text input | Click |
| Separator name | Uppercase text | Text input | Click |
| Checkbox | Square box | N/A | Click toggles |
| Subtask checkbox | Circle | N/A | Click toggles |

#### Sharing

- **Owner view**: A "compartir" option appears in the panel menu (three-dots). Opens a share panel where usernames can be added or removed from `sharedWith`.
- **Recipient view**: Panel shows a "shared by [username]" label. The "compartir" menu item is hidden.
- Sharing state flows through the regular sync (`PUT /sync`) — no separate share endpoint.

#### Read-Only Mode

The TaskPanel supports a read-only mode used for displaying completed lists:

- Title, deadline, and task text are not clickable/editable
- Checkboxes are not toggleable
- Delete buttons, move buttons, and "Add task" button are hidden
- "Descartar" button is hidden
- Panel has slightly reduced opacity and gray background

#### Visual Specifications

- Card background: White
- Card border: Subtle border (1px, light gray)
- Card shadow: Subtle box shadow for depth
- Checkbox size: 20px square
- Subtask checkbox: 16px circle
- Checkmark: Visible icon when checked
- Strikethrough: Applied to completed task/subtask text

### AuthControls

Handles user authentication and sync UI. Appears in the top bar.

#### Logged In State

- **Username button**: Displays the username with a dropdown arrow (▾)
  - Clicking toggles a dropdown menu with a "log out" option
  - Arrow rotates up when dropdown is open
- **Sync button**: Underlined text link (no border)
  - States: "sync" (idle), "syncing..." (in progress), "synced!" (success, green), "sync failed" (error, red)
  - Pushes current state (coins, active lists, completed lists) to the backend

#### Logged Out State

- **Text links**: "log in / register" displayed inline
- **Form**: Clicking either link reveals a vertical form below with:
  - Username input
  - Password input
  - Action button ("log in" or "register")
  - Cancel button (✕) positioned above the form
  - Loading states: button text changes to "logging in..." or "registering..."
  - Error messages displayed below the form

#### Behavior

- **Register**: Uploads current localStorage data (coins, lists) to the new account
- **Login**: Downloads the user's data from the backend, replacing local state
- **Logout**: Clears all localStorage data and resets the app to a blank state

### Tasks Page

The tasks page manages the lifecycle of task lists: creating, editing, completing, and viewing completed lists.

#### Top Bar

Position: Top right corner of the page. Contains three groups of controls, left to right:

1. **View Toggle**: Two icon buttons separated by a "|" divider
   - Single square: Switches to focused/single view
   - Three squares: Switches to grid/all view
   - Active mode icon is filled dark, inactive is just an outline

2. **User Controls** (center group)
   - **Coins Display**: Star icon (★) followed by the coin count (gold icon, semi-bold mid-gray text)
   - **AuthControls**: Login/register links or username + sync (see AuthControls section)

3. **Create Button**
   - Dashed border, text "+ create"
   - Creates a new empty list and navigates to it in single view

#### Coins Earning Rules

- **Deadline required**: No coins are earned if the list has no deadline set
- **Base reward**: 1 coin is earned when a list with a deadline is completed on or before the deadline
- **Early completion bonus**: 1 extra coin per day the list is completed before the deadline
  - Example: Completing 3 days before the deadline earns 1 (base) + 3 (bonus) = 4 coins
- **No coins are earned** if the list is completed after the deadline

#### View Modes

##### Single View (default)

- Displays one list at a time, centered, with the panel in wide mode (550px container)
- **Navigation arrows**: Large chevrons (‹ ›) on either side, vertically centered
  - Wrap-around: Left arrow on first list goes to last, right on last goes to first
  - Hidden when there's only one list
- **Dot indicators**: Row of small circles below the list
  - One dot per list, active dot is darker (#888 vs #ccc)
  - Clickable to jump to a specific list
  - Hidden when there's only one list

##### Grid View

- Displays all active lists in a grid layout
  - 3 or fewer lists: Flex row, centered
  - More than 3: CSS grid with 3 columns of 450px each

#### Completing a List

- When all tasks in a list are checked, a "Complete" button appears at the bottom of the panel
- The "descartar" button in the title row also completes/discards the list (always available on hover)
- Clicking either button moves the list to completed lists and awards coins

#### Completed Lists Section

Below the active list section:

- **Toggle button**: Light gray text centered on page
  - When collapsed: "Show completed lists ▲"
  - When expanded: "Hide completed lists ▼"
  - Only visible when there are completed lists
- **Completed grid**: When expanded, shows a grid of read-only TaskPanels
  - Most recently completed lists appear first
  - Each card has a delete button (✕) in the top-right corner, visible on hover

### DevMenu

A development/utility panel fixed to the bottom center of the page. Contains tools for debugging and data management.

#### Toggle

- Tab button at the bottom of the screen: "Show dev menu" / "Hide dev menu"
- Dark themed (dark background, light text)

#### Sections

##### Add/Remove Coins

- Increment/decrement buttons with a numeric input
- "add" and "subtract" action buttons to modify the coin count

##### Data Backup

Manages YAML-based backup and restore of all app data.

- **Status line**: Shows last backup timestamp or "No backup yet."
- **First row buttons**:
  - "show backup": Opens a panel displaying the YAML content with a copy button
  - "update backup": Saves current state (coins, active lists, completed lists) to localStorage as YAML
  - "restore": Parses the stored backup and merges it into current state with conflict detection
- **Second row buttons**:
  - "download": Downloads the backup as a `.yaml` file
  - "restore from file": Opens a file picker for `.yaml`/`.yml`/`.txt` files and restores from the selected file

#### Backup Format

Data is serialized as YAML with the following structure:

- `coins`: Number
- `activeLists` / `completedLists`: Arrays of lists, each containing:
  - `id`, `title`, `deadline`
  - `items`: Array of tasks and separators (with `type: task` or `type: separator`)
  - Tasks include `text`, `completed`, and optional `subtasks`
  - Separators include optional `name`
- Backward compatible: Parses old format (`tasks:` without type field) as well

#### Restore Conflict Detection

When restoring, lists with matching IDs are flagged as conflicts rather than overwritten. A restore report panel shows:

- Number of active/completed lists added
- Conflict details (list, task, and subtask level) with existing vs incoming values

### Feature Flags

Server-evaluated feature flags delivered to the frontend. Flags are provided via React Context (`FlagsProvider` + `useFlags()` hook) and cached in localStorage for offline fallback.

#### How Flags Are Loaded

- **Logged-in users**: Flags arrive in auth (login/register) and sync (`GET /sync`) responses — no extra API call needed
- **Offline**: Cached flags loaded from localStorage by `FlagsProvider` on mount

#### Current Flags

| Flag | Type | Effect |
|---|---|---|
| `custom_bg_color` | string | Applied as page background color (prefixed with `#`). Empty string = no custom color |

#### Architecture

- `app/lib/flags.tsx` — `FlagsProvider` wraps the app, `useFlags()` returns `{ flags, setFlags, clearFlags }`
- `PageContainer` component reads `custom_bg_color` and applies it as inline `backgroundColor` style
- On logout, `clearFlags()` removes cached flags and resets to defaults