import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// System Prompt Template
const DEFAULT_SYSTEM_PROMPT = `
You are an **Intelligent Task Manager Assistant** and a **Strategic Secretary**.
Today is {TODAY}, current time is {NOW}.
Here is the team member list:
{USERS_LIST}

Your goal is to parse the user's natural language request into a structured task object while being **Contextually Aware**.

### Crucial Guidelines:
1. **Severity Detection**:
   - If the user reports a crisis, emergency, or major loss (e.g., "theft", "all items gone", "fire", "emergency repair"), you MUST set "priority" to **"High"** and include **Immediate Response Measures** in the "description".
   - Do NOT just create a dry task. Suggest an **Escalation** pathway in the description or clarification message.

2. **Task Extraction**:
   - **title**: A punchy, priority-reflecting title (e.g., "[URGENT] Inventory Loss Investigation").
   - **description**: Detailed steps. If it's a crisis, include "Action Items: 1. Secure area, 2. Notify Security, 3. Complete formal report."
   - assigneeName: The name of the person assigned (string, match EXACTLY one of the names from the provided user list below. Do NOT translate or change the spelling. Do NOT include '@').
   - dueDate: The due date in 'YYYY-MM-DD' format (calculate based on today)
   - priority: 'High', 'Medium', or 'Low' (infer from context, default Medium). (Default to High for any detected critical issue).

3. **Incomplete Requests**:
   - If the request is too vague, set "status" to "need_clarification" and ask proactive questions that help solve the problem (e.g., "Should I assign this to the Security Lead immediately?").

Return ONLY a JSON object. No markdown.
`;

export async function POST(req: Request) {
  try {
    const { prompt, history, attachments, action, taskData, templateId } = await req.json();

    // 1. Handle Commit Action (Direct DB Save)
    if (action === 'commit' && taskData) {
      const users = await prisma.user.findMany({ select: { id: true, name: true } });
      const normalize = (s: string) => s.replace(/[@\-\s\.]/g, "").toLowerCase();

      let rawName = taskData.assigneeName || "";
      // Handle potential @{Name} format from LLM
      const bracketMatch = rawName.match(/@{(.+)}/);
      if (bracketMatch) rawName = bracketMatch[1];

      const targetName = normalize(rawName);

      // Try exact normalized match first
      let matchedUser = users.find(u => normalize(u.name) === targetName);

      // Substring match fallback
      if (!matchedUser && targetName.length >= 2) {
        matchedUser = users.find(u =>
          normalize(u.name).includes(targetName) ||
          targetName.includes(normalize(u.name))
        );
      }

      console.log('Committing Task with data:', {
        rawName,
        targetName,
        matchedUser: matchedUser?.name
      });

      const newTask = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: 'Pending',
          priority: taskData.priority || 'Medium',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          assignee: matchedUser ? { connect: { id: matchedUser.id } } : undefined,
          attachments: attachments ? JSON.stringify(attachments) : null,
          template: (taskData.templateId || templateId) ? { connect: { id: taskData.templateId || templateId } } : undefined
        } as any
      });
      return NextResponse.json({ success: true, task: newTask });
    }

    if (!prompt && (!history || history.length === 0)) {
      return NextResponse.json({ error: 'Prompt or history is required' }, { status: 400 });
    }

    // 2. Fetch Settings & Users
    const settings = (await prisma.settings.findUnique({
      where: { id: 'global' },
      include: { llmConfigs: true }
    })) as any;
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });

    // Find config for current provider
    const currentConfig = settings?.llmConfigs?.find((c: any) => c.provider === settings?.llmProvider);
    const effectiveApiKey = currentConfig?.apiKey || settings?.llmApiKey;
    const effectiveModel = currentConfig?.model || settings?.llmModel;

    // 3. Prepare Context
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
    const usersListStr = users.map(u => `- ${u.name} (${u.role})`).join('\n');

    let templateContent = "";
    if (templateId) {
      const templateRecord = await (prisma as any).promptTemplate.findUnique({ where: { id: templateId } });
      if (templateRecord) {
        templateContent = `\n\nSpecific Requirements/Rules for this task:\n${templateRecord.content}`;
      }
    }

    const promptTemplate = settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const finalSystemPrompt = (promptTemplate + templateContent)
      .replace(/{TODAY}/g, today)
      .replace(/{NOW}/g, currentTime)
      .replace(/{USERS_LIST}/g, usersListStr);

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
    if (!effectiveApiKey && settings?.llmProvider === 'openai') {
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
          model: effectiveModel || 'gpt-4o',
          messages: [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: conversationContext }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'task_parsing_schema',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['success', 'need_clarification'] },
                  clarificationMessage: { type: ['string', 'null'] },
                  options: {
                    type: ['array', 'null'],
                    items: { type: 'string' }
                  },
                  title: { type: ['string', 'null'] },
                  description: { type: ['string', 'null'] },
                  assigneeName: { type: ['string', 'null'] },
                  dueDate: { type: ['string', 'null'] },
                  priority: { type: 'string', enum: ['High', 'Medium', 'Low'] }
                },
                required: ['status', 'clarificationMessage', 'options', 'title', 'description', 'assigneeName', 'dueDate', 'priority'],
                additionalProperties: false
              }
            }
          }
        };

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveApiKey || ''}`
          },
          body: JSON.stringify(requestBody)
        });

        let data = await res.json();
        if (!res.ok) {
          console.error('OpenAI Error:', JSON.stringify(data, null, 2));
          return NextResponse.json({ error: data.error?.message || 'Failed to call OpenAI' }, { status: res.status });
        }

        const content = data.choices?.[0]?.message?.content;
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
