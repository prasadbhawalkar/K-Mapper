import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { NodeData } from '../types';

interface MindmapCanvasProps {
  nodes: NodeData[];
  searchQuery: string;
  onNodeClick: (node: NodeData) => void;
}

export default function MindmapCanvas({ nodes, searchQuery, onNodeClick }: MindmapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [version, setVersion] = useState(0);

  const hierarchyRef = useRef<any>(null);
  const lastMapId = useRef<string | null>(null);

  const triggerUpdate = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    
    // Determine if we are switching maps
    const currentMapId = nodes[0]?.id.split('_')[0] || 'default';
    const isNewMap = currentMapId !== lastMapId.current;
    
    let root: any;
    if (isNewMap || !hierarchyRef.current) {
      // Create fresh hierarchy
      root = d3.stratify<NodeData>()
        .id(d => d.id)
        .parentId(d => d.parent)(nodes);
      
      // Initial collapse: only show root and its children
      root.descendants().forEach((d: any) => {
        if (d.depth > 0) {
          d._children = d.children;
          d.children = null;
        }
      });
      
      hierarchyRef.current = root;
      lastMapId.current = currentMapId;
      g.selectAll('*').remove(); // Clear canvas for new map
    } else {
      root = hierarchyRef.current;
    }

    // Helper to expand/collapse all
    const toggleAll = (expand: boolean) => {
      root.descendants().forEach((d: any) => {
        if (expand) {
          if (d._children) {
            d.children = d._children;
            d._children = null;
          }
        } else {
          if (d.children && d.depth > 0) {
            d._children = d.children;
            d.children = null;
          }
        }
      });
      update(root);
    };

    // Helper to find all nodes (including collapsed ones)
    const findAllNodes = (d: any, results: any[] = []) => {
      results.push(d);
      const children = d.children || d._children;
      if (children) {
        children.forEach((child: any) => findAllNodes(child, results));
      }
      return results;
    };

    // Auto-expand based on search
    if (searchQuery) {
      const allNodes = findAllNodes(root);
      allNodes.forEach((d: any) => {
        const label = d.data.label.toLowerCase();
        const query = searchQuery.toLowerCase();
        if (label.includes(query)) {
          // Expand all ancestors
          let ancestor = d;
          while (ancestor.parent) {
            ancestor = ancestor.parent;
            if (ancestor._children) {
              ancestor.children = ancestor._children;
              ancestor._children = null;
            }
          }
        }
      });
    }

    const treeLayout = d3.tree<NodeData>().nodeSize([50, 240]);

    function update(source: any) {
      const nodesData = root.descendants();
      const linksData = root.links();

      treeLayout(root);

      // Transition
      const duration = 400;

      // Update Links
      const link = g.selectAll('.link')
        .data(linksData, (d: any) => (d.target as any).id);

      const linkEnter = link.enter().append('path')
        .attr('class', 'link')
        .attr('d', (d: any) => {
          const o = { x: source.x0 || source.x, y: source.y0 || source.y };
          // Start from parent's right edge (y + 220)
          const sourcePoint = { x: o.x, y: o.y + 220 };
          const targetPoint = { x: o.x, y: o.y + 220 };
          return d3.linkHorizontal()
            .x((p: any) => p.y)
            .y((p: any) => p.x)({ source: sourcePoint, target: targetPoint } as any);
        })
        .attr('fill', 'none')
        .attr('stroke', '#CBD5E1')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);

      const linkUpdate = link.merge(linkEnter as any);
      linkUpdate.transition().duration(duration)
        .attr('d', (d: any) => {
          return d3.linkHorizontal()
            .x((p: any) => p.y)
            .y((p: any) => p.x)({
              source: { x: d.source.x, y: d.source.y + 220 },
              target: { x: d.target.x, y: d.target.y }
            } as any);
        });

      link.exit().transition().duration(duration)
        .attr('d', (d: any) => {
          const o = { x: source.x, y: source.y };
          const p = { x: o.x, y: o.y + 220 };
          return d3.linkHorizontal()
            .x((pt: any) => pt.y)
            .y((pt: any) => pt.x)({ source: p, target: p } as any);
        })
        .remove();

      // Update Nodes
      const node = g.selectAll('.node')
        .data(nodesData, (d: any) => d.id);

      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${source.y0 || source.y},${source.x0 || source.x})`)
        .style('cursor', 'pointer');

      // Node Background
      nodeEnter.append('rect')
        .attr('class', 'node-rect')
        .attr('x', 0)
        .attr('y', -22)
        .attr('width', 220)
        .attr('height', 44)
        .attr('rx', 8)
        .attr('fill', 'white')
        .attr('stroke', '#E2E8F0')
        .attr('stroke-width', 1)
        .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))');

      // Thumbnail Image
      nodeEnter.filter((d: any) => {
        const url = d.data.imageUrl || (d.data as any).image_url;
        if (url) console.log("Rendering image for node:", d.data.label, url);
        return !!url;
      })
        .append('image')
        .attr('href', (d: any) => d.data.imageUrl || (d.data as any).image_url)
        .attr('x', 6)
        .attr('y', -16)
        .attr('width', 32)
        .attr('height', 32)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .style('clip-path', 'inset(0% round 4px)');

      // Node Label
      nodeEnter.append('text')
        .attr('dy', '0.35em')
        .attr('x', (d: any) => (d.data.imageUrl || (d.data as any).image_url) ? 46 : 12)
        .attr('font-size', '12px')
        .attr('font-family', 'Inter, sans-serif')
        .text((d: any) => {
          const hasImage = d.data.imageUrl || (d.data as any).image_url;
          const limit = hasImage ? 20 : 28;
          return d.data.label.length > limit ? d.data.label.substring(0, limit - 3) + '...' : d.data.label;
        })
        .style('user-select', 'none');

      // Link Icon (if URL exists)
      const linkIcon = nodeEnter.filter((d: any) => !!d.data.url)
        .append('g')
        .attr('class', 'link-icon')
        .attr('transform', 'translate(195, 0)')
        .on('click', (event, d: any) => {
          event.stopPropagation();
          window.open(d.data.url, '_blank');
        });

      linkIcon.append('rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', 20)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', '#EFF6FF');

      linkIcon.append('path')
        .attr('d', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')
        .attr('transform', 'translate(-6, -6) scale(0.5)')
        .attr('fill', 'none')
        .attr('stroke', '#2563EB')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');

      // Click behavior
      nodeEnter.on('click', (event, d: any) => {
        event.stopPropagation();
        const isInternal = d.children || d._children;
        if (isInternal) {
          // Toggle internal nodes
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        } else {
          // Leaf node: single click shows details
          onNodeClick(d.data);
        }
      });

      // Double click behavior
      nodeEnter.on('dblclick', (event, d: any) => {
        event.stopPropagation();
        // Always show details panel on double click
        onNodeClick(d.data);
      });

      // Expand/Collapse Chevron
      const chevron = nodeEnter.filter((d: any) => d.children || d._children)
        .append('g')
        .attr('class', 'toggle-chevron')
        .attr('transform', 'translate(210, 0)');

      chevron.append('path')
        .attr('d', 'M1 1l4 4-4 4')
        .attr('fill', 'none')
        .attr('stroke', '#94A3B8')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');

      const nodeUpdate = node.merge(nodeEnter as any);
      
      nodeUpdate.transition().duration(duration)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

      nodeUpdate.select('.toggle-chevron')
        .transition().duration(duration)
        .attr('transform', (d: any) => d._children ? 'translate(210, 0) rotate(0)' : 'translate(210, 0) rotate(180)');

      nodeUpdate.select('.toggle-chevron path')
        .attr('stroke', (d: any) => d._children ? '#94A3B8' : '#2563EB');

      nodeUpdate.select('.node-rect')
        .attr('stroke', (d: any) => {
          if (searchQuery && d.data.label.toLowerCase().includes(searchQuery.toLowerCase())) {
            return '#EF4444';
          }
          return d.data.url ? '#3B82F6' : '#E2E8F0';
        })
        .attr('stroke-width', (d: any) => searchQuery && d.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 1);

      nodeUpdate.select('text')
        .attr('fill', (d: any) => {
          if (searchQuery && d.data.label.toLowerCase().includes(searchQuery.toLowerCase())) {
            return '#EF4444';
          }
          return '#1E293B';
        })
        .attr('font-weight', (d: any) => (searchQuery && d.data.label.toLowerCase().includes(searchQuery.toLowerCase())) || d.depth === 0 ? '600' : '400');

      node.exit().transition().duration(duration)
        .attr('transform', `translate(${source.y},${source.x})`)
        .remove();

      // Stash the old positions for transition.
      nodesData.forEach((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial render
    update(root);

    // Initial center
    if (isNewMap) {
      const initialTransform = d3.zoomIdentity.translate(100, svgRef.current.clientHeight / 2).scale(1);
      svg.call(zoom.transform, initialTransform);
    }

  }, [nodes, searchQuery, version]);

  return (
    <div className="w-full h-full bg-[#F8F9FA] relative overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
      >
        <g ref={gRef} />
      </svg>
      
      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        {/* Controls */}
        <div className="bg-white p-1 rounded-xl shadow-soft border border-black/5 flex flex-col gap-1">
          <button 
            onClick={() => {
              if (hierarchyRef.current) {
                const findAll = (d: any) => {
                  if (d._children) {
                    d.children = d._children;
                    d._children = null;
                  }
                  if (d.children) {
                    d.children.forEach(findAll);
                  }
                };
                findAll(hierarchyRef.current);
                triggerUpdate();
              }
            }}
            title="Expand All"
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 flex items-center gap-2 text-xs font-semibold"
          >
            <div className="w-5 h-5 flex items-center justify-center bg-blue-50 text-blue-600 rounded">
              <span className="text-[10px]">MAX</span>
            </div>
            Expand All
          </button>
          <button 
            onClick={() => {
              if (hierarchyRef.current) {
                const collapseAll = (d: any) => {
                  if (d.children && d.depth > 0) {
                    d._children = d.children;
                    d.children = null;
                  }
                  const children = d.children || d._children;
                  if (children) {
                    children.forEach(collapseAll);
                  }
                };
                collapseAll(hierarchyRef.current);
                triggerUpdate();
              }
            }}
            title="Collapse All"
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 flex items-center gap-2 text-xs font-semibold"
          >
            <div className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-600 rounded">
              <span className="text-[10px]">MIN</span>
            </div>
            Collapse All
          </button>
        </div>

        <div className="bg-white p-2 rounded-lg shadow-soft border border-black/5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span>Has Link</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-gray-400 px-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Search Match</span>
          </div>
        </div>
      </div>
    </div>
  );
}
