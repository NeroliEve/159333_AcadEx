import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { MessagesWorkspace } from "@/components/messages-workspace";
import { getConversationDetail } from "@/lib/messages";
import { getViewerContext } from "@/lib/marketplace";

type MessageThreadPageProps = {
  params: Promise<{ id: string }>;
};

async function MessageThreadContent({ params }: MessageThreadPageProps) {
  const { user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const { conversation, error } = await getConversationDetail(id, user.id);

  if (error) {
    return (
      <EmptyState
        actionHref="/messages"
        actionLabel="Back to messages"
        description="Acadex could not load this conversation right now. This is usually a temporary permissions or data issue."
        eyebrow="Messages"
        title="Conversation unavailable"
      />
    );
  }

  if (!conversation) {
    notFound();
  }

  return (
    <MessagesWorkspace
      initialConversation={conversation}
      viewerId={user.id}
    />
  );
}

export default function MessageThreadPage(props: MessageThreadPageProps) {
  return <MessageThreadContent params={props.params} />;
}
