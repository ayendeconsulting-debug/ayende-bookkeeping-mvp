'use server';

import { api } from '@/lib/api';
import { ChatMessage } from '@/types';

/**
 * Send a chat message to the AI assistant.
 * Server Action — uses server-side Clerk auth so org_id is included in JWT.
 * Placed in lib/ so it can be imported by both the AI page and the chat widget.
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<{
  success: boolean;
  reply?: string;
  error?: string;
}> {
  try {
    const data = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });

    const reply =
      data?.reply ?? data?.message ?? data?.content ?? 'No response received.';

    return { success: true, reply };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Something went wrong.' };
  }
}
