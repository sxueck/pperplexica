import db from '@/lib/db';
import { messages, chats } from '@/lib/db/schema';
import { count, eq } from 'drizzle-orm';
import { getLibraryStorage } from '@/lib/config';

export const GET = async () => {
  try {
    const libraryStorage = getLibraryStorage();

    if (libraryStorage === 'local') {
      // For local storage, the statistics will be computed on the client side
      return Response.json({
        totalQuestions: 0,
        totalChats: 0,
        useLocalStorage: true
      }, { status: 200 });
    }

    // For sqlite storage, count user messages (questions)
    const [questionsResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.role, 'user'));

    // Count total chats
    const [chatsResult] = await db
      .select({ count: count() })
      .from(chats);

    return Response.json({
      totalQuestions: questionsResult.count,
      totalChats: chatsResult.count
    }, { status: 200 });

  } catch (err) {
    console.error('Error getting statistics:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 }
    );
  }
}; 