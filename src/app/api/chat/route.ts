import prompts from '@/lib/prompts';
import MetaSearchAgent from '@/lib/search/metaSearchAgent';
import crypto from 'crypto';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { EventEmitter } from 'stream';
import {
  chatModelProviders,
  embeddingModelProviders,
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import db from '@/lib/db';
import { chats, messages as messagesSchema } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { getFileDetails } from '@/lib/utils/files';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
  getLibraryStorage,
} from '@/lib/config';
import { searchHandlers } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Message = {
  messageId: string;
  chatId: string;
  content: string;
};

type ChatModel = {
  provider: string;
  name: string;
};

type EmbeddingModel = {
  provider: string;
  name: string;
};

type Body = {
  message: Message;
  optimizationMode: 'speed' | 'balanced' | 'quality';
  focusMode: string;
  history: Array<[string, string]>;
  files: Array<string>;
  chatModel: ChatModel;
  embeddingModel: EmbeddingModel;
  systemInstructions: string;
};

const handleEmitterEvents = async (
  stream: EventEmitter,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  aiMessageId: string,
  chatId: string,
) => {
  let recievedMessage = '';
  let sources: any[] = [];
  const libraryStorage = getLibraryStorage();

  stream.on('data', (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'response') {
      writer.write(
        encoder.encode(
          JSON.stringify({
            type: 'message',
            data: parsedData.data,
            messageId: aiMessageId,
          }) + '\n',
        ),
      );

      recievedMessage += parsedData.data;
    } else if (parsedData.type === 'sources') {
      writer.write(
        encoder.encode(
          JSON.stringify({
            type: 'sources',
            data: parsedData.data,
            messageId: aiMessageId,
          }) + '\n',
        ),
      );

      sources = parsedData.data;
    }
  });
  stream.on('end', () => {
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'messageEnd',
          messageId: aiMessageId,
        }) + '\n',
      ),
    );
    writer.close();

    // Only save to database if using sqlite storage
    if (libraryStorage === 'sqlite') {
      db.insert(messagesSchema)
        .values({
          content: recievedMessage,
          chatId: chatId,
          messageId: aiMessageId,
          role: 'assistant',
          metadata: JSON.stringify({
            createdAt: new Date(),
            ...(sources && sources.length > 0 && { sources }),
          }),
        })
        .execute();
    }
  });
  stream.on('error', (data) => {
    const parsedData = JSON.parse(data);
    writer.write(
      encoder.encode(
        JSON.stringify({
          type: 'error',
          data: parsedData.data,
        }),
      ),
    );
    writer.close();
  });
};

const handleHistorySave = async (
  message: Message,
  humanMessageId: string,
  focusMode: string,
  files: string[],
) => {
  const libraryStorage = getLibraryStorage();
  
  // Only save to database if using sqlite storage
  if (libraryStorage !== 'sqlite') {
    return;
  }

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, message.chatId),
  });

  if (!chat) {
    await db
      .insert(chats)
      .values({
        id: message.chatId,
        title: message.content,
        createdAt: new Date().toString(),
        focusMode: focusMode,
        files: files.map(getFileDetails),
      })
      .execute();
  }

  const messageExists = await db.query.messages.findFirst({
    where: eq(messagesSchema.messageId, humanMessageId),
  });

  if (!messageExists) {
    await db
      .insert(messagesSchema)
      .values({
        content: message.content,
        chatId: message.chatId,
        messageId: humanMessageId,
        role: 'user',
        metadata: JSON.stringify({
          createdAt: new Date(),
        }),
      })
      .execute();
  } else {
    await db
      .delete(messagesSchema)
      .where(
        and(
          gt(messagesSchema.id, messageExists.id),
          eq(messagesSchema.chatId, message.chatId),
        ),
      )
      .execute();
  }
};

