
export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

export interface PromptTemplate {
    id: string;
    name: string;
    description: string | null;
    content: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    progress: number;
    dueDate: string | null;
    assigneeId?: string | null;
    assignee?: {
        name: string;
        avatar?: string;
    };
    chatLog?: string | null;
    accomplishments?: string | null;
    templateId?: string | null;
    template?: PromptTemplate | null;
    createdAt?: string;
    updatedAt?: string;
}
