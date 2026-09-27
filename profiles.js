(function () {
  'use strict';
  var api = window.LearningProfile;
  var toggle = document.getElementById('profile-toggle');
  var panel = document.getElementById('profile-panel');
  var form = document.getElementById('profile-form');
  var levels = form.querySelectorAll('[name="profile-level"]');
  var reading = document.getElementById('profile-reading');
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
    reading.checked = !!(profile && profile.reading);
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
      reading.checked = this.value === 'advanced';
      message('Cambios sin guardar.', false);
    });
  }
  reading.addEventListener('change', function () { message('Cambios sin guardar.', false); });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var level = form.querySelector('[name="profile-level"]:checked').value;
    if (api.save({ level: level, reading: reading.checked })) {
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
