(function () {
  let steps = [];
  let currentIndex = 0;
  let timer = null;
  let playing = false;

  function init() {
    document.getElementById('toggle-replay').addEventListener('click', open);
    document.getElementById('replay-close').addEventListener('click', close);
    document.getElementById('replay-play').addEventListener('click', togglePlay);
    document.getElementById('replay-prev').addEventListener('click', previous);
    document.getElementById('replay-next').addEventListener('click', next);
    document.getElementById('export-replay-gif').addEventListener('click', () =>
      exporter.exportReplayGif().catch(error => interactions.toast(error.message)));
    document.getElementById('replay-range').addEventListener('input', event => {
      stop();
      show(Number(event.target.value));
    });
    document.addEventListener('keydown', handleKeys);
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
      next(false);
    }, replayDelay());
  }

  function previous(shouldStop = true) {
    if (shouldStop) stop();
    show(currentIndex - 1);
  }

  function next(shouldStop = true) {
    if (shouldStop) stop();
    show(currentIndex + 1);
  }

  function replayDelay() {
    return Number(document.getElementById('replay-speed').value) || 650;
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
    showStep(step);
  }

  function showStep(step, pulse = true) {
    graph.setReplayFilter({ nodeIds: step.nodeIds, edgeIds: step.edgeIds });
    const position = steps.findIndex(item => item.index === step.index);
    const stepNumber = position >= 0 ? position + 1 : step.index + 1;
    document.getElementById('replay-label').textContent = `${stepNumber}/${steps.length || state.replaySteps().length} ${step.label}`;
    if (pulse && step.event.type === 'node') graph.pulseNode(step.event.nodeId);
  }

  function isOpen() {
    return !document.getElementById('replay-panel').classList.contains('hidden');
  }

  function currentStep() {
    return steps[currentIndex] || null;
  }

  function delay() {
    return replayDelay();
  }

  function handleKeys(event) {
    if (!isOpen() || event.target.closest('.cm-editor') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
    if (event.key === ' ') {
      event.preventDefault();
      togglePlay();
    }
  }

  window.replay = { init, open, close, showStep, isOpen, currentStep, delay };
}());