export const POST = async (req: Request) => {
  let body: Body;
  
  try {
    console.log('[API/CHAT] Parsing incoming request...');
    body = (await req.json()) as Body;
  } catch (parseError) {
    console.error('[API/CHAT] Failed to parse JSON request body:', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      contentType: req.headers.get('content-type')
    });
    return Response.json(
      { message: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  try {
    const { message } = body;

    console.log('[API/CHAT] Incoming request body:', {
      messageContent: message?.content?.substring(0, 100) + (message?.content?.length > 100 ? '...' : ''),
      messageId: message?.messageId,
      chatId: message?.chatId,
      focusMode: body.focusMode,
      optimizationMode: body.optimizationMode,
      chatModel: body.chatModel,
      embeddingModel: body.embeddingModel,
      hasFiles: body.files?.length > 0,
      filesCount: body.files?.length || 0,
      historyLength: body.history?.length || 0
    });

    if (!message) {
      console.error('[API/CHAT] Missing message object in request body');
      return Response.json(
        {
          message: 'Missing message object',
        },
        { status: 400 },
      );
    }

    if (message.content === '') {
      console.error('[API/CHAT] Empty message content provided');
      return Response.json(
        {
          message: 'Please provide a message to process',
        },
        { status: 400 },
      );
    }

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    console.log('[API/CHAT] Available providers:', {
      chatModelProviders: Object.keys(chatModelProviders),
      embeddingModelProviders: Object.keys(embeddingModelProviders)
    });

    const chatModelProvider =
      chatModelProviders[
        body.chatModel?.provider || Object.keys(chatModelProviders)[0]
      ];
    const chatModel =
      chatModelProvider?.[
        body.chatModel?.name || Object.keys(chatModelProvider || {})[0]
      ];

    const embeddingProvider =
      embeddingModelProviders[
        body.embeddingModel?.provider || Object.keys(embeddingModelProviders)[0]
      ];
    const embeddingModel =
      embeddingProvider?.[
        body.embeddingModel?.name || Object.keys(embeddingProvider || {})[0]
      ];

    console.log('[API/CHAT] Selected models:', {
      chatModelProvider: body.chatModel?.provider || Object.keys(chatModelProviders)[0],
      chatModelName: body.chatModel?.name || Object.keys(chatModelProvider || {})[0],
      embeddingProvider: body.embeddingModel?.provider || Object.keys(embeddingModelProviders)[0],
      embeddingModelName: body.embeddingModel?.name || Object.keys(embeddingProvider || {})[0],
      chatModelExists: !!chatModel,
      embeddingModelExists: !!embeddingModel
    });

    let llm: BaseChatModel | undefined;
    let embedding = embeddingModel.model;

    if (body.chatModel?.provider === 'custom_openai') {
      llm = new ChatOpenAI({
        openAIApiKey: getCustomOpenaiApiKey(),
        modelName: getCustomOpenaiModelName(),
        temperature: 0.7,
        configuration: {
          baseURL: getCustomOpenaiApiUrl(),
        },
      }) as unknown as BaseChatModel;
    } else if (chatModelProvider && chatModel) {
      llm = chatModel.model;
    }

    if (!llm) {
      console.error('[API/CHAT] Failed to initialize chat model:', {
        provider: body.chatModel?.provider,
        name: body.chatModel?.name,
        availableProviders: Object.keys(chatModelProviders),
        selectedProvider: body.chatModel?.provider || Object.keys(chatModelProviders)[0]
      });
      return Response.json({ error: 'Invalid chat model' }, { status: 400 });
    }

    if (!embedding) {
      console.error('[API/CHAT] Failed to initialize embedding model:', {
        provider: body.embeddingModel?.provider,
        name: body.embeddingModel?.name,
        availableProviders: Object.keys(embeddingModelProviders),
        selectedProvider: body.embeddingModel?.provider || Object.keys(embeddingModelProviders)[0]
      });
      return Response.json(
        { error: 'Invalid embedding model' },
        { status: 400 },
      );
    }

    const humanMessageId =
      message.messageId ?? crypto.randomBytes(7).toString('hex');
    const aiMessageId = crypto.randomBytes(7).toString('hex');

    const history: BaseMessage[] = body.history.map((msg) => {
      if (msg[0] === 'human') {
        return new HumanMessage({
          content: msg[1],
        });
      } else {
        return new AIMessage({
          content: msg[1],
        });
      }
    });

    console.log('[API/CHAT] Focus mode selection:', {
      requestedFocusMode: body.focusMode,
      availableFocusModes: Object.keys(searchHandlers)
    });

    const handler = searchHandlers[body.focusMode];

    if (!handler) {
      console.error('[API/CHAT] Invalid focus mode:', {
        requested: body.focusMode,
        available: Object.keys(searchHandlers)
      });
      return Response.json(
        {
          message: 'Invalid focus mode',
        },
        { status: 400 },
      );
    }

    console.log('[API/CHAT] Starting search and answer process...');
    
    const stream = await handler.searchAndAnswer(
      message.content,
      history,
      llm,
      embedding,
      body.optimizationMode,
      body.files,
      body.systemInstructions,
    );

    console.log('[API/CHAT] Search completed, setting up response stream...');

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    handleEmitterEvents(stream, writer, encoder, aiMessageId, message.chatId);
    handleHistorySave(message, humanMessageId, body.focusMode, body.files);

    console.log('[API/CHAT] Response stream ready, sending to client');

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    console.error('[API/CHAT] Error occurred while processing chat request:', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      name: err instanceof Error ? err.name : undefined
    });
    return Response.json(
      { message: 'An error occurred while processing chat request' },
      { status: 500 },
    );
  }
};
