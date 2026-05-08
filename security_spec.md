# Security Specification: VemK 18+ Hardening

## 1. Data Invariants
- **Profile Integrity:** A user cannot create or get profiles unless they have verified they are 18+.
- **Match Confidentiality:** Only participants in a match (`userIds` array) can read or write messages.
- **Admin Privileges:** Is based on custom Firestore claims, not membership in a collection.
- **Report Records:** Written only by the reporting user, can be read only by admins.

## 2. Session Management
- All mutations that change a user's state (check-in, check-out, profile updates) require valid authentication.
- Anonymous users can browse events and profiles but not check in to events or chat.
- User accounts must be verified via Firebase Auth.

## 3. Rate Limiting
- Firestore rules limit writes to 10 per minute per user via timestamp checks in security rules.
- Image uploads are limited to 5MB via Firebase Storage rules.

## 4. Input Validation
- Nicknames are trimmed and limited to 30 chars.
- Users can only set their own `nickname` and `photoUrl`.
- Profile photo URLs are validated against a list of allowed domains (Firebase Storage, Firebase Auth).
