import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    applyEdgeChanges,
    applyNodeChanges,
    Edge,
    Node,
    OnConnect,
    OnNodesChange,
    OnEdgesChange,
    Panel,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Trash2, X, ChevronLeft, Save, Play } from 'lucide-react';
import Link from 'next/link';
import { useUpdateWorkflow } from '@/hooks/use-workflows';
import { useEmailTemplates } from '@/hooks/use-email';
import { toast } from 'sonner';
import { Workflow } from '@/types';
import { TriggerNode, ActionNode, DelayNode, ConditionNode } from './custom-nodes';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { useState, useCallback, useMemo } from 'react';

// Initial node types
const nodeTypes = {
    trigger: TriggerNode,
    email: ActionNode,
    action: ActionNode,
    delay: DelayNode,
    condition: ConditionNode,
};

interface WorkflowBuilderProps {
    workflow: Workflow;
}

function BuilderInternal({ workflow }: WorkflowBuilderProps) {
    const [prevWorkflowId, setPrevWorkflowId] = useState(workflow.id);
    const [nodes, setNodes] = useState<Node[]>(workflow.nodes as Node[] || []);
    const [edges, setEdges] = useState<Edge[]>(workflow.edges as Edge[] || []);

    if (workflow.id !== prevWorkflowId) {
        setPrevWorkflowId(workflow.id);
        setNodes(workflow.nodes as Node[] || []);
        setEdges(workflow.edges as Edge[] || []);
    }

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const { trigger: updateWorkflow, isMutating: isSaving } = useUpdateWorkflow();
    const { data: templates } = useEmailTemplates();

    const selectedNode = useMemo(() =>
        nodes.find(n => n.id === selectedNodeId),
        [nodes, selectedNodeId]
    );

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect: OnConnect = useCallback(
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        []
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onSave = async () => {
        try {
            await updateWorkflow({
                id: workflow.id,
                updates: { nodes, edges }
            });
            toast.success("Workflow saved successfully");
        } catch {
            toast.error("Failed to save workflow");
        }
    };

    const onAddNode = (type: string) => {
        const defaultData: Record<string, unknown> = { label: `${type} Node` };

        if (type === 'trigger') {
            defaultData.triggerType = 'contact_created';
            defaultData.description = 'When a new contact is added';
        } else if (type === 'email') {
            defaultData.actionType = 'email';
            defaultData.label = 'Send Welcome Email';
        }

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: 250, y: 50 },
            data: defaultData,
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(newNode.id);
    };

    const updateNodeData = (id: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Builder Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/automations">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div className="space-y-0.5">
                        <h1 className="text-xl font-bold">{workflow.name}</h1>
                        <p className="text-xs text-muted-foreground">{workflow.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Play className="w-4 h-4" />
                        Test Run
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Workflow"}
                    </Button>
                </div>
            </header>

            {/* Main Builder Canvas and Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* React Flow Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Background />
                        <Controls />
                        <MiniMap />

                        <Panel position="top-left" className="bg-background border p-2 rounded-lg shadow-md space-y-2 z-10 pointer-events-auto">
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">Add Step</div>
                            <div className="grid grid-cols-1 gap-1">
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('trigger')}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Trigger
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('email')}>
                                    <div className="w-2 h-2 rounded-full bg-green-500" /> Send Email
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('delay')}>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" /> Delay
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onAddNode('condition')}>
                                    <div className="w-2 h-2 rounded-full bg-purple-500" /> Condition
                                </Button>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                <aside className={cn(
                    "w-80 border-l bg-background transition-all duration-300 overflow-y-auto z-20",
                    selectedNodeId ? "translate-x-0" : "translate-x-full absolute right-0 h-screen"
                )}>
                    {selectedNode && (
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Node Settings</h3>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNodeId(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {/* Trigger Config */}
                                {selectedNode.type === 'trigger' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Trigger Type</Label>
                                            <Select
                                                value={selectedNode.data.triggerType}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { triggerType: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="contact_created">Contact Created</SelectItem>
                                                    <SelectItem value="deal_stage_changed">Deal Stage Changed</SelectItem>
                                                    <SelectItem value="email_opened">Email Opened</SelectItem>
                                                    <SelectItem value="email_clicked">Email Clicked</SelectItem>
                                                    <SelectItem value="tag_added">Tag Added</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Email Config */}
                                {selectedNode.type === 'email' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Step Label</Label>
                                            <Input
                                                value={selectedNode.data.label}
                                                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email Template</Label>
                                            <Select
                                                value={selectedNode.data.templateId}
                                                onValueChange={(val) => updateNodeData(selectedNode.id, { templateId: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Template" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {/* Delay Config */}
                                {selectedNode.type === 'delay' && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="flex-1 space-y-2">
                                                <Label>Duration</Label>
                                                <Input
                                                    type="number"
                                                    value={selectedNode.data.duration || 1}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { duration: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label>Unit</Label>
                                                <Select
                                                    value={selectedNode.data.unit || 'days'}
                                                    onValueChange={(val) => updateNodeData(selectedNode.id, { unit: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="minutes">Minutes</SelectItem>
                                                        <SelectItem value="hours">Hours</SelectItem>
                                                        <SelectItem value="days">Days</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="destructive"
                                    className="w-full gap-2 mt-8"
                                    onClick={() => {
                                        setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
                                        setSelectedNodeId(null);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Node
                                </Button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
    return (
        <ReactFlowProvider>
            <BuilderInternal {...props} />
        </ReactFlowProvider>
    );
}
