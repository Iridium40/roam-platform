-- Create user_settings table
-- This table stores user preferences and application settings

create table if not exists public.user_settings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  theme text null default 'system'::text,
  language text null default 'en'::text,
  timezone text null default 'UTC'::text,
  email_notifications boolean null default true,
  push_notifications boolean null default true,
  sound_enabled boolean null default true,
  auto_logout_minutes integer null default 60,
  date_format text null default 'MM/DD/YYYY'::text,
  time_format text null default '12h'::text,
  items_per_page integer null default 25,
  sidebar_collapsed boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_settings_pkey primary key (id),
  constraint user_settings_user_id_key unique (user_id),
  constraint user_settings_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_settings_theme_check check (
    (
      theme = any (
        array['light'::text, 'dark'::text, 'system'::text]
      )
    )
  ),
  constraint user_settings_time_format_check check (
    (
      time_format = any (array['12h'::text, '24h'::text])
    )
  )
) tablespace pg_default;

-- Create index for faster user_id lookups
create index if not exists idx_user_settings_user_id on public.user_settings using btree (user_id) tablespace pg_default;

-- Enable Row Level Security
alter table public.user_settings enable row level security;

-- Create RLS policies
-- Users can view their own settings
create policy "Users can view own settings"
  on public.user_settings
  for select
  using (auth.uid() = user_id);

-- Users can insert their own settings
create policy "Users can insert own settings"
  on public.user_settings
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own settings
create policy "Users can update own settings"
  on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own settings
create policy "Users can delete own settings"
  on public.user_settings
  for delete
  using (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
create or replace function public.update_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to call the function
create trigger update_user_settings_timestamp
  before update on public.user_settings
  for each row
  execute function public.update_user_settings_updated_at();

-- Grant permissions
grant select, insert, update, delete on public.user_settings to authenticated;
grant usage on sequence public.user_settings_id_seq to authenticated;

-- Comment on table
comment on table public.user_settings is 'Stores user preferences and application settings';
comment on column public.user_settings.theme is 'UI theme: light, dark, or system';
comment on column public.user_settings.language is 'User interface language code';
comment on column public.user_settings.timezone is 'User timezone (IANA timezone identifier)';
comment on column public.user_settings.email_notifications is 'Whether user wants email notifications';
comment on column public.user_settings.push_notifications is 'Whether user wants push notifications';
comment on column public.user_settings.sound_enabled is 'Whether notification sounds are enabled';
comment on column public.user_settings.auto_logout_minutes is 'Minutes of inactivity before auto-logout (0 = never)';
comment on column public.user_settings.date_format is 'Preferred date format for display';
comment on column public.user_settings.time_format is '12-hour or 24-hour time format';
comment on column public.user_settings.items_per_page is 'Number of items to display per page in lists';
comment on column public.user_settings.sidebar_collapsed is 'Whether sidebar is collapsed by default';
