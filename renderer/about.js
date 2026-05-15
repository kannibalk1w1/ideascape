(function () {
  function init() {
    const pkg = require('../package.json');
    document.getElementById('about-version').textContent = `Version ${pkg.version}`;
    document.getElementById('about-build').textContent = `Windows tester build - ${new Date().toLocaleDateString()}`;
    document.querySelector('#about-repo a').addEventListener('click', event => {
      event.preventDefault();
      require('electron').shell.openExternal(event.currentTarget.href);
    });
    document.getElementById('show-about').addEventListener('click', open);
    document.getElementById('close-about').addEventListener('click', close);
    document.getElementById('about-dialog').addEventListener('click', event => {
      if (event.target.id === 'about-dialog') close();
    });
  }

  function open() {
    document.getElementById('about-dialog').showModal();
  }

  function close() {
    document.getElementById('about-dialog').close();
  }

  window.about = { init, open, close };
}());
