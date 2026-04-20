import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://leetcode.com/api/problems/all/', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch from LeetCode');
    }

    const data = await response.json();
    
    // Transform data to a more manageable format if needed
    // The format provided by user is in data.stat_status_pairs
    const questions = data.stat_status_pairs.map((item: any) => ({
      id: item.stat.frontend_question_id,
      title: item.stat.question__title,
      slug: item.stat.question__title_slug,
      difficulty: item.difficulty.level, // 1: Easy, 2: Medium, 3: Hard
      isPaidOnly: item.paid_only,
      acceptance: (item.stat.total_acs / item.stat.total_submitted * 100).toFixed(1),
      totalAcs: item.stat.total_acs,
      totalSubmitted: item.stat.total_submitted,
    }));

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
