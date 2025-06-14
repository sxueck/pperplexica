import db from '@/lib/db';
import { sharedEntries } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const GET = async (req: Request) => {
  try {
    // Get all shared entries, ordered by creation date (newest first)
    const entries = await db.query.sharedEntries.findMany({
      orderBy: [desc(sharedEntries.createdAt)],
    });

    return Response.json({ entries }, { status: 200 });
  } catch (err) {
    console.error('Error getting shared entries:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
}; 