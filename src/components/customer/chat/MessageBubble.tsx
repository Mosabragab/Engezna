/**
 * MessageBubble - Chat message bubble component
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatProduct } from '@/types/chat';
import { ProductSuggestionCard } from './ProductSuggestionCard';
import { SuggestionChips } from './SuggestionChips';

interface MessageBubbleProps {
  message: ChatMessage;
  onSuggestionClick?: (suggestion: string) => void;
  onAddToCart?: (product: ChatProduct) => void;
  isStreaming?: boolean;
  streamingContent?: string;
}

/**
 * Parse AI response that might be JSON
 * Extract text and suggestions from JSON format
 */
function parseAIResponse(content: string): {
  text: string;
  suggestions?: string[];
  actions?: string[];
} {
  // If it's empty, return empty
  if (!content || !content.trim()) {
    return { text: '' };
  }

  // Try to parse as JSON
  try {
    // Check if content looks like JSON (starts with { or contains "text":)
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.includes('"text"')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.text) {
        return {
          text: parsed.text,
          suggestions: parsed.suggestions,
          actions: parsed.actions,
        };
      }
    }
  } catch {
    // Not valid JSON, continue
  }

  // Check if it's a partial JSON that starts with { but isn't complete
  if (content.trim().startsWith('{') && content.includes('"text"')) {
    // Try to extract text field manually
    const textMatch = content.match(/"text"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/);
    if (textMatch) {
      // Unescape the text
      const text = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

      // Try to extract suggestions
      const suggestionsMatch = content.match(/"suggestions"\s*:\s*\[([^\]]*)\]/);
      let suggestions: string[] | undefined;
      if (suggestionsMatch) {
        suggestions = suggestionsMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/"/g, '').replace(/'/g, ''))
          .filter((s) => s.length > 0);
      }

      return { text, suggestions };
    }
  }

  // Return as-is if not JSON
  return { text: content };
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onSuggestionClick,
  onAddToCart,
  isStreaming = false,
  streamingContent = '',
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Parse the content - extract text from JSON if needed
  const rawContent = isStreaming ? streamingContent : message.content;
  const parsed = isUser ? { text: rawContent } : parseAIResponse(rawContent);
  const content = parsed.text;

  // Merge parsed suggestions with message suggestions
  const allSuggestions = message.suggestions || parsed.suggestions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-2 max-w-full',
        isUser ? 'flex-row' : 'flex-row-reverse' // RTL: user on right, assistant on left
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-gray-200' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col gap-2 max-w-[85%]', isUser ? 'items-start' : 'items-end')}>
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          )}
        >
          {/* Message text with proper line breaks */}
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>

          {/* Streaming indicator */}
          {isStreaming && <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />}
        </div>

        {/* Products */}
        {!isUser && message.products && message.products.length > 0 && (
          <div className="w-full space-y-2">
            {message.products.slice(0, 3).map((product) => (
              <ProductSuggestionCard
                key={product.id}
                product={product}
                onAddToCart={() => onAddToCart?.(product)}
              />
            ))}
          </div>
        )}

        {/* Suggestions - use parsed or message suggestions */}
        {!isUser && allSuggestions && allSuggestions.length > 0 && !isStreaming && (
          <SuggestionChips suggestions={allSuggestions} onSelect={onSuggestionClick} />
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
