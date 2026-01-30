import { User, PromptTemplate } from '@/types';
import { cn } from '@/lib/utils';

interface TaskConfirmationProps {
    pendingTask: any;
    isEditingTable: boolean;
    updatePendingTask: (field: string, value: any) => void;
    handleEditTask: () => void;
    toggleTableEdit: () => void;
    handleConfirmTask: () => void;
    isLoading: boolean;
    users: User[];
    promptTemplates: PromptTemplate[];
}

export function TaskConfirmation({
    pendingTask,
    isEditingTable,
    updatePendingTask,
    handleEditTask,
    toggleTableEdit,
    handleConfirmTask,
    isLoading,
    users,
    promptTemplates
}: TaskConfirmationProps) {

    if (!pendingTask) return null;

    return (
        <div className="mb-4 p-4 bg-background border border-primary/20 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Confirm Task Details
            </h3>
            <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs text-left border-collapse">
                    <tbody>
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground w-24">Title</th>
                            <td className="px-3 py-2 text-foreground font-medium">
                                {isEditingTable ? (
                                    <input
                                        type="text"
                                        value={pendingTask.title || ''}
                                        onChange={(e) => updatePendingTask('title', e.target.value)}
                                        className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                    />
                                ) : pendingTask.title}
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Detail</th>
                            <td className="px-3 py-2 text-foreground whitespace-pre-wrap">
                                {isEditingTable ? (
                                    <textarea
                                        value={pendingTask.description || ''}
                                        onChange={(e) => updatePendingTask('description', e.target.value)}
                                        className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none min-h-[60px] resize-y"
                                    />
                                ) : (pendingTask.description || '-')}
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Assignee</th>
                            <td className="px-3 py-2 text-foreground">
                                {isEditingTable ? (
                                    <select
                                        value={pendingTask.assigneeName || ''}
                                        onChange={(e) => updatePendingTask('assigneeName', e.target.value)}
                                        className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                ) : (pendingTask.assigneeName || 'Unassigned')}
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Priority</th>
                            <td className="px-3 py-2 font-bold uppercase tracking-wider">
                                {isEditingTable ? (
                                    <select
                                        value={pendingTask.priority || 'Medium'}
                                        onChange={(e) => updatePendingTask('priority', e.target.value)}
                                        className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none font-bold"
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                ) : (
                                    <span className={cn(
                                        pendingTask.priority === 'High' ? "text-red-500" :
                                            pendingTask.priority === 'Medium' ? "text-orange-500" : "text-blue-500"
                                    )}>
                                        {pendingTask.priority}
                                    </span>
                                )}
                            </td>
                        </tr>
                        {pendingTask.accomplishments !== undefined && (
                            <tr className="border-b border-border bg-green-50/30">
                                <th className="px-3 py-2 bg-green-100/30 font-bold text-green-700">Accomplishments</th>
                                <td className="px-3 py-2 text-foreground whitespace-pre-wrap">
                                    {isEditingTable ? (
                                        <textarea
                                            value={pendingTask.accomplishments || ''}
                                            onChange={(e) => updatePendingTask('accomplishments', e.target.value)}
                                            className="w-full bg-background border border-green-200 rounded px-2 py-1 focus:ring-1 focus:ring-green-500 outline-none min-h-[60px] resize-y"
                                        />
                                    ) : (pendingTask.accomplishments || 'Summarizing...')}
                                </td>
                            </tr>
                        )}
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Due Date</th>
                            <td className="px-3 py-2 text-foreground">
                                {isEditingTable ? (
                                    <input
                                        type="date"
                                        value={pendingTask.dueDate || ''}
                                        onChange={(e) => updatePendingTask('dueDate', e.target.value)}
                                        className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                    />
                                ) : (pendingTask.dueDate || 'No date')}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
                <button
                    onClick={handleEditTask}
                    className="px-4 py-2 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
                    title="Modify the original prompt"
                >
                    Edit Prompt
                </button>
                <button
                    onClick={toggleTableEdit}
                    className={cn(
                        "px-4 py-2 rounded-lg border text-xs font-semibold transition-colors active:scale-95",
                        isEditingTable
                            ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                            : "bg-background border-border hover:bg-muted"
                    )}
                >
                    {isEditingTable ? "Done Editing" : "Edit Details"}
                </button>
                <button
                    onClick={handleConfirmTask}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                >
                    {isLoading ? "Processing..." : "Confirm & Save Changes"}
                </button>
            </div>
        </div>
    );
}
