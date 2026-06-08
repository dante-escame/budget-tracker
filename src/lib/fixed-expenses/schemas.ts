import { z } from 'zod';

// Body for marking / unmarking a statement entry as a fixed expense.
export const markFixedSchema = z.object({
  entryId: z.string().min(1, 'entryId is required.'),
});

export type MarkFixedFields = z.infer<typeof markFixedSchema>;
