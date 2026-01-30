import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const PROGRESS_SYSTEM_PROMPT = `
You are a Task Assistant acting as a **Supportive Secretary**.

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
1. **Concise Appending (Secretary Mode)**:
   - **Do NOT rewrite or re-generate the entire accomplishments log.**
   - Listen to the user's input and transform it into **EXACTLY ONE concise and professional sentence** in Korean that sums up the update.
   - Format the new entry as: "[{TODAY}] (Your concise sentence here)"
   - **Append** this new line to the very end of the 'Existing Accomplishments' provided above. 
   - Ensure you return the FULL cumulative string (Existing + New line) in the 'accomplishments' field.

2. **Advice and Support**:
   - Provide a warm, supportive comment or a helpful tip to the worker ( {ASSIGNEE} ) based on their update in the 'summarizedReport' field.
   - Act like a helpful colleague who takes care of the recording so the worker can focus on the task.

3. **Response Policy**:
   - **Language**: ALWAYS speak in Korean in 'summarizedReport' and for the newly appended sentence.
   - **Status**: Always use 'status: "success"'.

Structured Response Format:
{
  "status": "success",
  "clarificationMessage": null,
  "options": ["Suggested next step 1 (Korean)", "Suggested next step 2 (Korean)"],
  "title": "{TITLE}",
  "description": "{DESCRIPTION}",
  "statusUpdate": "Pending" | "In Progress" | "Completed" | "Pending Approval",
  "progressUpdate": number (0-100),
  "priority": "{PRIORITY}",
  "assigneeName": "{ASSIGNEE}",
  "dueDate": "{DUE_DATE}",
  "accomplishments": "{EXISTING_ACCOMPLISHMENTS}\\n[{TODAY}] (새로 작성된 간결한 한 문장)",
  "remainingWork": "worker에게 주는 간단한 리마인더 (Korean)",
  "summarizedReport": "작업자( {ASSIGNEE} )에게 전달하는 따뜻한 조언과 격려 (Korean)"
}
`;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { prompt, history, attachments, action, taskData } = await req.json();

        // 1. Handle Commit Action
        if (action === 'commit' && taskData) {
            // Find user if assigneeName is provided
            const users = await prisma.user.findMany({ select: { id: true, name: true } });
            const matchedUser = users.find(u => u.name === taskData.assigneeName);

            const updateData: any = {
                status: taskData.statusUpdate || taskData.status,
                progress: taskData.progressUpdate !== undefined ? taskData.progressUpdate : taskData.progress,
                chatLog: JSON.stringify(history || []),
                priority: taskData.priority,
                accomplishments: taskData.accomplishments || "",
                template: taskData.templateId ? { connect: { id: taskData.templateId } } : undefined
            };

            if (taskData.dueDate && taskData.dueDate !== 'No date') {
                updateData.dueDate = new Date(taskData.dueDate);
            }

            if (matchedUser) {
                updateData.assignee = { connect: { id: matchedUser.id } };
            }
            const updatedTask = await prisma.task.update({
                where: { id },
                data: updateData
            });
            return NextResponse.json({ success: true, task: updatedTask });
        }

        // 2. Fetch Settings & Task with Template
        const settings = (await prisma.settings.findUnique({ where: { id: 'global' } })) as any;

        const task: any = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: true,
                template: true
            } as any
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // 3. Prepare Context
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false });

        // Combine base system prompt with task-specific template if it exists
        // Use reportPrompt specifically for this route
        let basePrompt = settings?.reportPrompt || PROGRESS_SYSTEM_PROMPT;
        if (task.template && task.template.content) {
            basePrompt += `\n\nSpecific Requirements for this task (ALWAYS prioritize these):\n${task.template.content}`;
        }

        const finalSystemPrompt = basePrompt
            .replace(/{TODAY}/g, today)
            .replace(/{NOW}/g, currentTime)
            .replace(/{TITLE}/g, task.title)
            .replace(/{STATUS}/g, task.status)
            .replace(/{PROGRESS}/g, task.progress.toString())
            .replace(/{PRIORITY}/g, task.priority)
            .replace(/{ASSIGNEE}/g, task.assignee?.name || 'Unassigned')
            .replace(/{DUE_DATE}/g, task.dueDate ? task.dueDate.toISOString().split('T')[0] : 'No date')
            .replace(/{EXISTING_ACCOMPLISHMENTS}/g, task.accomplishments || "None yet")
            .replace(/{DESCRIPTION}/g, task.description || 'No description');

        let conversationContext = "Conversation History:\n" +
            (history || []).map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') +
            `\nUser: ${prompt}`;

        let aiResponse;

        // 4. Call LLM (or Mock)
        if (!settings?.llmApiKey && settings?.llmProvider === 'openai') {
            // Simple Mock Logic
            const progressMatch = prompt.match(/(\d+)%/);
            const claimedProgress = progressMatch ? parseInt(progressMatch[1]) : 100;

            const isActuallyDone = claimedProgress === 100;

            const isCompletionClaim = prompt.toLowerCase().includes('done') ||
                prompt.toLowerCase().includes('finish') ||
                prompt.toLowerCase().includes('complete');

            aiResponse = {
                status: "success",
                clarificationMessage: null,
                options: isCompletionClaim ? ["I'll double check...", "Wait, I missed something."] : ["Can you remind me what's next?", "Record this as well..."],
                title: task.title,
                description: task.description,
                statusUpdate: isCompletionClaim ? "Pending Approval" : "In Progress",
                progressUpdate: isCompletionClaim ? 100 : Math.min(claimedProgress, 95),
                accomplishments: (task.accomplishments ? task.accomplishments + "\n" : "") + `[${today}] Registered worker's report: ${claimedProgress}% progress achieved.`,
                remainingWork: isCompletionClaim
                    ? "Secretary: I've flagged this for completion review.\n\nPlease wait for admin approval."
                    : "Continue with the remaining instructions.\n\nNext Step: Verify the alignment.",
                assigneeName: (task as any).assignee?.name || null,
                priority: task.priority || "Medium",
                dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
                summarizedReport: isCompletionClaim
                    ? `Great job!\n\nI've noted that you've finished the task. I'll pass this for final review.`
                    : `Got it!\n\nI've recorded your progress (${claimedProgress}%). Keep up the great work!`
            };
        }
        else {
            // Real API Call
            const requestBody = {
                model: settings.llmModel || 'gpt-4o',
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
            };

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

            const content = data.choices?.[0]?.message?.content;
            aiResponse = JSON.parse(content || '{}');
        }

        // 5. Handle Clarification
        if (aiResponse.status === 'need_clarification') {
            return NextResponse.json({
                success: true,
                needsClarification: true,
                message: aiResponse.clarificationMessage || "Can you provide more details regarding unmet requirements?",
                options: aiResponse.options || []
            });
        }

        // 6. UPDATE DB AUTOMATICALLY (Skip Confirmation for Reports)
        if (aiResponse.status === 'success') {
            const users = await prisma.user.findMany({ select: { id: true, name: true } });
            const matchedUser = users.find(u => u.name === aiResponse.assigneeName);

            const updateData: any = {
                status: aiResponse.statusUpdate || task.status,
                progress: aiResponse.progressUpdate !== undefined ? aiResponse.progressUpdate : task.progress,
                chatLog: JSON.stringify([...(history || []), { role: 'user', content: prompt }, { role: 'assistant', content: aiResponse.summarizedReport }]),
                priority: aiResponse.priority,
                accomplishments: aiResponse.accomplishments || "",
            };

            if (aiResponse.dueDate && aiResponse.dueDate !== 'No date') {
                updateData.dueDate = new Date(aiResponse.dueDate);
            }

            if (matchedUser) {
                updateData.assignee = { connect: { id: matchedUser.id } };
            }

            const updatedTask = await prisma.task.update({
                where: { id },
                data: updateData
            });

            return NextResponse.json({
                success: true,
                task: updatedTask,
                // Even though we updated, the frontend might still transition based on aiResponse
                taskData: aiResponse
            });
        }

        // Fallback or unexpected (should not normally reach here)
        return NextResponse.json({
            success: true,
            needsConfirmation: true,
            taskData: aiResponse
        });

    } catch (error: any) {
        console.error('Progress Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
