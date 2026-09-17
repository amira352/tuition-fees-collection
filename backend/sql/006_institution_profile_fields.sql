-- The Institution Profile page (front-end/src/pages/institution/InstitutionProfile.jsx)
-- shows a phone number and a profile picture, but institutions never had
-- columns for either — those were hard-coded placeholders on the frontend.
-- created_at already exists and is reused as the "joined date", so no
-- column is needed for that.
--
-- avatar_base64 stores the picture as a data URL (e.g. "data:image/png;
-- base64,...") rather than a path into object storage — this project has
-- no file/object storage set up anywhere else, so this matches how the
-- rest of the app already stores everything directly in Postgres. The API
-- layer caps this at ~2.7MB (backend/src/services/institutionProfile.service.js),
-- matching the frontend's 2MB image limit after base64 overhead.

ALTER TABLE institutions
  ADD COLUMN phone text,
  ADD COLUMN avatar_base64 text;
