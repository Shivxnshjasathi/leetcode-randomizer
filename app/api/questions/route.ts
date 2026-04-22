import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const V2_PATH = path.join(process.cwd(), 'assets', 'question_v2.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const tag = searchParams.get('tag');
    const limitParam = searchParams.get('limit');
    const random = searchParams.get('random') === 'true';
    const searchOnly = searchParams.get('search_only') === 'true';

    if (!fs.existsSync(V2_PATH)) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(V2_PATH, 'utf-8');
    let questions = JSON.parse(fileContent);

    // If search_only, we just want a lightweight list for the modal
    if (searchOnly) {
      const lightweight = questions.map((q: any) => ({
        frontendQuestionId: q.frontendQuestionId,
        title: q.title,
        difficulty: q.difficulty
      }));
      return NextResponse.json(lightweight);
    }

    // Apply filters on server
    if (difficulty && difficulty !== 'All') {
      questions = questions.filter((q: any) => q.difficulty === difficulty);
    }
    if (tag && tag !== 'All Tags') {
      // Handle both v1/v2 tag structures if they exist
      questions = questions.filter((q: any) => 
        (q.topicTags?.some((t: any) => t.name === tag)) || 
        (q.topics?.includes(tag))
      );
    }

    // Randomize if requested
    if (random) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Limit results
    const limit = limitParam === 'all' ? questions.length : parseInt(limitParam || '50');
    const result = questions.slice(0, limit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
