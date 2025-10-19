-- Create newsletter_subscribers table for email list management
create table if not exists public.newsletter_subscribers (
  id uuid not null default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamp with time zone not null default now(),
  unsubscribed_at timestamp with time zone null,
  source text null default 'marketing_landing'::text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint newsletter_subscribers_pkey primary key (id),
  constraint newsletter_subscribers_email_unique unique (email),
  constraint newsletter_subscribers_status_check check (
    status = any (
      array[
        'active'::text,
        'unsubscribed'::text,
        'bounced'::text
      ]
    )
  )
) tablespace pg_default;

-- Create indexes for better query performance
create index if not exists idx_newsletter_subscribers_email 
  on public.newsletter_subscribers using btree (email) tablespace pg_default;

create index if not exists idx_newsletter_subscribers_status 
  on public.newsletter_subscribers using btree (status) tablespace pg_default;

create index if not exists idx_newsletter_subscribers_subscribed_at 
  on public.newsletter_subscribers using btree (subscribed_at desc) tablespace pg_default;

create index if not exists idx_newsletter_subscribers_source 
  on public.newsletter_subscribers using btree (source) tablespace pg_default;

-- Create trigger for auto-updating updated_at column
drop trigger if exists update_newsletter_subscribers_updated_at on newsletter_subscribers;
create trigger update_newsletter_subscribers_updated_at 
before update on newsletter_subscribers 
for each row
execute function update_updated_at_column();

-- Enable RLS (Row Level Security)
alter table public.newsletter_subscribers enable row level security;

-- Create RLS policies
-- Allow service role to do everything (for API endpoints)
create policy "Service role can manage all newsletter subscribers"
  on public.newsletter_subscribers
  for all
  to service_role
  using (true)
  with check (true);

-- Allow anonymous users to insert (subscribe)
create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers
  for insert
  to anon
  with check (true);

-- Add comment for table documentation
comment on table public.newsletter_subscribers is 'Stores email addresses for newsletter and launch announcements';

