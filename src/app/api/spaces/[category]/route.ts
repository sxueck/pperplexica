import db from '@/lib/db';
import { sharedEntries } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ category: string }> }
) => {
  try {
    const { category } = await params;
    
    // Get all shared entries for the specific category, ordered by creation date (newest first)
    const entries = await db.query.sharedEntries.findMany({
      where: eq(sharedEntries.category, category),
      orderBy: [desc(sharedEntries.createdAt)],
    });

    return Response.json({ entries }, { status: 200 });
  } catch (err) {
    console.error('Error getting shared entries for category:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
}; 