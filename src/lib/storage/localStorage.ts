// Local storage service for browser-only chat history storage
// This is used when LIBRARY_STORAGE is set to "local" instead of "sqlite"

export interface LocalMessage {
  id: string;
  content: string;
  chatId: string;
  messageId: string;
  role: 'user' | 'assistant';
  metadata: {
    createdAt: string;
    sources?: any[];
  };
}

export interface LocalChat {
  id: string;
  title: string;
  createdAt: string;
  focusMode: string;
  files: any[];
}

const STORAGE_KEYS = {
  CHATS: 'perplexica_chats',
  MESSAGES: 'perplexica_messages',
} as const;

/**
 * Get all chats from local storage
 */
export const getLocalChats = (): LocalChat[] => {
  try {
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    return chats ? JSON.parse(chats) : [];
  } catch (error) {
    console.error('Error reading chats from localStorage:', error);
    return [];
  }
};

/**
 * Save a chat to local storage
 */
export const saveLocalChat = (chat: LocalChat): void => {
  try {
    const chats = getLocalChats();
    const existingIndex = chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex >= 0) {
      chats[existingIndex] = chat;
    } else {
      chats.unshift(chat); // Add new chats to the beginning
    }
    
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chat to localStorage:', error);
  }
};

/**
 * Delete a chat and its messages from local storage
 */
export const deleteLocalChat = (chatId: string): void => {
  try {
    // Remove chat
    const chats = getLocalChats().filter(chat => chat.id !== chatId);
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    
    // Remove associated messages
    const messages = getLocalMessages().filter(msg => msg.chatId !== chatId);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  } catch (error) {
    console.error('Error deleting chat from localStorage:', error);
  }
};

/**
 * Get a specific chat by ID
 */
export const getLocalChatById = (chatId: string): LocalChat | null => {
  const chats = getLocalChats();
  return chats.find(chat => chat.id === chatId) || null;
};

/**
 * Get all messages from local storage
 */
export const getLocalMessages = (): LocalMessage[] => {
  try {
    const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('Error reading messages from localStorage:', error);
    return [];
  }
};

/**
 * Get messages for a specific chat
 */
export const getLocalMessagesByChatId = (chatId: string): LocalMessage[] => {
  return getLocalMessages().filter(msg => msg.chatId === chatId);
};

/**
 * Save a message to local storage
 */
export const saveLocalMessage = (message: LocalMessage): void => {
  try {
    const messages = getLocalMessages();
    const existingIndex = messages.findIndex(m => m.messageId === message.messageId);
    
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }
    
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving message to localStorage:', error);
  }
};

/**
 * Delete messages after a specific message ID for a chat (used for message regeneration)
 */
export const deleteLocalMessagesAfter = (chatId: string, afterMessageId: string): void => {
  try {
    const messages = getLocalMessages();
    const messageIndex = messages.findIndex(m => m.messageId === afterMessageId && m.chatId === chatId);
    
    if (messageIndex >= 0) {
      const filteredMessages = messages.filter((msg, index) => {
        if (msg.chatId !== chatId) return true; // Keep messages from other chats
        return index <= messageIndex; // Keep messages up to and including the target message
      });
      
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filteredMessages));
    }
  } catch (error) {
    console.error('Error deleting messages after messageId:', error);
  }
};

/**
 * Clear all local storage data
 */
export const clearLocalStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHATS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

/**
 * Find a chat with messages that exactly match the given content
 * Used for reusing existing search results when user asks the same question
 */
export const findLocalChatByContent = (content: string): {chat: LocalChat, messages: LocalMessage[]} | null => {
  try {
    const chats = getLocalChats();
    const allMessages = getLocalMessages();
    
    // Normalize content for comparison (trim whitespace and convert to lowercase)
    const normalizedContent = content.trim().toLowerCase();
    
    for (const chat of chats) {
      const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
      
      // Look for user messages that exactly match the search content
      const matchingUserMessage = chatMessages.find(msg => 
        msg.role === 'user' && 
        msg.content.trim().toLowerCase() === normalizedContent
      );
      
      if (matchingUserMessage) {
        return { chat, messages: chatMessages };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding chat by content:', error);
    return null;
  }
};

/**
 * Search chats by keyword in title and message content
 * Returns matching chats with their messages
 */
export const searchLocalChats = (keyword: string): {chat: LocalChat, messages: LocalMessage[]}[] => {
  try {
    if (!keyword.trim()) {
      // If no keyword, return all chats with their messages
      const chats = getLocalChats();
      const allMessages = getLocalMessages();
      return chats.map(chat => ({
        chat,
        messages: allMessages.filter(msg => msg.chatId === chat.id)
      }));
    }
    
    const chats = getLocalChats();
    const allMessages = getLocalMessages();
    const normalizedKeyword = keyword.trim().toLowerCase();
    const results: {chat: LocalChat, messages: LocalMessage[]}[] = [];
    
    for (const chat of chats) {
      const chatMessages = allMessages.filter(msg => msg.chatId === chat.id);
      
      // Check if keyword matches chat title
      const titleMatches = chat.title.toLowerCase().includes(normalizedKeyword);
      
      // Check if keyword matches any message content
      const messageMatches = chatMessages.some(msg => 
        msg.content.toLowerCase().includes(normalizedKeyword)
      );
      
      if (titleMatches || messageMatches) {
        results.push({ chat, messages: chatMessages });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching local chats:', error);
    return [];
  }
};

/**
 * Check if user search content matches existing history to reuse results
 * This function is used before making a new search request to avoid duplicated work
 * @param userQuery - The user's search query/question
 * @returns The chat ID if exact match found, null otherwise
 */
export const checkForDuplicateSearch = (userQuery: string): string | null => {
  try {
    const result = findLocalChatByContent(userQuery);
    return result ? result.chat.id : null;
  } catch (error) {
    console.error('Error checking for duplicate search:', error);
    return null;
  }
}; 