import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// V2 is the single source of truth
const V2_PATH = path.join(process.cwd(), 'assets', 'question_v2.json');

export async function GET() {
  try {
    if (!fs.existsSync(V2_PATH)) {
      return NextResponse.json({ error: 'question_v2.json not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(V2_PATH, 'utf-8');
    const questions = JSON.parse(fileContent);

    return NextResponse.json(questions);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to read questions' }, { status: 500 });
  }
}
