/**
 * OpenAI Function Calling Tools for Engezna Smart Assistant
 * These tools allow the AI to query the database
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const tools: ChatCompletionTool[] = [
  // 1. Get customer name for personalized greeting
  {
    type: 'function',
    function: {
      name: 'get_customer_name',
      description: 'Get customer name for personalized greeting',
      parameters: {
        type: 'object',
        properties: {
          customer_id: {
            type: 'string',
            description: 'Customer UUID',
          },
        },
        required: ['customer_id'],
      },
    },
  },

  // 2. Get available categories in the city
  {
    type: 'function',
    function: {
      name: 'get_available_categories_in_city',
      description: 'Return provider categories that have open providers in the city. Use this to show only categories with actual providers.',
      parameters: {
        type: 'object',
        properties: {
          city_id: {
            type: 'string',
            description: 'City UUID - REQUIRED for all queries',
          },
        },
        required: ['city_id'],
      },
    },
  },

  // 3. Search providers in city
  {
    type: 'function',
    function: {
      name: 'search_providers',
      description: 'Search for providers (restaurants, supermarkets, etc.) in the customer city. Can filter by category or search by name.',
      parameters: {
        type: 'object',
        properties: {
          city_id: {
            type: 'string',
            description: 'City UUID - REQUIRED',
          },
          category: {
            type: 'string',
            description: 'Provider category code: restaurant_cafe, grocery, coffee_patisserie, vegetables_fruits',
          },
          query: {
            type: 'string',
            description: 'Search query for provider name (Arabic)',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 10)',
          },
        },
        required: ['city_id'],
      },
    },
  },

  // 4. Get provider menu
  {
    type: 'function',
    function: {
      name: 'get_provider_menu',
      description: 'Get available menu items for a specific provider. Only returns items that are available and in stock.',
      parameters: {
        type: 'object',
        properties: {
          provider_id: {
            type: 'string',
            description: 'Provider UUID',
          },
          limit: {
            type: 'number',
            description: 'Max items to return (default 12)',
          },
        },
        required: ['provider_id'],
      },
    },
  },

  // 5. Search within provider menu
  {
    type: 'function',
    function: {
      name: 'search_in_provider',
      description: 'Search for specific items within a provider menu by name',
      parameters: {
        type: 'object',
        properties: {
          provider_id: {
            type: 'string',
            description: 'Provider UUID',
          },
          query: {
            type: 'string',
            description: 'Search query for item name (Arabic)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 8)',
          },
        },
        required: ['provider_id', 'query'],
      },
    },
  },

  // 6. Get menu item details
  {
    type: 'function',
    function: {
      name: 'get_menu_item_details',
      description: 'Get full details of a menu item including price, description, and whether it has variants',
      parameters: {
        type: 'object',
        properties: {
          menu_item_id: {
            type: 'string',
            description: 'Menu item UUID',
          },
        },
        required: ['menu_item_id'],
      },
    },
  },

  // 7. Get item variants
  {
    type: 'function',
    function: {
      name: 'get_item_variants',
      description: 'Get available variants for a menu item (sizes, options, etc.). Use when has_variants=true or pricing_type=variants',
      parameters: {
        type: 'object',
        properties: {
          menu_item_id: {
            type: 'string',
            description: 'Menu item UUID (maps to product_id in variants table)',
          },
          limit: {
            type: 'number',
            description: 'Max variants (default 12)',
          },
        },
        required: ['menu_item_id'],
      },
    },
  },

  // 8. Get variant details
  {
    type: 'function',
    function: {
      name: 'get_variant_details',
      description: 'Get full details of a specific variant including price',
      parameters: {
        type: 'object',
        properties: {
          variant_id: {
            type: 'string',
            description: 'Variant UUID',
          },
        },
        required: ['variant_id'],
      },
    },
  },

  // 9. Get promotions
  {
    type: 'function',
    function: {
      name: 'get_promotions',
      description: 'Get active promotions. Can filter by provider or show all in city.',
      parameters: {
        type: 'object',
        properties: {
          city_id: {
            type: 'string',
            description: 'City UUID for filtering promotions',
          },
          provider_id: {
            type: 'string',
            description: 'Optional: filter promotions for specific provider',
          },
          limit: {
            type: 'number',
            description: 'Max promotions (default 10)',
          },
        },
        required: [],
      },
    },
  },

  // 10. Search product across all providers in city
  {
    type: 'function',
    function: {
      name: 'search_product_in_city',
      description: 'Search for a product across all providers in the city. Use when user wants something but hasn\'t chosen a provider yet.',
      parameters: {
        type: 'object',
        properties: {
          city_id: {
            type: 'string',
            description: 'City UUID - REQUIRED',
          },
          query: {
            type: 'string',
            description: 'Product name to search (Arabic)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10)',
          },
        },
        required: ['city_id', 'query'],
      },
    },
  },
];

export default tools;
