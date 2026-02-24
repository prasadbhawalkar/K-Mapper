import { useEffect, useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  Network, 
  Info, 
  ExternalLink, 
  Menu, 
  X,
  Database,
  Layers,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BootstrapResponse, MindmapData, MindmapInfo, NodeData } from './types';
import MindmapCanvas from './components/MindmapCanvas';

const API_BASE = "https://script.google.com/macros/s/AKfycbxdeIHcqEHE5SCiJV_ddiQkC22LNUXYvaHpAqEL7cEJd1GGxVDYI1PcmBkrG9KBirvo/exec";

export default function App() {
  const [maps, setMaps] = useState<MindmapInfo[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [activeNodes, setActiveNodes] = useState<NodeData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mapId = params.get('map');
    if (mapId) setActiveMapId(mapId);

    fetch(`${API_BASE}?action=bootstrap`)
      .then(r => r.json())
      .then((d: BootstrapResponse) => {
        setMaps(d.mindmaps);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to bootstrap:", err);
        setIsLoading(false);
      });
  }, []);

  // Fetch specific map data
  useEffect(() => {
    if (!activeMapId) return;

    setIsLoading(true);
    fetch(`${API_BASE}?action=mindmap&mindmap_id=${activeMapId}`)
      .then(r => r.json())
      .then((d: MindmapData) => {
        setActiveNodes(d.nodes);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch mindmap:", err);
        setIsLoading(false);
      });

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('map', activeMapId);
    window.history.pushState({}, '', url);
  }, [activeMapId]);

  const activeMap = maps.find(m => m.mindmap_id === activeMapId);

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] font-sans text-[#1A1A1A]">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-[300px] border-r border-black/5 bg-white flex flex-col z-20"
          >
            <div className="p-6 border-bottom border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Network size={18} />
                </div>
                <h1 className="font-bold text-lg tracking-tight">K-Mapper</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="mb-4 px-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Available Maps</p>
              </div>
              
              {isLoading && maps.length === 0 ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {maps.map(m => (
                    <button
                      key={m.mindmap_id}
                      onClick={() => setActiveMapId(m.mindmap_id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${
                        activeMapId === m.mindmap_id 
                          ? 'bg-blue-50 text-blue-700 shadow-sm' 
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeMapId === m.mindmap_id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                      }`}>
                        <MapIcon size={16} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-sm truncate">{m.title}</p>
                        <p className="text-[11px] opacity-60 truncate">{m.description}</p>
                      </div>
                      <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeMapId === m.mindmap_id ? 'text-blue-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-black/5">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Database size={14} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Data Source</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Connected to Google Sheets via Apps Script API. Nodes are stratified in real-time.
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <Menu size={20} />
              </button>
            )}
            <div>
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} />
                {activeMap ? activeMap.title : 'Select a Map'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {activeMapId ? (
            <MindmapCanvas 
              nodes={activeNodes} 
              searchQuery={searchQuery}
              onNodeClick={setSelectedNode}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6">
                <Network size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Welcome to Knowledge Mapper</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Select a mindmap from the sidebar to visualize hierarchical knowledge structures and explore connections.
              </p>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-30">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-500">Syncing knowledge nodes...</p>
              </div>
            </div>
          )}
        </div>

        {/* Node Details Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute right-6 top-20 bottom-6 w-80 bg-white shadow-soft border border-black/5 rounded-2xl z-20 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2 text-blue-600">
                  <Info size={18} />
                  <span className="font-bold text-xs uppercase tracking-widest">Node Details</span>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-gray-200 rounded-md text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 leading-tight">{selectedNode.label}</h3>
                
                <div className="space-y-6">
                  {selectedNode.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-black/5 shadow-sm">
                      <img 
                        src={selectedNode.imageUrl} 
                        alt={selectedNode.label}
                        className="w-full h-48 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedNode.description || "No description provided for this node."}
                    </p>
                  </div>

                  {selectedNode.url && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">External Resource</p>
                      <a 
                        href={selectedNode.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
                      >
                        <ExternalLink size={14} />
                        Visit Link
                      </a>
                    </div>
                  )}

                  <div className="pt-4 border-t border-black/5">
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <div className="flex flex-col">
                        <span className="font-bold uppercase tracking-tighter">ID</span>
                        <span className="font-mono">{selectedNode.id}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold uppercase tracking-tighter">Parent</span>
                        <span className="font-mono">{selectedNode.parent || 'Root'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-black/5">
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-full py-2 bg-white border border-black/5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
