document.addEventListener('DOMContentLoaded', function () {
  // Language switch (NO/EN), same behaviour as before, now shared across the three pages.
  document.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var en = b.dataset.lang === 'en';
      document.body.classList.toggle('lang-en', en);
      document.documentElement.lang = en ? 'en' : 'no';
      document.querySelectorAll('[data-lang]').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
    });
  });

  // Task checklist: collapse/expand, task-level and subtask checkboxes, local persistence.
  // State lives only in this browser (localStorage) — there is no live ClickUp sync yet.
  // JON-003 already defines what a real sync needs (shared field contract, a secure server
  // connection, conflict rules); building that is a separate, later step, not something a
  // static page can safely do on its own since it would require exposing API keys in HTML.
  var STORAGE_KEY = 'delegate-workplan-progress-v1';

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      /* localStorage unavailable (private mode, etc.) — state just won't persist */
    }
  }

  var store = loadStore();

  document.querySelectorAll('.task').forEach(function (task) {
    var id = task.dataset.taskId;
    if (!id) return;
    if (!store[id]) store[id] = { done: false, subtasks: {}, expanded: null };
    var state = store[id];

    var defaultExpanded = /-001$/.test(id);
    var expanded = (state.expanded === null || state.expanded === undefined) ? defaultExpanded : state.expanded;

    var toggleButtons = task.querySelectorAll('.task-toggle');
    var progressEls = task.querySelectorAll('.task-progress');
    var doneBoxes = task.querySelectorAll('.task-done-cb');
    var subBoxes = task.querySelectorAll('.sub-cb');
    var subCount = 0;
    var seenIndices = {};
    subBoxes.forEach(function (cb) {
      var i = cb.dataset.i;
      if (!(i in seenIndices)) {
        seenIndices[i] = true;
        subCount++;
      }
    });

    function applyExpanded() {
      task.setAttribute('data-expanded', expanded ? 'true' : 'false');
      toggleButtons.forEach(function (b) {
        b.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }
    toggleButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        expanded = !expanded;
        state.expanded = expanded;
        saveStore(store);
        applyExpanded();
      });
    });
    applyExpanded();

    function renderProgress() {
      var doneCount = 0;
      Object.keys(state.subtasks).forEach(function (k) {
        if (state.subtasks[k]) doneCount++;
      });
      var label = subCount ? (doneCount + '/' + subCount) : '';
      var complete = subCount > 0 && doneCount === subCount;
      progressEls.forEach(function (el) {
        el.textContent = label;
        el.classList.toggle('complete', complete);
      });
    }
    function renderDone() {
      doneBoxes.forEach(function (cb) {
        cb.checked = !!state.done;
      });
      task.classList.toggle('is-done', !!state.done);
    }
    function renderSub() {
      subBoxes.forEach(function (cb) {
        cb.checked = !!state.subtasks[cb.dataset.i];
      });
    }

    doneBoxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.done = cb.checked;
        saveStore(store);
        renderDone();
      });
    });
    subBoxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        state.subtasks[cb.dataset.i] = cb.checked;
        saveStore(store);
        renderSub();
        renderProgress();
      });
    });

    renderDone();
    renderSub();
    renderProgress();
  });
});
