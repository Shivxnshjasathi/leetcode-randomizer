import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const JSON_PATH = path.join(process.cwd(), 'assets', 'questions.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldSync = searchParams.get('sync') === 'true';

  try {
    // 1. Always read local JSON first
    let localQuestions: any[] = [];
    if (fs.existsSync(JSON_PATH)) {
      const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
      localQuestions = JSON.parse(fileContent);
    }

    // 2. If sync is requested, fetch from LeetCode and find updates
    if (shouldSync) {
      const response = await fetch('https://leetcode.com/api/problems/all/', {
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        const apiQuestions = data.stat_status_pairs.map((item: any) => ({
          id: item.stat.frontend_question_id,
          title: item.stat.question__title,
          slug: item.stat.question__title_slug,
          difficulty: item.difficulty.level, 
          isPaidOnly: item.paid_only,
          acceptance: (item.stat.total_acs / item.stat.total_submitted * 100).toFixed(1)
        }));

        // Identify only NEW questions that are NOT in localQuestions
        const localIds = new Set(localQuestions.map((q: any) => q.id));
        const newQuestions = apiQuestions.filter((q: any) => !localIds.has(q.id));

        if (newQuestions.length > 0) {
          const updatedList = [...localQuestions, ...newQuestions];
          // Update local JSON with merged data
          fs.writeFileSync(JSON_PATH, JSON.stringify(updatedList, null, 2));
          localQuestions = updatedList;
        }
      }
    }

    return NextResponse.json(localQuestions);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to process questions' }, { status: 500 });
  }
}
