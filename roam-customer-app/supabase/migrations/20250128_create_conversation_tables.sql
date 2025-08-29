-- Create conversation_metadata table
create table public.conversation_metadata (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  twilio_conversation_sid text not null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  last_message_at timestamp without time zone null,
  participant_count integer null default 2,
  is_active boolean null default true,
  conversation_type text null default 'booking_chat'::text,
  constraint conversation_metadata_pkey primary key (id),
  constraint conversation_metadata_twilio_conversation_sid_key unique (twilio_conversation_sid),
  constraint conversation_metadata_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint conversation_metadata_conversation_type_check check (
    (
      conversation_type = any (
        array[
          'booking_chat'::text,
          'support_chat'::text,
          'general'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for conversation_metadata
create index IF not exists idx_conversation_metadata_booking_id on public.conversation_metadata using btree (booking_id) TABLESPACE pg_default;
create index IF not exists idx_conversation_metadata_twilio_sid on public.conversation_metadata using btree (twilio_conversation_sid) TABLESPACE pg_default;
create index IF not exists idx_conversation_metadata_created_at on public.conversation_metadata using btree (created_at) TABLESPACE pg_default;
create index IF not exists idx_conversation_metadata_last_message_at on public.conversation_metadata using btree (last_message_at) TABLESPACE pg_default;

-- Create conversation_participants table
create table public.conversation_participants (
  id uuid not null default gen_random_uuid (),
  conversation_id uuid not null,
  user_id uuid null,
  user_type text not null,
  twilio_participant_sid text not null,
  joined_at timestamp without time zone null default now(),
  left_at timestamp without time zone null,
  is_active boolean null default true,
  last_read_at timestamp without time zone null,
  constraint conversation_participants_pkey primary key (id),
  constraint conversation_participants_conversation_id_fkey foreign KEY (conversation_id) references conversation_metadata (id) on delete CASCADE,
  constraint conversation_participants_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint conversation_participants_user_type_check check (
    (
      user_type = any (
        array[
          'provider'::text,
          'customer'::text,
          'owner'::text,
          'dispatcher'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for conversation_participants
create index IF not exists idx_conversation_participants_conversation_id on public.conversation_participants using btree (conversation_id) TABLESPACE pg_default;
create index IF not exists idx_conversation_participants_user_id on public.conversation_participants using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_conversation_participants_user_type on public.conversation_participants using btree (user_type) TABLESPACE pg_default;
create index IF not exists idx_conversation_participants_twilio_sid on public.conversation_participants using btree (twilio_participant_sid) TABLESPACE pg_default;

-- Enable Row Level Security (RLS)
alter table public.conversation_metadata enable row level security;
alter table public.conversation_participants enable row level security;

-- Create RLS policies for conversation_metadata
create policy "Users can view conversations they participate in" on public.conversation_metadata
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_metadata.id
      and cp.user_id = auth.uid()
      and cp.is_active = true
    )
  );

create policy "Users can insert conversations for their bookings" on public.conversation_metadata
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = conversation_metadata.booking_id
      and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
    )
  );

create policy "Users can update conversations they participate in" on public.conversation_metadata
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_metadata.id
      and cp.user_id = auth.uid()
      and cp.is_active = true
    )
  );

-- Create RLS policies for conversation_participants
create policy "Users can view participants in their conversations" on public.conversation_participants
  for select using (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_participants.conversation_id
      and cp2.user_id = auth.uid()
      and cp2.is_active = true
    )
  );

create policy "Users can insert themselves as participants" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
  );

create policy "Users can update their own participation" on public.conversation_participants
  for update using (
    user_id = auth.uid()
  );

-- Create updated_at trigger for conversation_metadata
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_conversation_metadata_updated_at
  before update on public.conversation_metadata
  for each row
  execute function public.handle_updated_at();
