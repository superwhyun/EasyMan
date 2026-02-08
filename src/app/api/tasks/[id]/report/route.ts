import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PROGRESS_SYSTEM_PROMPT = `
You are an **Intelligent Task Assistant** acting as a **Strategic Secretary**.

Today is {TODAY}, current time is {NOW}.

Current Task Context:
- Title: {TITLE}
- Description: {DESCRIPTION}
- Status: {STATUS}
- Progress: {PROGRESS}%
- Priority: {PRIORITY}
- Assignee: {ASSIGNEE}
- Due Date: {DUE_DATE}

Existing Accomplishments:
{EXISTING_ACCOMPLISHMENTS}

Your Guidelines:
1. **Scenario-Based Processing (CRITICAL)**:
   You must identify which scenario the user is reporting and respond accordingly.

   **Scenario A: Task Transfer (@Mention)**
   - Trigger: User mentions @{Name} or requests to change the person in charge.
   - Priority: HIGHEST. Even if mixed with progress reports, this must be handled.
   - Action: 
     - Set 'assigneeName' to the EXACT name within brackets or the mentioned user.
     - Add log to 'accomplishments': "[{TODAY}] (담당자 변경: {OLD_ASSIGNEE} -> @{NEW_ASSIGNEE}) - (이유/상황)"
     - Guidance: Briefly explain the transfer process and any advice for the new assignee in 'summarizedReport'.

   **Scenario B: Completion Reporting**
   - Trigger: User implies the task is "Done", "All finished", "Completed", etc.
   - Action: **Instruction Verification**.
     - Compare accomplishments against the original Instruction ({DESCRIPTION}).
     - **Non-Intrusive Rule**: DO NOT judge the quality or method. Only check if the required list of items has been mentioned as "done".
     - If all items mentioned in instructions are accounted for: Set 'statusUpdate' to "Completed" and 'progressUpdate' to 100.
     - If items are missing: Gently list the missing items in 'summarizedReport' and suggest keeping the status as "In Progress" or "Pending Approval". Do NOT force completion if items are missing.

   **Scenario C: Progress Reporting**
   - Trigger: Normal updates on work progress.
   - Action: 
     - Transform update into ONE concise sentence: "[{TODAY}] (구체적인 상황 및 조치 내용)".
     - Append to the cumulative 'accomplishments' string.
     - Maintain "Strategic Secretary" persona: Detect crises or blockers and provide proactive advice in 'summarizedReport'.

2. **General Response Policy**:
   - **Language**: ALWAYS use Korean for 'summarizedReport' and log entries.
   - **Tone**: Professional, alert, and supportive.
   - **Readability (CRITICAL)**: Use newlines (\\n) between bullet points or numbered items in summarizedReport and accomplishments to ensure clean display.
   - **History**: Do NOT rewrite history. Always append to the end.

Structured Response Format:
{
  "status": "success",
  "clarificationMessage": null,
  "options": ["Suggested next action (Korean)", "Formal report suggestion (Korean)"],
  "title": "{TITLE}",
  "description": "{DESCRIPTION}",
  "statusUpdate": "Pending" | "In Progress" | "Completed" | "Pending Approval",
  "progressUpdate": number (0-100),
  "priority": "{PRIORITY}",
  "assigneeName": "{ASSIGNEE}",
  "dueDate": "{DUE_DATE}",
  "accomplishments": "{EXISTING_ACCOMPLISHMENTS}\\n[{TODAY}] (요약문장)",
  "remainingWork": "worker에게 주는 간단한 리마인더 (Korean)",
  "summarizedReport": "1. 요약/분석\\n2. (선택적) 이관 안내/지시사항 체크 결과\\n3. 전략적 조언 (Korean)"
}
`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { prompt, history, attachments, action, taskData } = await req.json();

        // 1. Handle Commit Action
        if (action === 'commit' && taskData) {
            const users = await prisma.user.findMany({ select: { id: true, name: true } });

            let rawName = taskData.assigneeName || "";
            // Extract from @{Name} if present
            const bracketMatch = rawName.match(/@{(.+)}/);
            if (bracketMatch) rawName = bracketMatch[1];

            const normalize = (s: string) => s.replace(/[@\-\s\.]/g, "").toLowerCase();
            const targetName = normalize(rawName);
            const matchedUser = users.find(u => normalize(u.name) === targetName);

            console.log('Committing Task:', { rawName, matchedUser: matchedUser?.name });

            const updateData: any = {
                status: taskData.statusUpdate || taskData.status,
                progress: taskData.progressUpdate !== undefined ? taskData.progressUpdate : taskData.progress,
                chatLog: JSON.stringify(history || []),
                priority: taskData.priority,
                accomplishments: taskData.accomplishments || "",
            };

            if (taskData.dueDate && taskData.dueDate !== 'No date') {
                updateData.dueDate = new Date(taskData.dueDate);
            }

            if (matchedUser) {
                updateData.assignee = { connect: { id: matchedUser.id } };
            }
            const updatedTask = await prisma.task.update({
                where: { id },
                data: updateData,
                include: { assignee: true }
            });
            return NextResponse.json({ success: true, task: updatedTask });
        }

        // 2. Fetch Settings & Task
        const settings = (await prisma.settings.findUnique({
            where: { id: 'global' },
            include: { llmConfigs: true }
        })) as any;

        const task: any = await prisma.task.findUnique({
            where: { id },
            include: { assignee: true, template: true } as any
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        const currentConfig = settings?.llmConfigs?.find((c: any) => c.provider === settings?.llmProvider);
        const effectiveApiKey = currentConfig?.apiKey || settings?.llmApiKey;
        const effectiveModel = currentConfig?.model || settings?.llmModel;

        // 3. Prepare Context
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false });

        let basePrompt = settings?.reportPrompt || PROGRESS_SYSTEM_PROMPT;
        if (task.template && task.template.content) {
            basePrompt += `\n\nSpecific Requirements for this task:\n${task.template.content}`;
        }

        const users = await prisma.user.findMany({ select: { name: true } });
        const availableUserList = users.map(u => u.name).join(', ');

        const finalSystemPrompt = basePrompt
            .replace(/{TODAY}/g, today)
            .replace(/{NOW}/g, currentTime)
            .replace(/{TITLE}/g, task.title)
            .replace(/{STATUS}/g, task.status)
            .replace(/{PROGRESS}/g, task.progress.toString())
            .replace(/{PRIORITY}/g, task.priority)
            .replace(/{ASSIGNEE}/g, task.assignee?.name || 'Unassigned')
            .replace(/{OLD_ASSIGNEE}/g, task.assignee?.name || 'Unassigned')
            .replace(/{AVAILABLE_USERS}/g, availableUserList)
            .replace(/{DUE_DATE}/g, task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'No date')
            .replace(/{EXISTING_ACCOMPLISHMENTS}/g, task.accomplishments || "")
            .replace(/{DESCRIPTION}/g, task.description || 'No description');

        let conversationContext = "Conversation History:\n" +
            (history || []).map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') +
            `\nUser: ${prompt}`;

        let aiResponse;

        // 4. Call LLM
        if (!effectiveApiKey && settings?.llmProvider === 'openai') {
            aiResponse = {
                status: "success",
                clarificationMessage: null,
                options: ["Check CCTV", "Report to Manager"],
                title: task.title,
                description: task.description,
                statusUpdate: "In Progress",
                progressUpdate: task.progress,
                accomplishments: (task.accomplishments ? task.accomplishments + "\n" : "") + `[${today}] User reported potential emergency: ${prompt}`,
                remainingWork: "Urgent check required.",
                assigneeName: task.assignee?.name || null,
                priority: "High",
                dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
                summarizedReport: "상황이 매우 심각해 보입니다. 즉시 보안팀에 알리고 주변을 통제하시기 바랍니다. 제가 관련 진행 상황을 계속 기록하겠습니다."
            };
        } else {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveApiKey || ''}`
                },
                body: JSON.stringify({
                    model: effectiveModel || 'gpt-4o',
                    messages: [
                        { role: 'system', content: finalSystemPrompt },
                        { role: 'user', content: conversationContext }
                    ],
                    response_format: {
                        type: 'json_schema',
                        json_schema: {
                            name: 'progress_report_schema',
                            strict: true,
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', enum: ['success', 'need_clarification'] },
                                    clarificationMessage: { type: ['string', 'null'] },
                                    options: { type: 'array', items: { type: 'string' } },
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    statusUpdate: { type: 'string' },
                                    progressUpdate: { type: 'number' },
                                    priority: { type: 'string' },
                                    assigneeName: { type: ['string', 'null'] },
                                    dueDate: { type: ['string', 'null'] },
                                    accomplishments: { type: 'string' },
                                    remainingWork: { type: 'string' },
                                    summarizedReport: { type: 'string' }
                                },
                                required: ['status', 'clarificationMessage', 'options', 'title', 'description', 'statusUpdate', 'progressUpdate', 'priority', 'assigneeName', 'dueDate', 'accomplishments', 'remainingWork', 'summarizedReport'],
                                additionalProperties: false
                            }
                        }
                    }
                })
            });

            const data = await res.json();
            if (!res.ok) {
                console.error('OpenAI Error:', JSON.stringify(data, null, 2));
                return NextResponse.json({ error: data.error?.message || 'Failed to call OpenAI' }, { status: res.status });
            }
            aiResponse = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        }

        if (aiResponse.status === 'need_clarification') {
            console.log('Report API: AI requested clarification');
            return NextResponse.json({
                success: true,
                needsClarification: true,
                message: aiResponse.clarificationMessage || "어떤 부분을 업데이트할까요?",
                options: aiResponse.options || []
            });
        }

        // --- AUTOMATIC UPDATE FOR REPORTS ---
        try {
            console.log('\n--- Report API Transfer Debug ---');
            console.log('AI raw assigneeName field:', aiResponse.assigneeName);

            const users = await prisma.user.findMany({ select: { id: true, name: true } });

            let rawAssigneeName = aiResponse.assigneeName || "";
            // Handle AI returning delimited format or just raw name
            const bracketMatch = rawAssigneeName.match(/@{(.+)}/);
            if (bracketMatch) {
                rawAssigneeName = bracketMatch[1];
                console.log('Detected brackets, extracted:', rawAssigneeName);
            }

            const normalize = (s: string) => s.replace(/[@\-\s\.]/g, "").toLowerCase();
            const targetName = normalize(rawAssigneeName);

            // Try exact normalized match first
            let matchedUser = users.find(u => normalize(u.name) === targetName);

            // If still not matched and we have a name, try searching for the name as a substring
            if (!matchedUser && targetName.length >= 2) {
                matchedUser = users.find(u =>
                    normalize(u.name).includes(targetName) ||
                    targetName.includes(normalize(u.name))
                );
            }

            console.log('Target Normalized:', targetName);
            console.log('Match Result:', matchedUser ? `SUCCESS (${matchedUser.name})` : 'FAILED');
            console.log('---------------------------------\n');

            const newChatHistory = [
                ...(history || []),
                { role: 'user', content: prompt },
                { role: 'assistant', content: aiResponse.summarizedReport || "진행 상황을 기록했습니다." }
            ];

            const updateData: any = {
                status: aiResponse.statusUpdate || task.status,
                progress: aiResponse.progressUpdate !== undefined ? aiResponse.progressUpdate : task.progress,
                chatLog: JSON.stringify(newChatHistory),
                priority: aiResponse.priority || task.priority,
                accomplishments: aiResponse.accomplishments || task.accomplishments || "",
            };

            if (aiResponse.dueDate && aiResponse.dueDate !== 'No date' && aiResponse.dueDate !== 'null') {
                try { updateData.dueDate = new Date(aiResponse.dueDate); } catch (e) { }
            }
            if (matchedUser) updateData.assignee = { connect: { id: matchedUser.id } };

            const updatedTask = await prisma.task.update({
                where: { id },
                data: updateData,
                include: { assignee: true }
            });
            return NextResponse.json({ success: true, task: updatedTask, taskData: aiResponse });
        } catch (dbError: any) {
            console.error('Report API DB Error:', dbError);
            return NextResponse.json({ error: '데이터베이스 업데이트 중 오류가 발생했습니다: ' + dbError.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Progress Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
