# Backup Structure

## Purpose
Versioned backups package storage. Keeps source files, SQL migrations, and rollback scripts before applying code modifications.

## Folder Pattern
- `backups/vX.X.X/`
  - `source/`: Backed up files to modify.
  - `migrations/`: DB snapshots.
  - `release-notes/`: Release notes.
  - `rollback.md`: Revert scripts.
