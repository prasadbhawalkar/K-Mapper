import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { NodeData } from '../types';

interface MindmapCanvasProps {
  nodes: NodeData[];
  searchQuery: string;
  onNodeClick: (node: NodeData) => void;
}

export default function MindmapCanvas({ nodes, searchQuery, onNodeClick }: MindmapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    
    // Clear previous content
    g.selectAll('*').remove();

    // Create hierarchy
    const root = d3.stratify<NodeData>()
      .id(d => d.id)
      .parentId(d => d.parent)(nodes);

    // Initial collapse: only show root and its children
    root.descendants().forEach((d: any) => {
      if (d.depth > 0) {
        d._children = d.children;
        d.children = null;
      }
    });

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
          return d3.linkHorizontal()
            .x((d: any) => d.y)
            .y((d: any) => d.x)({ source: o, target: o } as any);
        })
        .attr('fill', 'none')
        .attr('stroke', '#CBD5E1')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);

      const linkUpdate = link.merge(linkEnter as any);
      linkUpdate.transition().duration(duration)
        .attr('d', d3.linkHorizontal()
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any);

      link.exit().transition().duration(duration)
        .attr('d', (d: any) => {
          const o = { x: source.x, y: source.y };
          return d3.linkHorizontal()
            .x((d: any) => d.y)
            .y((d: any) => d.x)({ source: o, target: o } as any);
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
      nodeEnter.filter((d: any) => !!d.data.imageUrl)
        .append('image')
        .attr('xlink:href', (d: any) => d.data.imageUrl)
        .attr('x', 6)
        .attr('y', -16)
        .attr('width', 32)
        .attr('height', 32)
        .attr('preserveAspectRatio', 'xMidYMid slice')
        .style('clip-path', 'inset(0% round 4px)');

      // Node Label
      nodeEnter.append('text')
        .attr('dy', '0.35em')
        .attr('x', (d: any) => d.data.imageUrl ? 46 : 12)
        .attr('font-size', '12px')
        .attr('font-family', 'Inter, sans-serif')
        .text((d: any) => {
          const limit = d.data.imageUrl ? 20 : 28;
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
        const isLeaf = !d.children && !d._children;
        
        if (isLeaf) {
          // Last level: show description
          onNodeClick(d.data);
        } else {
          // Internal level: toggle
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        }
      });

      // Expand/Collapse Indicator
      nodeEnter.filter((d: any) => d.children || d._children)
        .append('circle')
        .attr('class', 'toggle-indicator')
        .attr('cx', 220)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', (d: any) => d._children ? '#2563EB' : '#94A3B8');

      const nodeUpdate = node.merge(nodeEnter as any);
      
      nodeUpdate.transition().duration(duration)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

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

      nodeUpdate.select('.toggle-indicator')
        .attr('fill', (d: any) => d._children ? '#2563EB' : '#94A3B8');

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
    const initialTransform = d3.zoomIdentity.translate(100, svgRef.current.clientHeight / 2).scale(1);
    svg.call(zoom.transform, initialTransform);

  }, [nodes, searchQuery]);

  return (
    <div className="w-full h-full bg-[#F8F9FA] relative overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
      >
        <g ref={gRef} />
      </svg>
      
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
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
