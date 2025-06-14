import { NextRequest } from 'next/server';
import { getLibraryStorage } from '@/lib/config';
import db from '@/lib/db';
import { sharedEntries } from '@/lib/db/schema';
import { generateUniqueId } from '@/lib/spaces';
import { checkContentGuardrail } from '@/lib/guardrail';

interface ShareRequest {
  chatId: string;
  title: string;
  content: string;
  category?: string;
  subcategory?: string;
}

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as ShareRequest;
    const { chatId, title, content, category, subcategory } = body;

    if (!chatId || !title || !content) {
      return Response.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Perform guardrail check before saving
    const guardrailResult = await checkContentGuardrail({
      title,
      content,
      category,
      subcategory,
    });

    // If content is not allowed, reject the submission
    if (!guardrailResult.allowed) {
      return Response.json(
        { 
          message: 'Content rejected by safety and categorization check',
          reason: guardrailResult.reason,
          suggestedCategory: guardrailResult.suggestedCategory,
        },
        { status: 403 },
      );
    }

    const libraryStorage = getLibraryStorage();
    
    // Create a shared entry with unique 5-character ID
    // Use suggested category from guardrail if available and original category was incorrect
    const finalCategory = guardrailResult.suggestedCategory && 
                          guardrailResult.suggestedCategory !== category 
                          ? guardrailResult.suggestedCategory 
                          : category;

    const sharedEntry = {
      id: generateUniqueId(),
      chatId,
      title,
      content,
      createdAt: new Date().toISOString(),
      author: 'Anonymous', // For now, we don't have user authentication
      spaceSharing: true,
      category: finalCategory || null,
      subcategory: subcategory || null,
    };

    // Save to database
    try {
      await db.insert(sharedEntries).values(sharedEntry).execute();
      console.log('Shared entry saved to database:', sharedEntry);
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      return Response.json(
        { message: 'Failed to save shared entry to database' },
        { status: 500 },
      );
    }

    return Response.json(
      { 
        message: 'Successfully shared to spaces',
        entry: sharedEntry,
        // Include guardrail feedback if category was adjusted
        ...(guardrailResult.suggestedCategory && guardrailResult.suggestedCategory !== category && {
          categoryAdjusted: true,
          originalCategory: category,
          adjustedCategory: guardrailResult.suggestedCategory,
        }),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error sharing to spaces:', err);
    return Response.json(
      { message: 'An error occurred while sharing' },
      { status: 500 },
    );
  }
}; 