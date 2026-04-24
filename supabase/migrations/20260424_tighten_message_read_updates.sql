create or replace function public.protect_message_update_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  current_user_id uuid;
  conv public.conversations%rowtype;
begin
  if new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.content <> old.content
     or new.created_at <> old.created_at then
    raise exception 'Only is_read may be updated on messages';
  end if;

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authenticated user context is required to update message read state';
  end if;

  select *
  into conv
  from public.conversations
  where id = old.conversation_id;

  if not found then
    raise exception 'Conversation % does not exist', old.conversation_id;
  end if;

  if current_user_id <> conv.buyer_id and current_user_id <> conv.seller_id then
    raise exception 'Only conversation participants may update message read state';
  end if;

  if current_user_id = old.sender_id then
    raise exception 'Message senders cannot mark their own messages as read';
  end if;

  if old.is_read and not new.is_read then
    raise exception 'Messages may only be marked as read';
  end if;

  return new;
end;
$function$;

drop policy if exists messages_update_participant_or_admin on public.messages;

create policy "messages_update_recipient_only"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        (c.buyer_id = (select auth.uid()) and messages.sender_id = c.seller_id)
        or
        (c.seller_id = (select auth.uid()) and messages.sender_id = c.buyer_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        (c.buyer_id = (select auth.uid()) and messages.sender_id = c.seller_id)
        or
        (c.seller_id = (select auth.uid()) and messages.sender_id = c.buyer_id)
      )
  )
);
