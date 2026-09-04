-- Contact details for existing installs.
alter table clients add column if not exists contact text;
