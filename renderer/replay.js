(function () {
  let steps = [];
  let currentIndex = 0;
  let timer = null;
  let playing = false;

  function init() {
    document.getElementById('toggle-replay').addEventListener('click', open);
    document.getElementById('replay-close').addEventListener('click', close);
    document.getElementById('replay-play').addEventListener('click', togglePlay);
    document.getElementById('replay-range').addEventListener('input', event => {
      stop();
      show(Number(event.target.value));
    });
  }

  function open() {
    steps = state.replaySteps();
    currentIndex = 0;
    document.getElementById('replay-panel').classList.remove('hidden');
    const range = document.getElementById('replay-range');
    range.max = Math.max(0, steps.length - 1);
    range.value = '0';
    show(0);
  }

  function close() {
    stop();
    document.getElementById('replay-panel').classList.add('hidden');
    graph.setReplayFilter(null);
  }

  function togglePlay() {
    if (playing) {
      stop();
      return;
    }
    if (!steps.length) open();
    playing = true;
    document.getElementById('replay-play').textContent = 'Pause';
    timer = setInterval(() => {
      if (currentIndex >= steps.length - 1) {
        stop();
        return;
      }
      show(currentIndex + 1);
    }, 650);
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    timer = null;
    document.getElementById('replay-play').textContent = 'Play';
  }

  function show(index) {
    currentIndex = Math.max(0, Math.min(index, Math.max(0, steps.length - 1)));
    const step = steps[currentIndex];
    const range = document.getElementById('replay-range');
    range.value = String(currentIndex);
    if (!step) {
      graph.setReplayFilter({ nodeIds: new Set(), edgeIds: new Set() });
      document.getElementById('replay-label').textContent = 'No timeline yet';
      return;
    }
    graph.setReplayFilter({ nodeIds: step.nodeIds, edgeIds: step.edgeIds });
    document.getElementById('replay-label').textContent = `${currentIndex + 1}/${steps.length} ${step.label}`;
    if (step.event.type === 'node') graph.pulseNode(step.event.nodeId);
  }

  window.replay = { init, open, close };
}());
