-- Surface the admin's handling note on the report itself so reporters can see
-- what was done about their report on /profile/reports, and admins can see it
-- inline in the Reports tab instead of having to dig through the audit log.

alter table public.reports
  add column if not exists resolution_note text;
