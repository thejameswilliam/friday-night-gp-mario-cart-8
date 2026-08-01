// Course picker interactions for the new-tournament form:
// cup-level toggle (with indeterminate state), select/clear all, and a live count.
(function () {
  var form = document.getElementById('create-form');
  if (!form) return;

  var countEl = document.getElementById('sel-count');
  var cups = Array.prototype.slice.call(form.querySelectorAll('.cup-pick'));

  function allBoxes() {
    return Array.prototype.slice.call(form.querySelectorAll('.course-cb'));
  }

  function updateCount() {
    if (countEl) countEl.textContent = allBoxes().filter(function (b) { return b.checked; }).length;
  }

  function syncCupToggle(cup) {
    var toggle = cup.querySelector('.cup-toggle');
    var boxes = Array.prototype.slice.call(cup.querySelectorAll('.course-cb'));
    var checked = boxes.filter(function (b) { return b.checked; }).length;
    toggle.checked = checked === boxes.length;
    toggle.indeterminate = checked > 0 && checked < boxes.length;
  }

  cups.forEach(function (cup) {
    var toggle = cup.querySelector('.cup-toggle');
    var boxes = Array.prototype.slice.call(cup.querySelectorAll('.course-cb'));

    toggle.addEventListener('change', function () {
      boxes.forEach(function (b) { b.checked = toggle.checked; });
      toggle.indeterminate = false;
      updateCount();
    });
    boxes.forEach(function (b) {
      b.addEventListener('change', function () { syncCupToggle(cup); updateCount(); });
    });

    syncCupToggle(cup); // reflect server-rendered checked state on load
  });

  function setAll(value) {
    allBoxes().forEach(function (b) { b.checked = value; });
    cups.forEach(syncCupToggle);
    updateCount();
  }

  var selectAll = document.getElementById('select-all');
  var clearAll = document.getElementById('clear-all');
  if (selectAll) selectAll.addEventListener('click', function () { setAll(true); });
  if (clearAll) clearAll.addEventListener('click', function () { setAll(false); });

  updateCount();
})();
