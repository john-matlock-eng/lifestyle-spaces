/**
 * Repeatable Field Components
 *
 * Dynamic field components that allow users to add multiple items.
 *
 * @module form-fields/repeatable
 */

// Components
export { RepeatableBlockField, default as RepeatableBlockFieldDefault } from './RepeatableBlockField'
export { RepeatableInlineField, default as RepeatableInlineFieldDefault } from './RepeatableInlineField'
export { RepeatableRatingField, default as RepeatableRatingFieldDefault } from './RepeatableRatingField'

// Utilities
export {
  generateItemId,
  reorderItems,
  moveItemUp,
  moveItemDown,
  validateItemCount,
  createNewItem,
  removeItemAt,
  insertItemAt,
  updateItemAt,
  getItemTitle,
  hasDuplicateIds,
  ensureUniqueIds,
  type ValidationResult,
} from './utils'
