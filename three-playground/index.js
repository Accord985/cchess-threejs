'use strict';

(function() {
  window.addEventListener('load', init);

  function init() {
    id('base').addEventListener('click', () => {loadScript('base.js')});
    id('text').addEventListener('click', () => {loadScript('text.js')});
  }

  function loadScript(scriptUrl) {
    let scriptSection = id('test-scripts');
    scriptSection.innerHTML = '';
    let script = gen('script');
    script.src = scriptUrl;
    script.type = 'module';
    scriptSection.appendChild(script);
    let msg = gen('p');
    msg.innerText = `Loading ${scriptUrl}. To try another, refresh the page.`;
    document.body.appendChild(msg);
    disableButtons();
  }

  function disableButtons() {
    let buttons = qsa('button');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
    }
  }

  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  function gen(tagName) {
    return document.createElement(tagName);
  }

  function id(idName) {
    return document.getElementById(idName);
  }
})();