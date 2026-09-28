(function () {
  'use strict';
  var api = window.LearningProfile;
  var toggle = document.getElementById('profile-toggle');
  var panel = document.getElementById('profile-panel');
  var form = document.getElementById('profile-form');
  var levels = form.querySelectorAll('[name="profile-level"]');
  var challenges = form.querySelectorAll('[name="profile-challenge"]');
  var defaults = ['addition', 'subtraction', 'trace'];
  var status = document.getElementById('profile-status');
  var save = document.getElementById('profile-save');
  var clear = document.getElementById('profile-clear');

  function message(text, error) {
    status.textContent = text;
    status.setAttribute('data-error', error ? 'true' : 'false');
  }
  function showProfile(profile) {
    var level = profile ? profile.level : 'learner';
    for (var i = 0; i < levels.length; i++) levels[i].checked = levels[i].value === level;
    showChallenges(profile ? profile.challenges : defaults);
  }
  function showChallenges(selected) {
    for (var i = 0; i < challenges.length; i++) challenges[i].checked = selected.indexOf(challenges[i].value) !== -1;
  }
  function selectedChallenges() {
    var selected = [];
    for (var i = 0; i < challenges.length; i++) if (challenges[i].checked) selected.push(challenges[i].value);
    return selected;
  }

  toggle.hidden = false;
  toggle.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
  });
  if (!api) {
    save.disabled = true;
    clear.disabled = true;
    message('No se pudieron cargar los perfiles. Los juegos conservan los retos mínimos. Recarga la página para guardar cambios.', true);
    return;
  }

  showProfile(api.read());
  for (var i = 0; i < levels.length; i++) {
    levels[i].addEventListener('change', function () {
      showChallenges(this.value === 'advanced' ? defaults.concat(['reading']) : defaults);
      message('Cambios sin guardar.', false);
    });
  }
  for (var j = 0; j < challenges.length; j++) {
    challenges[j].addEventListener('change', function () {
      if (!selectedChallenges().length) {
        this.checked = true;
        message('Elige al menos un reto. Marca otro antes de quitar este.', true);
        return;
      }
      message('Cambios sin guardar.', false);
    });
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var level = form.querySelector('[name="profile-level"]:checked').value;
    var selected = selectedChallenges();
    if (!selected.length) {
      message('Elige al menos un reto para guardar el perfil.', true);
      return;
    }
    if (api.save({ level: level, challenges: selected })) {
      message('Perfil guardado en este navegador. Se aplicará al próximo reto.', false);
    } else {
      message('No se ha guardado el perfil. Este navegador no permite guardar la cookie. Revisa sus ajustes; no se han confirmado los cambios.', true);
    }
  });
  clear.addEventListener('click', function () {
    if (api.clear()) {
      showProfile(null);
      message('Perfil borrado. Se usarán los retos mínimos.', false);
    } else {
      message('No se ha podido borrar el perfil. Revisa los ajustes de cookies del navegador.', true);
    }
  });
}());
