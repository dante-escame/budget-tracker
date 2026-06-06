import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { badRequest, unauthorized } from '@/lib/auth/http';
import { getBaseDataService } from '@/lib/base-data/runtime';
import { getCreditCardService } from '@/lib/credit-cards/runtime';
import { EmptyBillError } from '@/lib/credit-cards/service';
import { importBillSchema, parseMonthParam } from '@/lib/credit-cards/schemas';
import type { MonthFilter } from '@/lib/credit-cards/repository';

// Reject oversized uploads early. Fatura CSVs are tiny; 5 MB is generous.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const authService = await getAuthService();
  const { user } = await authService.peekRequestSession();

  if (!user) {
    return unauthorized('Authentication is required.');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Request must be multipart/form-data with a file.');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return badRequest('A CSV file is required in the "file" field.');
  }

  if (file.size === 0) {
    return badRequest('The uploaded file is empty.');
  }

  if (file.size > MAX_FILE_BYTES) {
    return badRequest('The uploaded file is too large.');
  }

  const isCsv =
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel' ||
    file.type === '' ||
    file.name.toLowerCase().endsWith('.csv');
  if (!isCsv) {
    return badRequest('Only CSV files are supported.');
  }

  const fields = importBillSchema.safeParse({
    cardLabel: formData.get('cardLabel'),
    billMonth: formData.get('billMonth'),
  });
  if (!fields.success) {
    return badRequest(fields.error.issues[0]?.message ?? 'Invalid import fields.');
  }

  const text = await file.text();
  const billMonth = parseMonthParam(fields.data.billMonth);

  // A bill belongs to a single month, so reject the whole import when it predates
  // the user's base month. No base data configured → no restriction.
  const baseDataService = await getBaseDataService();
  const baseData = await baseDataService.getBaseData(user.id);
  if (baseData && isBeforeMonth(billMonth, baseData.baseMonth)) {
    return badRequest('This bill is before your base month and cannot be imported.');
  }

  const service = await getCreditCardService();
  try {
    const summary = await service.importBill(user.id, {
      cardLabel: fields.data.cardLabel,
      billMonth,
      csvText: text,
    });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof EmptyBillError) {
      return badRequest(error.message);
    }
    throw error;
  }
}

// True when `month` falls strictly before `reference` (year-then-month order).
function isBeforeMonth(month: MonthFilter, reference: MonthFilter): boolean {
  return (
    month.year < reference.year ||
    (month.year === reference.year && month.month < reference.month)
  );
}
