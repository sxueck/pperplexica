import db from '@/lib/db';
import { getLibraryStorage } from '@/lib/config';

export const GET = async (req: Request) => {
  try {
    const libraryStorage = getLibraryStorage();
    
    // For local storage, return empty array as chats are stored in browser
    if (libraryStorage === 'local') {
      return Response.json({ chats: [] }, { status: 200 });
    }

    // For sqlite storage, use existing database logic
    let chats = await db.query.chats.findMany();
    chats = chats.reverse();
    return Response.json({ chats: chats }, { status: 200 });
  } catch (err) {
    console.error('Error in getting chats: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
