# Claude Code Guidelines for Engezna

## Code Formatting (Prettier)

This project uses Prettier for code formatting. **Before committing any changes**, always run Prettier to ensure consistent formatting and avoid CI failures.

### Commands

```bash
# Format all files
npx prettier --write .

# Format specific files
npx prettier --write "src/app/[locale]/path/to/file.tsx"

# Check formatting without modifying files
npx prettier --check .
```

### Important Notes

1. **Always run Prettier before committing** - The CI pipeline will fail if files are not properly formatted
2. **Format only modified files** - To save time, you can format specific files you've changed
3. **Check before pushing** - Use `npx prettier --check .` to verify formatting without making changes

### Common Prettier Issues

- Long lines that need wrapping
- Inconsistent quote styles
- Missing/extra trailing commas
- Incorrect indentation

### VS Code Integration

If using VS Code, install the Prettier extension and enable "Format on Save" for automatic formatting.

## Database Notes

### Order Status Enum

The `order_status` enum only contains the following values:
- `delivered`

When querying orders by status, use `.eq('status', 'delivered')` instead of invalid values like `'completed'` or `'customer_confirmed'`.

## RLS (Row Level Security)

- Customer-side queries are restricted by RLS policies
- To access data across all users (like "Most Popular" items), use server-side queries in page.tsx components
- Server-side queries bypass RLS restrictions

## Image Upload Standards

Product images should follow these standards:
- **Aspect Ratio**: 1:1 (square)
- **Recommended Size**: 800x800 pixels
- **Minimum Size**: 400x400 pixels
- **Max File Size**: 3MB
- **Accepted Formats**: JPEG, PNG, WebP
