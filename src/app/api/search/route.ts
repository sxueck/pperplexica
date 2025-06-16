import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { ChatOpenAI } from '@langchain/openai';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '@/lib/providers';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { MetaSearchAgentType } from '@/lib/search/metaSearchAgent';
import {
  getCustomOpenaiApiKey,
  getCustomOpenaiApiUrl,
  getCustomOpenaiModelName,
  getLibraryStorage,
  getForcedChatModelProvider,
  getForcedEmbeddingModelProvider,
} from '@/lib/config';
import { searchHandlers } from '@/lib/search';
import { selectProvider } from '@/lib/providers';

interface chatModel {
  provider: string;
  name: string;
  customOpenAIKey?: string;
  customOpenAIBaseURL?: string;
}

interface embeddingModel {
  provider: string;
  name: string;
}

interface ChatRequestBody {
  optimizationMode: 'speed' | 'balanced' | 'quality';
  focusMode: string;
  chatModel?: chatModel;
  embeddingModel?: embeddingModel;
  query: string;
  history: Array<[string, string]>;
  stream?: boolean;
  systemInstructions?: string;
}

export const POST = async (req: Request) => {
  try {
    const body: ChatRequestBody = await req.json();

    if (!body.focusMode || !body.query) {
      return Response.json(
        { message: 'Missing focus mode or query' },
        { status: 400 },
      );
    }

    body.history = body.history || [];
    body.optimizationMode = body.optimizationMode || 'balanced';
    body.stream = body.stream || false;

    // Check for duplicate search in local storage before processing
    try {
      const libraryStorage = getLibraryStorage();
      if (libraryStorage === 'local') {
        // Only check for duplicates in local storage mode
        // Import dynamically to avoid client-side errors
        const { checkForDuplicateSearch } = await import('@/lib/storage/localStorage');
        const existingChatId = checkForDuplicateSearch(body.query);
        
        if (existingChatId) {
          // Found existing chat with same query, return redirect information
          return Response.json({
            type: 'redirect',
            chatId: existingChatId,
            message: 'find the same search history',
          }, { status: 200 });
        }
      }
    } catch (error) {
      // If duplicate check fails, just continue with normal search
      console.warn('Duplicate search check failed, continuing with normal search:', error);
    }

    const history: BaseMessage[] = body.history.map((msg) => {
      return msg[0] === 'human'
        ? new HumanMessage({ content: msg[1] })
        : new AIMessage({ content: msg[1] });
    });

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    // Use shared provider selection logic
    const forcedChatProvider = getForcedChatModelProvider();
    const forcedEmbeddingProvider = getForcedEmbeddingModelProvider();
    
    const chatModelProvider = selectProvider(
      body.chatModel?.provider,
      Object.keys(chatModelProviders),
      forcedChatProvider
    );
    const chatModel =
      body.chatModel?.name ||
      Object.keys(chatModelProviders[chatModelProvider])[0];

    const embeddingModelProvider = selectProvider(
      body.embeddingModel?.provider,
      Object.keys(embeddingModelProviders),
      forcedEmbeddingProvider
    );
    const embeddingModel =
      body.embeddingModel?.name ||
      Object.keys(embeddingModelProviders[embeddingModelProvider])[0];

    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;

    if (chatModelProvider === 'custom_openai') {
      llm = new ChatOpenAI({
        modelName: body.chatModel?.name || getCustomOpenaiModelName(),
        openAIApiKey:
          body.chatModel?.customOpenAIKey || getCustomOpenaiApiKey(),
        temperature: 0.7,
        configuration: {
          baseURL:
            body.chatModel?.customOpenAIBaseURL || getCustomOpenaiApiUrl(),
        },
      }) as unknown as BaseChatModel;
    } else if (
      chatModelProviders[chatModelProvider] &&
      chatModelProviders[chatModelProvider][chatModel]
    ) {
      llm = chatModelProviders[chatModelProvider][chatModel]
        .model as unknown as BaseChatModel | undefined;
    }

    if (
      embeddingModelProviders[embeddingModelProvider] &&
      embeddingModelProviders[embeddingModelProvider][embeddingModel]
    ) {
      embeddings = embeddingModelProviders[embeddingModelProvider][
        embeddingModel
      ].model as Embeddings | undefined;
    }

    if (!llm || !embeddings) {
      return Response.json(
        { message: 'Invalid model selected' },
        { status: 400 },
      );
    }

    const searchHandler: MetaSearchAgentType = searchHandlers[body.focusMode];

    if (!searchHandler) {
      return Response.json({ message: 'Invalid focus mode' }, { status: 400 });
    }

    const emitter = await searchHandler.searchAndAnswer(
      body.query,
      history,
      llm,
      embeddings,
      body.optimizationMode,
      [],
      body.systemInstructions || '',
    );

    if (!body.stream) {
      return new Promise(
        (
          resolve: (value: Response) => void,
          reject: (value: Response) => void,
        ) => {
          let message = '';
          let sources: any[] = [];

          emitter.on('data', (data: string) => {
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.type === 'response') {
                message += parsedData.data;
              } else if (parsedData.type === 'sources') {
                sources = parsedData.data;
              }
            } catch (error) {
              reject(
                Response.json(
                  { message: 'Error parsing data' },
                  { status: 500 },
                ),
              );
            }
          });

          emitter.on('end', () => {
            resolve(Response.json({ message, sources }, { status: 200 }));
          });

          emitter.on('error', (error: any) => {
            reject(
              Response.json(
                { message: 'Search error', error },
                { status: 500 },
              ),
            );
          });
        },
      );
    }

    const encoder = new TextEncoder();

    const abortController = new AbortController();
    const { signal } = abortController;

    const stream = new ReadableStream({
      start(controller) {
        let sources: any[] = [];

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'init',
              data: 'Stream connected',
            }) + '\n',
          ),
        );

        signal.addEventListener('abort', () => {
          emitter.removeAllListeners();

          try {
            controller.close();
          } catch (error) {}
        });

        emitter.on('data', (data: string) => {
          if (signal.aborted) return;

          try {
            const parsedData = JSON.parse(data);

            if (parsedData.type === 'response') {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'response',
                    data: parsedData.data,
                  }) + '\n',
                ),
              );
            } else if (parsedData.type === 'sources') {
              sources = parsedData.data;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'sources',
                    data: sources,
                  }) + '\n',
                ),
              );
            }
          } catch (error) {
            controller.error(error);
          }
        });

        emitter.on('end', () => {
          if (signal.aborted) return;

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'done',
              }) + '\n',
            ),
          );
          controller.close();
        });

        emitter.on('error', (error: any) => {
          if (signal.aborted) return;

          controller.error(error);
        });
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error(`Error in getting search results: ${err.message}`);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
