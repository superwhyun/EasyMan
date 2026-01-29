import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// System Prompt Template
const DEFAULT_SYSTEM_PROMPT = `
You are a smart task manager assistant.
Today is {TODAY}, current time is {NOW}.
Here is the team member list:
{USERS_LIST}

Your goal is to parse the user's natural language request into a structured task object.

If the user's request is insufficient to create a task (e.g., missing what to do, or it's just a greeting), set "status" to "need_clarification" and provide a helpful question in "clarificationMessage".
Furthermore, if there are specific candidate choices (like team member names if the assignee is ambiguous), provide them in "options".

Otherwise, set "status" to "success".

Extract the following fields for the task:
- title: A concise, catchy title for the task (string)
- description: A detailed explanation of the task (string, extract more info from the user request)
- assigneeName: The name of the person assigned (string, try to match from the list)
- dueDate: The due date in 'YYYY-MM-DD' format (calculate based on today)
- priority: 'High', 'Medium', or 'Low' (infer from context, default Medium)

Return ONLY a JSON object. No markdown, no explanations.
`;

export async function POST(req: Request) {
  try {
    const { prompt, history, attachments, action, taskData } = await req.json();

    // 1. Handle Commit Action (Direct DB Save)
    if (action === 'commit' && taskData) {
      const users = await prisma.user.findMany({ select: { id: true, name: true } });
      const matchedUser = users.find(u => u.name === taskData.assigneeName);

      const newTask = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: 'Pending',
          priority: taskData.priority || 'Medium',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          assignee: matchedUser ? { connect: { id: matchedUser.id } } : undefined,
          attachments: attachments ? JSON.stringify(attachments) : null
        }
      });
      return NextResponse.json({ success: true, task: newTask });
    }

    if (!prompt && (!history || history.length === 0)) {
      return NextResponse.json({ error: 'Prompt or history is required' }, { status: 400 });
    }

    // 2. Fetch Settings & Users
    const settings = (await prisma.settings.findUnique({ where: { id: 'global' } })) as any;
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });

    // 3. Prepare Context
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    const usersListStr = users.map(u => `- ${u.name} (${u.role})`).join('\n');

    const promptTemplate = settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const finalSystemPrompt = promptTemplate
      .replace('{TODAY}', today)
      .replace('{NOW}', currentTime)
      .replace('{USERS_LIST}', usersListStr);

    let conversationContext = '';
    if (history && history.length > 0) {
      conversationContext = "Conversation History:\n" +
        history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') +
        `\nUser: ${prompt}`;
    } else {
      conversationContext = `User Request: ${prompt}`;
    }

    // Mention attachments if any
    if (attachments && attachments.length > 0) {
      const fileNames = attachments.map((a: any) => a.name).join(', ');
      conversationContext += `\n(Attachments present: ${fileNames})`;
    }

    let aiResponse;

    // 4. Call LLM
    if (!settings?.llmApiKey && settings?.llmProvider === 'openai') {
      console.warn("No API Key found. Using Mock Response.");
      const mockAssignee = users.find(u => prompt.includes(u.name.split(' ')[0])) || users[0];
      aiResponse = {
        status: "success",
        title: prompt.slice(0, 50),
        description: prompt,
        assigneeName: mockAssignee.name,
        dueDate: today,
        priority: "Medium"
      };
    } else {
      // Real API Call
      if (settings?.llmProvider === 'openai') {
        const requestBody = {
          model: settings.llmModel || 'gpt-5.2',
          input: `${finalSystemPrompt}\n\n${conversationContext}`,
          text: {
            format: {
              type: 'json_schema',
              name: 'task_parsing_schema',
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['success', 'need_clarification'] },
                  clarificationMessage: { type: ['string', 'null'], description: 'Question to ask if info is missing' },
                  options: {
                    type: ['array', 'null'],
                    items: { type: 'string' },
                    description: 'Suggested options for the user to pick from'
                  },
                  title: { type: ['string', 'null'], description: 'A concise title for the task' },
                  description: { type: ['string', 'null'], description: 'Detailed task description' },
                  assigneeName: { type: ['string', 'null'], description: 'The name of the person assigned' },
                  dueDate: { type: ['string', 'null'], description: 'The due date in YYYY-MM-DD format' },
                  priority: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                },
                required: ['status', 'clarificationMessage', 'options', 'title', 'description', 'assigneeName', 'dueDate', 'priority'],
                additionalProperties: false
              }
            }
          }
        };

        const res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.llmApiKey || ''}`
          },
          body: JSON.stringify(requestBody)
        });

        let data = await res.json();
        if (!res.ok) {
          console.error('OpenAI Error:', JSON.stringify(data, null, 2));
          return NextResponse.json({ error: data.error?.message || 'Failed to call OpenAI' }, { status: res.status });
        }

        const content = data.output?.[0]?.content?.[0]?.text;
        aiResponse = JSON.parse(content || '{}');

      } else {
        return NextResponse.json({ error: 'Provider fallback not implemented for options yet' }, { status: 501 });
      }
    }

    // 5. Handle Clarification
    if (aiResponse.status === 'need_clarification') {
      return NextResponse.json({
        success: true,
        needsClarification: true,
        message: aiResponse.clarificationMessage || "Can you provide more details?",
        options: aiResponse.options || []
      });
    }

    // 6. Return Parsed Data for Confirmation
    return NextResponse.json({
      success: true,
      needsConfirmation: true,
      taskData: aiResponse
    });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
