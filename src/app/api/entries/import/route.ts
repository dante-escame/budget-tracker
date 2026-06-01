import { NextResponse } from 'next/server';

import { getAuthService } from '@/lib/auth/runtime';
import { badRequest, unauthorized } from '@/lib/auth/http';
import { getEntryService } from '@/lib/entries/runtime';
import { EmptyStatementError } from '@/lib/entries/service';

// Reject oversized uploads early. Statement CSVs are tiny; 5 MB is generous.
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

  const text = await file.text();

  const entryService = await getEntryService();
  try {
    const summary = await entryService.importStatement(user.id, text);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof EmptyStatementError) {
      return badRequest(error.message);
    }

    throw error;
  }
}
