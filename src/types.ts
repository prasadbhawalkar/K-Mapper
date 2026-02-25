export interface MindmapInfo {
  mindmap_id: string;
  title: string;
  description: string;
}

export interface NodeData {
  id: string;
  parent: string | null;
  label: string;
  url?: string;
  imageUrl?: string;
  image_url?: string;
  description?: string;
}

export interface MindmapData {
  nodes: NodeData[];
}

export interface BootstrapResponse {
  mindmaps: MindmapInfo[];
}
