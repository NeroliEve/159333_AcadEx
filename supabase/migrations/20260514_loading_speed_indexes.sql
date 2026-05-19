-- Non-breaking indexes for shell-first loading endpoints and common counters.

create index if not exists listings_feed_visible_created_idx
  on public.listings (status, created_at desc)
  where deleted_at is null;

create index if not exists listings_updated_admin_idx
  on public.listings (updated_at desc);

create index if not exists profiles_admin_updated_idx
  on public.profiles (updated_at desc);

create index if not exists profiles_role_status_idx
  on public.profiles (role, account_status);

create index if not exists profiles_verified_idx
  on public.profiles (is_verified);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_unread_conversation_sender_idx
  on public.messages (conversation_id, is_read, sender_id);

create index if not exists conversations_buyer_idx
  on public.conversations (buyer_id);

create index if not exists conversations_seller_idx
  on public.conversations (seller_id);

create index if not exists transactions_buyer_updated_idx
  on public.transactions (buyer_id, updated_at desc);

create index if not exists transactions_seller_updated_idx
  on public.transactions (seller_id, updated_at desc);

create index if not exists saved_listings_user_created_idx
  on public.saved_listings (user_id, created_at desc);

create index if not exists admin_action_logs_created_idx
  on public.admin_action_logs (created_at desc);

create index if not exists user_blocks_blocker_blocked_idx
  on public.user_blocks (blocker_id, blocked_id);
