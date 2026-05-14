(function () {
  let simulation;
  let zoom;
  let zoomTransform = d3.zoomIdentity;
  let svgEdges;
  let svgNodes;
  let svgSelection;
  let idle = false;

  function init() {
    if (state.getNodes().length === 0) state.initRoot(window.innerWidth, window.innerHeight);

    svgEdges = d3.select('#edges');
    svgNodes = d3.select('#nodes');
    svgSelection = d3.select('#selection-layer');

    zoom = d3.zoom()
      .scaleExtent([0.12, 4])
      .filter(event => !(event.shiftKey && event.type === 'mousedown'))
      .on('zoom', event => {
        zoomTransform = event.transform;
        d3.select('#zoom-layer').attr('transform', event.transform);
        updateLabelVisibility();
      });

    d3.select('#graph').call(zoom);

    simulation = d3.forceSimulation(state.getNodes())
      .force('charge', d3.forceManyBody().strength(-300))
      .force('link', d3.forceLink(state.getEdges()).id(node => node.id).distance(120).strength(0.3))
      .force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(0.05))
      .force('orbit', orbitForce())
      .alphaDecay(0.001)
      .on('tick', tick);

    render();
  }

  function tick() {
    svgEdges.selectAll('line')
      .attr('x1', edge => edge.source.x ?? 0)
      .attr('y1', edge => edge.source.y ?? 0)
      .attr('x2', edge => edge.target.x ?? 0)
      .attr('y2', edge => edge.target.y ?? 0);

    svgNodes.selectAll('.node')
      .attr('transform', node => `translate(${node.x ?? 0},${node.y ?? 0})`);
  }

  function luminance(hex) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function edgeColour(edge) {
    const source = typeof edge.source === 'object' ? edge.source : state.getNode(edge.source);
    const target = typeof edge.target === 'object' ? edge.target : state.getNode(edge.target);
    if (!source || !target) return '#59616d';
    if (!edge.locked) return source.color;
    return luminance(source.color) < luminance(target.color) ? source.color : target.color;
  }

  function renderEdges() {
    const visible = state.visibleNodeIds();
    const edges = state.getEdges().filter(edge => visible.has(state.edgeEndpointId(edge.source)) && visible.has(state.edgeEndpointId(edge.target)));
    const visual = svgEdges.selectAll('.edge.visual').data(edges, edge => edge.id);
    visual.enter()
      .append('line')
      .attr('class', 'edge visual')
      .merge(visual)
      .attr('class', edge => `edge visual ${edge.locked ? 'locked' : 'floating'} ${edge.kind || 'association'}`)
      .attr('stroke', edge => edgeColour(edge))
      .attr('stroke-width', edge => (edge.kind === 'hierarchy' ? 2.4 : 1.7) + (edge.locked ? 0.8 : 0));
    visual.exit().remove();

    const hit = svgEdges.selectAll('.edge.hit-area').data(edges, edge => edge.id);
    hit.enter()
      .append('line')
      .attr('class', 'edge hit-area')
      .merge(hit)
      .attr('data-id', edge => edge.id)
      .attr('stroke', '#fff');
    hit.exit().remove();
  }

  function renderNodes() {
    const visible = state.visibleNodeIds();
    const groups = svgNodes.selectAll('.node').data(state.getNodes().filter(node => visible.has(node.id)), node => node.id);
    const entered = groups.enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', node => node.id)
      .call(nodeDrag());

    entered.append('circle').attr('class', 'node-circle');
    entered.append('text').attr('class', 'node-symbol');
    entered.append('text').attr('class', 'node-label');

    const all = entered.merge(groups);
    all.classed('selected', node => window.interactions?.getSelectedIds().has(node.id));
    all.select('.node-circle')
      .attr('r', node => node.id === 'root' ? 22 : 15)
      .attr('fill', node => node.color);
    all.select('.node-symbol')
      .text(node => node.symbol || '')
      .attr('fill', '#0d0f12');
    all.select('.node-label')
      .attr('dy', node => (node.id === 'root' ? 24 : 18) + 13)
      .attr('fill', node => node.color)
      .text(node => node.label);
    all.select('.node-label')
      .text(node => `${node.collapsed ? '+ ' : ''}${node.label}`);

    groups.exit().remove();
    updateLabelVisibility();
  }

  function updateLabelVisibility() {
    const scale = zoomTransform.k || 1;
    svgNodes?.selectAll('.node-label')
      .style('display', node => {
        if (node.pinnedLabel || node.id === 'root') return '';
        const degree = state.connectedNodes(node.id).length;
        const threshold = Math.max(0.34, 0.9 - degree * 0.08);
        return scale < threshold ? 'none' : '';
      });
  }

  function hasLockedEdge(id) {
    return state.getEdges().some(edge => edge.locked &&
      (state.edgeEndpointId(edge.source) === id || state.edgeEndpointId(edge.target) === id));
  }

  function nodeDrag() {
    let target = null;
    let groupDrag = false;
    let offsets = [];

    return d3.drag()
      .on('start', (event, node) => {
        d3.select(event.sourceEvent.target.closest('.node')).classed('dragging', true);
        target = null;
        const selected = window.interactions?.getSelectedIds() || new Set();
        groupDrag = selected.size > 1 && selected.has(node.id);
        if (groupDrag) {
          offsets = state.getNodes()
            .filter(item => selected.has(item.id))
            .map(item => ({ node: item, dx: item.x - node.x, dy: item.y - node.y }));
          offsets.forEach(({ node: item }) => state.pinNode(item.id, item.x, item.y));
        } else {
          state.pinNode(node.id, node.x, node.y);
        }
        simulation.alphaTarget(0.12).restart();
      })
      .on('drag', (event, node) => {
        if (groupDrag) {
          offsets.forEach(({ node: item, dx, dy }) => state.pinNode(item.id, event.x + dx, event.y + dy));
          return;
        }

        state.pinNode(node.id, event.x, event.y);
        const snap = state.getNodes().find(item => item.id !== node.id && Math.hypot((item.x ?? 0) - event.x, (item.y ?? 0) - event.y) < 32);
        target = snap || null;
        svgSelection.selectAll('.highlight-ring').remove();
        if (target) {
          svgSelection.append('circle')
            .attr('class', 'highlight-ring')
            .attr('cx', target.x)
            .attr('cy', target.y)
            .attr('r', 24);
        }
      })
      .on('end', (event, node) => {
        d3.select(event.sourceEvent.target.closest('.node')).classed('dragging', false);
        svgSelection.selectAll('.highlight-ring').remove();
        simulation.alphaTarget(0);

        if (groupDrag) {
          offsets.forEach(({ node: item }) => {
            if (!hasLockedEdge(item.id)) state.unpinNode(item.id);
          });
          return;
        }

        if (target) {
          state.addEdge({ source: node.id, target: target.id });
          render();
        }
        if (!hasLockedEdge(node.id)) state.unpinNode(node.id);
      });
  }

  function render() {
    renderEdges();
    renderNodes();
    restart();
  }

  function orbitForce() {
    return alpha => {
      const settings = state.getSettings().orbit;
      if (!idle || !settings.enabled) return;
      const scale = Math.max(0.25, 1 - state.getNodes().length / 180);
      state.eligibleOrbitPairs().forEach(({ parent, child }) => {
        const dx = (child.x ?? 0) - (parent.x ?? 0);
        const dy = (child.y ?? 0) - (parent.y ?? 0);
        const distance = Math.max(36, Math.hypot(dx, dy));
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        const radial = (distance - 115) * 0.0007;
        child.vx += (tangentX * settings.strength * scale - (dx / distance) * radial) * alpha;
        child.vy += (tangentY * settings.strength * scale - (dy / distance) * radial) * alpha;
      });
    };
  }

  function setIdle(value) {
    idle = value;
    if (idle) simulation.alphaTarget(0.08).restart();
    else simulation.alphaTarget(0);
  }

  function restart() {
    const visible = state.visibleNodeIds();
    simulation.nodes(state.getNodes().filter(node => visible.has(node.id)));
    simulation.force('link').links(state.getEdges().filter(edge => visible.has(state.edgeEndpointId(edge.source)) && visible.has(state.edgeEndpointId(edge.target))));
    simulation.alpha(0.3).restart();
  }

  function fitView() {
    const visible = state.visibleNodeIds();
    const nodes = state.getNodes().filter(node => visible.has(node.id));
    if (nodes.length === 0) return;
    const xs = nodes.map(node => node.x ?? 0);
    const ys = nodes.map(node => node.y ?? 0);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 80;
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scale = Math.min(2, Math.max(0.12, 0.9 / Math.max(width / window.innerWidth, height / window.innerHeight)));
    const tx = window.innerWidth / 2 - scale * (minX + width / 2);
    const ty = window.innerHeight / 2 - scale * (minY + height / 2);
    d3.select('#graph').transition().duration(280).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  window.graph = {
    init,
    render,
    restart,
    fitView,
    setIdle,
    getZoom: () => zoom,
    getZoomTransform: () => zoomTransform,
    getSVG: () => d3.select('#graph'),
    screenToCanvas: (x, y) => [(x - zoomTransform.x) / zoomTransform.k, (y - zoomTransform.y) / zoomTransform.k],
    arrangeBranch
  };

  function arrangeBranch(rootId, radial = false) {
    const root = state.getNode(rootId);
    if (!root) return;
    const children = state.hierarchyChildren(rootId);
    const allBranch = state.branchIds(rootId, false).map(id => state.getNode(id)).filter(Boolean);
    if (radial) {
      const nodes = rootId === 'root' ? allBranch : children;
      const radius = Math.max(120, nodes.length * 24);
      nodes.forEach((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
        node.x = root.x + Math.cos(angle) * radius;
        node.y = root.y + Math.sin(angle) * radius;
      });
    } else {
      const startY = root.y - ((children.length - 1) * 72) / 2;
      children.forEach((child, index) => {
        child.x = root.x + 180;
        child.y = startY + index * 72;
      });
    }
    render();
  }
}());
