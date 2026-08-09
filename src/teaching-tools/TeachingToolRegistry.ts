import { ITeachingToolDef, ToolCategory } from './types';

class TeachingToolRegistryImpl {
  private tools: Map<string, ITeachingToolDef> = new Map();

  register(tool: ITeachingToolDef) {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): ITeachingToolDef | undefined {
    return this.tools.get(id);
  }

  getAllTools(): ITeachingToolDef[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: ToolCategory): ITeachingToolDef[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }
}

export const TeachingToolRegistry = new TeachingToolRegistryImpl();
