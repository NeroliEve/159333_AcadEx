drop policy if exists conversations_insert_buyer_or_admin on public.conversations;

create policy "conversations_insert_buyer_only"
on public.conversations
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and buyer_id <> seller_id
);

drop policy if exists messages_insert_sender_participant_or_admin on public.messages;

create policy "messages_insert_sender_participant_only"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (
        c.buyer_id = (select auth.uid())
        or c.seller_id = (select auth.uid())
      )
  )
);
