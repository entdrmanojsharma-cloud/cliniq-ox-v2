# Feature: Authentication (Frontend)

## Purpose
Manages user authentication screens, biometric login toggles, and secure token lifecycle.

## Responsibilities
- Render login inputs, register flows, and recovery password screens.
- Validate client-side inputs.
- Call backend auth APIs and cache JWTs in secure storage.

## Dependencies
- Shared components (Button, Input).
- Global store (`store/` state access).
