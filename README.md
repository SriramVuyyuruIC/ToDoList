# TaskFlow - Collaborative Task Management Platform

## Overview
TaskFlow is a modern, minimalist, multi-user task management platform inspired by Todoist. The application focuses on team collaboration, project organization, productivity tracking, and an intuitive user experience.

The platform allows users to create projects, manage tasks, collaborate with team members, track progress, and stay organized through multiple productivity views including List, Kanban, and Calendar layouts.

The application is designed as a responsive web application built with React and Supabase.

---

# Tech Stack

## Frontend

- React
- React Router
- React Query / TanStack Query
- TypeScript
- Tailwind CSS
- DnD Kit (Drag and Drop)

## Backend

- Supabase

## Authentication

- Supabase Authentication
- Email / Password Login

## Database

- PostgreSQL (Supabase)

## Storage

- Supabase Storage

## Hosting

- Vercel

---

# Core Features

## Authentication

### Users Can

- Register account
- Login
- Logout
- Reset password
- Update profile

### Profile Information

- Display Name
- Profile Picture
- Email Address
- Time Zone
- Theme Preferences

---

# Projects
Users can create and manage projects.

## Project Properties

- Name
- Description
- Color
- Icon
- Owner
- Created Date

## Project Features

- Create Project
- Edit Project
- Delete Project
- Archive Project
- Invite Members
- Remove Members

## Nested Projects
Projects can contain child projects.

Example:

Law School

- Civil Procedure
- Contracts
- Legal Writing

---

# Teams and Permissions

## Owner
Can:

- Delete project
- Transfer ownership
- Manage permissions
- Invite members
- Remove members

## Admin
Can:

- Create tasks
- Edit tasks
- Delete tasks
- Invite members
- Manage project settings

## Member
Can:

- View project
- Create tasks
- Edit assigned tasks
- Comment on tasks

---

# Tasks

## Task Properties

### Basic

- Title
- Description
- Status
- Due Date
- Due Time
- Priority

### Organization

- Tags
- Project
- Assignee
- Creator

### Additional

- Attachments
- Comments
- Activity History
- Recurring Settings

---

# Task Workflow
Tasks move through the following stages:

1. Backlog
2. To Do
3. In Progress
4. Review
5. Completed

---

# Recurring Tasks
Supported recurrence:

- Daily
- Weekly
- Monthly
- Custom Intervals

Examples:

- Every 3 Days
- Every 2 Weeks
- Every Month

---

# Attachments
Users can upload:

- Images
- PDFs
- Documents
- Any File Type

Files are stored in Supabase Storage.

---

# Collaboration Features

## Task Assignment
Users can assign tasks to:

- Themselves
- Team Members

## Comments
Each task contains a discussion thread.

Example:

- Questions
- Updates
- Status Reports

## Activity Feed
Every task maintains a history log.

Examples:

- User created task
- User updated due date
- User completed task
- User uploaded file

---

# Views

## List View
Traditional task list.

Features:

- Sorting
- Filtering
- Search

## Kanban View
Drag-and-drop board.

Columns:

- Backlog
- To Do
- In Progress
- Review
- Completed

## Calendar View
Displays tasks based on due dates.

Supports:

- Month View
- Week View

---

# Drag and Drop
Users can:

- Reorder tasks
- Move tasks between columns
- Update task status automatically

DnD Kit will be used for implementation.

---

# Dashboard

## Dashboard Widgets

### Tasks Due Today
Displays all tasks due today.

### Upcoming Tasks
Displays future deadlines.

### Overdue Tasks
Displays missed deadlines.

### Completed Tasks
Displays recently completed work.

### Productivity Statistics
Includes:

- Tasks Completed
- Tasks Created
- Completion Trends

### Completion Rate
Percentage of completed tasks.

### Recent Activity Feed
Displays recent actions across projects.

---

# Search
Global search across:

- Tasks
- Projects
- Tags
- Members

Search updates instantly while typing.

---

# Filters
Users can filter by:

- Priority
- Due Date
- Assigned User
- Project
- Status
- Tags

Filters can be combined.

---

# Notifications

## In-App Notifications
Examples:

- Task Assigned
- Task Due Soon
- Comment Added
- Project Invitation

Notification Center available in navigation bar.

---

# UI / UX Design

## Design Style
Minimalist Dark Theme

Inspired by Todoist.

### Color Palette
Background:

- Near Black

Cards:

- Dark Gray

Text:

- White

Accent:

- Red

Priority Colors:

- Low = Gray
- Medium = Yellow
- High = Red

---

# Responsive Design
Fully responsive.

Supported devices:

- Desktop
- Tablet
- Mobile

---

# Navigation Layout
Sidebar Navigation

Sections:

- Dashboard
- Inbox
- Projects
- Calendar
- Notifications
- Profile

---

# Database Schema

## profiles
FieldTypeiduuidemailtextdisplay_nametextavatar_urltexttimezonetextcreated_attimestamp
---

## projects
FieldTypeiduuidnametextdescriptiontextcolortexticontextowner_iduuidparent_project_iduuidcreated_attimestamp
---

## project_members
FieldTypeiduuidproject_iduuiduser_iduuidroletext
---

## tasks
FieldTypeiduuidtitletextdescriptiontextproject_iduuidassigned_touuidcreated_byuuidstatustextprioritytextdue_datetimestamprecurring_ruletextcreated_attimestamp
---

## tags
FieldTypeiduuidnametext
---

## task_tags
FieldTypetask_iduuidtag_iduuid
---

## comments
FieldTypeiduuidtask_iduuiduser_iduuidcontenttextcreated_attimestamp
---

## attachments
FieldTypeiduuidtask_iduuidfile_urltextfile_nametextuploaded_byuuid
---

## notifications
FieldTypeiduuiduser_iduuidtypetextmessagetextis_readbooleancreated_attimestamp
---

# Suggested React Folder Structure
src/

- components/
- pages/
- hooks/
- contexts/
- services/
- lib/
- layouts/
- types/
- utils/

components/

- tasks/
- projects/
- dashboard/
- calendar/
- notifications/
- shared/

---

# Future Enhancements

- Mobile App
- Offline Support
- Email Notifications
- Team Workspaces
- Time Tracking
- AI Task Suggestions
- Slack Integration
- Google Calendar Sync
- Outlook Calendar Sync

---

# Success Criteria
The application should provide:

- Fast task creation
- Seamless collaboration
- Intuitive drag-and-drop workflows
- Powerful project organization
- Clean and distraction-free interface
- Excellent performance on desktop and mobile devices

TaskFlow should feel like a more collaborative, project-focused version of Todoist while maintaining a simple and elegant user experience.
