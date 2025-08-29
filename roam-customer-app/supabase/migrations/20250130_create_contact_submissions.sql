-- Create contact_submissions table for handling customer contact form submissions
create table if not exists public.contact_submissions (
  id uuid not null default gen_random_uuid (),
  from_email text not null,
  to_email text not null,
  subject text not null,
  message text not null,
  status text null default 'received'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  responded_at timestamp with time zone null,
  responded_by uuid null,
  notes text null,
  constraint contact_submissions_pkey primary key (id),
  constraint contact_submissions_responded_by_fkey foreign key (responded_by) references auth.users (id),
  constraint contact_submissions_status_check check (
    (
      status = any (
        array[
          'received'::text,
          'in_progress'::text,
          'responded'::text,
          'closed'::text
        ]
      )
    )
  )
) tablespace pg_default;

-- Create indexes for better query performance
create index if not exists idx_contact_submissions_created_at on public.contact_submissions using btree (created_at desc) tablespace pg_default;

create index if not exists idx_contact_submissions_status on public.contact_submissions using btree (status) tablespace pg_default;

create index if not exists idx_contact_submissions_from_email on public.contact_submissions using btree (from_email) tablespace pg_default;

-- Create trigger function for updating updated_at column (if not exists)
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at column
drop trigger if exists update_contact_submissions_updated_at on contact_submissions;
create trigger update_contact_submissions_updated_at 
before update on contact_submissions 
for each row
execute function update_updated_at_column ();

-- Enable RLS (Row Level Security)
alter table public.contact_submissions enable row level security;

-- Create RLS policies for contact submissions
-- Only admin users can read all submissions
create policy "Admin users can view all contact submissions" on public.contact_submissions
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'admin'
    )
  );

-- Only admin users can update submissions
create policy "Admin users can update contact submissions" on public.contact_submissions
  for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'admin'
    )
  );

-- Allow service role to insert (for API endpoint)
create policy "Service role can insert contact submissions" on public.contact_submissions
  for insert
  with check (true);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.contact_submissions to service_role;
grant select on public.contact_submissions to authenticated;
grant insert on public.contact_submissions to anon, authenticated;
