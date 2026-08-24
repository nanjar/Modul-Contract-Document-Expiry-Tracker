# Project instructions

## Authoritative repository

This repository is the authoritative source for the Contract & Document Expiry Tracker / Business Operations Platform.

- GitHub repository: `nanjar/business-operations-platform`
- Default branch: `main`
- Local project directory used by the WSL deployment: `~/projects/Modul-Contract-Document-Expiry-Tracker`

Do not redirect implementation work to a different repository. All Contract & Document Expiry Tracker and Office Automation changes must be implemented here and committed to `main` unless the user explicitly requests another branch.

## Office Automation boundary

Office Automation is a first-class module of this platform, not a mock navigation item.

- Frontend routes live under `frontend/app/office/`.
- Backend routes live under `backend/src/office-automation/`.
- Integration delivery is handled by `backend/src/integrations/` and n8n.
- n8n workflow templates live under `docs/n8n/`.
- Telegram is an integration channel; PostgreSQL remains the system of record.

When changing Office Automation, verify the complete path: frontend -> backend API -> integration event -> n8n workflow -> Telegram delivery where configured.

## Verification

After implementation, verify the relevant Docker services and use the production-style stack in the local WSL project. Do not declare Office Automation complete based only on a visible menu item; verify that its routes and integration path work.
