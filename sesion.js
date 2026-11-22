// Sesión del equipo (fase 2; rehecha el 20/11/2026 con las observaciones de Luis). Va en TODAS las páginas del equipo:
//   <script src="sesion.js" data-pagina="inicio"></script>   (en consentimiento/ y nota/: src="../sesion.js")
// · Se entra con Usuario (luis, yiyi, kat, ipad…) + PIN de 6 números y "Entrar". Sin botones de personas ni teclado.
// · La clave maestra del estudio solo se pide al crear un PIN o en un aparato nuevo; al escribirla, el aparato queda registrado.
// · Cada perfil ve los módulos de su tipo de acceso: data-ver="nota panel" sale si tiene alguno; "dueno" = solo dueños.
// · Sin usarse: el iPad se cierra a la hora; los demás perfiles, a las 6 horas. Lo que estaba a medias no se pierde.
// · Al entrar otra persona, siempre llega al Inicio. "Cambiar de persona" solo está en el Inicio, y pregunta antes.
// · Toda petición al Apps Script lleva la sesión; el servidor revisa que valga y que el perfil tenga acceso.
// · Casita: los elementos con class="yp-casita" quedan fijos arriba (los estilos van aquí para que sean iguales en todas).
(function () {
  'use strict';
  var AS_URL = 'https://script.google.com/macros/s/AKfycbwJhAO5anQhZ_tzZ7f6jSE133AxFzSLU2rXkVH1vdtH9SlkMlbnvdjbez3786HIEhAf/exec';
  var yo = document.currentScript, PAG = (yo && yo.getAttribute('data-pagina')) || 'inicio';
  var INICIO = PAG === 'consentimiento' || PAG === 'nota' ? '../' : './';
  // Qué módulo pide cada página ('*' = todos; 'dueno' = solo dueños)
  var PAGINAS = { inicio: '*', ayuda: '*', consentimiento: 'consentimiento', fichas: 'fichas', nota: 'nota', panel: 'panel', clientas: 'clientas', config: 'config', perfiles: 'dueno', avisos: 'avisos' };
  var HORA = 60 * 60 * 1000, LIMITE = { ipad: HORA, otro: 6 * HORA };
  var K = { clave: 'yp_pink_clave', sesion: 'yp_sesion', act: 'yp_actividad' };
  // Sin la clave del aparato, las páginas usan esta marca: el servidor deja pasar con la sesión con PIN (Pink.gs pinkCheckClave)
  var CON_SESION = 'con-sesion-pin';
  // Fuera de yiyipash.com (una copia en la computadora) no hay servidor: se comporta como dueño, sin pedir nada
  var SIN_SERVIDOR = !/(\.github\.io|(^|\.)yiyipash\.com|^localhost|^127\.0\.0\.1)$/.test(location.hostname);

  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  try { localStorage.removeItem('yp_perfiles'); localStorage.removeItem('yp_aparato'); } catch (e) {}   // de la primera versión
  function leerSesion() {
    try {
      var s = JSON.parse(ls.get(K.sesion) || 'null');
      if (!s || !s.token || !s.modulos) return null;          // sin "modulos" = sesión de la primera versión: se vuelve a entrar
      var exp = Number(String(s.token).split('.')[1]) || 0;
      return exp > Date.now() ? s : null;
    } catch (e) { return null; }
  }
  try { if (leerSesion() && !ls.get(K.clave)) ls.set(K.clave, CON_SESION); } catch (e) {}
  var limiteDe = function (s) { return s && s.clave_rol === 'ipad' ? LIMITE.ipad : LIMITE.otro; };
  function puede(s, lista) {
    if (!s) return false;
    if (s.clave_rol === 'dueno') return true;
    return String(lista || '').split(/\s+/).some(function (m) { return m === '*' || (m !== 'dueno' && s.modulos.indexOf(m) >= 0); });
  }

  // ── Toda petición al Apps Script lleva la sesión ─────────────────────
  var fetch0 = window.fetch.bind(window);
  window.fetch = function (url, init) {
    var u = String(url && url.url || url || ''), api = /\/exec(\?|$)/.test(u);
    if (api && init && typeof init.body === 'string' && init.body.charAt(0) === '{') {
      var s = leerSesion();
      if (s) { try { var b = JSON.parse(init.body); if (!b.sesion) { b.sesion = s.token; init = Object.assign({}, init, { body: JSON.stringify(b) }); } } catch (e) {} }
    }
    var p = fetch0(url, init);
    if (api) p.then(function (r) { r.clone().json().then(function (j) { if (j && !j.ok && /sesión ya no vale/i.test(j.error || '')) cerrar('Tu sesión terminó. Vuelve a entrar.'); }).catch(function () {}); }).catch(function () {});
    return p;
  };
  function api(action, data) {
    var body = Object.assign({ action: action, clave: ls.get(K.clave) || '' }, data || {});
    return fetch0(AS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Error del servidor'); return j.data; });
  }

  // ── Estilos (todo con prefijo ys- / yp-) ─────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    '.ys-capa{position:fixed;inset:0;z-index:2147483000;background:#ffe1ee;color:#3b1f2e;font-family:Montserrat,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;line-height:1.45;overflow:auto;',
    'padding:calc(18px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 32px max(16px,env(safe-area-inset-left,0px))}',
    '.ys-in{max-width:420px;margin:0 auto;display:grid;gap:12px}',
    '.ys-capa h1{margin:4px 0 0;font-size:23px;font-weight:700;color:#b82a6c}',
    '.ys-hint{margin:0;color:#7d5468;font-size:13.5px}',
    '.ys-aviso{margin:0;background:#fff;border:1.5px solid #f8c4dc;border-radius:12px;padding:9px 12px;font-size:13.5px;font-weight:600;color:#7d5468}',
    '.ys-card{background:#fff;border:1.5px solid #f8c4dc;border-radius:16px;padding:14px;display:grid;gap:12px}',
    '.ys-capa label{display:grid;gap:5px;font-size:13px;font-weight:600}',
    '.ys-capa label small{font-weight:400;color:#7d5468}',
    '.ys-capa input{font:inherit;font-size:16px;padding:11px 12px;border:1.5px solid #f8c4dc;border-radius:10px;background:#fff7fb;color:#3b1f2e;width:100%;box-sizing:border-box}',
    '.ys-capa input.ys-pin:not(:placeholder-shown){letter-spacing:6px;font-variant-numeric:tabular-nums}',
    '.ys-btn{border:none;border-radius:999px;background:linear-gradient(135deg,#d6347f,#ff74af);color:#fff;font:inherit;font-weight:700;font-size:15px;padding:12px 14px;cursor:pointer;text-align:center;text-decoration:none}',
    '.ys-btn.sec{background:#fff;color:#d6347f;border:1.5px solid #f8c4dc}',
    '.ys-btn:disabled{opacity:.6}',
    '.ys-err{color:#b4232b;font-size:13.5px;margin:0;min-height:1.2em}',
    '.ys-capa button:focus-visible,.ys-capa a:focus-visible,.ys-capa input:focus-visible{outline:3px solid #ff74af;outline-offset:2px}',
    '.ys-quien{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-family:Montserrat,system-ui,sans-serif;font-size:13px;color:#7d5468}',
    '.ys-chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #f8c4dc;border-radius:999px;padding:4px 10px;font-weight:600;color:#3b1f2e}',
    '.ys-chip::before{content:"";width:8px;height:8px;border-radius:50%;background:#d6347f}',
    '.ys-link{background:none;border:none;font:inherit;font-size:13px;font-weight:700;color:#d6347f;cursor:pointer;padding:6px 4px}',
    '.yp-casita{position:sticky;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:60;display:inline-flex;align-items:center;gap:5px;width:max-content;align-self:flex-start;',
    'font:600 13px Montserrat,system-ui,sans-serif;color:#d6347f;background:#fff;border:1.5px solid #f8c4dc;border-radius:999px;padding:6px 13px;text-decoration:none;box-shadow:0 2px 0 #f8c4dc;margin:4px 0}',
    '.yp-casita:focus-visible{outline:3px solid #ff74af;outline-offset:2px}',
    '[data-ver].ys-oculto{display:none!important}',
    '.yp-wa{display:block;text-align:center;text-decoration:none;border-radius:999px;padding:11px 14px;font:700 14px Montserrat,system-ui,sans-serif;background:#1f8a5b;color:#fff;border:none}',
    '.yp-wa[aria-disabled="true"]{background:#e8efe9;color:#5d6b62;pointer-events:none}.yp-wa:focus-visible{outline:3px solid #ff74af;outline-offset:2px}',
    '.yp-fotos{display:grid;gap:8px}.yp-fotos-bt{display:flex;gap:8px;flex-wrap:wrap}',
    '.yp-fotos-bt button{flex:1 1 140px;font:600 14px Montserrat,system-ui,sans-serif;color:#d6347f;background:#fff;border:1.5px solid #f8c4dc;border-radius:12px;padding:11px 10px;cursor:pointer}',
    '.yp-fotos-bt button:focus-visible{outline:3px solid #ff74af;outline-offset:2px}',
    '.yp-fotos-l{display:flex;gap:8px;flex-wrap:wrap}.yp-fotos-l:empty{display:none}',
    '.yp-foto{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1.5px solid #f8c4dc;background:#fff7fb}',
    '.yp-foto img{width:100%;height:100%;object-fit:cover;display:block}',
    '.yp-foto button{position:absolute;top:2px;right:2px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(59,31,46,.75);color:#fff;font-size:14px;line-height:24px;padding:0;cursor:pointer}',
  ].join('');
  document.head.appendChild(css);

  var capa = null;
  function abrirCapa(html) {
    if (!capa) { capa = document.createElement('div'); capa.className = 'ys-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); }
    capa.innerHTML = '<div class="ys-in">' + html + '</div>';
    (document.body || document.documentElement).appendChild(capa);
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
    return capa;
  }
  var capaAbierta = function () { return !!(capa && capa.parentNode); };
  function cerrarCapa() { if (capa && capa.parentNode) capa.parentNode.removeChild(capa); try { document.documentElement.style.overflow = ''; } catch (e) {} }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var q = function (sel) { return capa.querySelector(sel); };
  var soloNumeros = function (el) { el.addEventListener('input', function () { var v = el.value.replace(/\D/g, '').slice(0, 6); if (v !== el.value) el.value = v; }); };
  var pinFacil = function (p) { return /^(\d)\1{5}$/.test(p) || '0123456789'.indexOf(p) >= 0 || '9876543210'.indexOf(p) >= 0; };
  var errClave = function (m) { return /Clave de equipo|clave maestra/i.test(m); };

  // ── Entrar: usuario + PIN ────────────────────────────────────────────
  var paso = { usuario: '', pin: '', clave: '', aviso: '' };
  function pantallaEntrar(aviso, err) {
    paso.aviso = aviso || '';
    var nuevo = false;   // (Luis, 20/11) entrar ya no pide la clave del aparato: basta usuario + PIN. La clave maestra solo se pide al crear un PIN.
    abrirCapa((paso.aviso ? '<p class="ys-aviso">' + esc(paso.aviso) + '</p>' : '') +
      '<h1>Entrar</h1><form class="ys-card" id="ysF" autocomplete="off">' +
      '<label>Usuario<input type="text" id="ysU" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Ej. luis" value="' + esc(paso.usuario) + '"></label>' +
      '<label>PIN<input type="password" id="ysP" class="ys-pin" inputmode="numeric" placeholder="6 números"></label>' +
      (nuevo ? '<label>Clave maestra del estudio <small>Este aparato es nuevo: la escribe Luis o Yoltic una sola vez.</small><input type="password" id="ysC" value="' + esc(paso.clave) + '"></label>' : '') +
      '<button class="ys-btn" id="ysB">Entrar</button><p class="ys-err" id="ysE" role="alert">' + esc(err || '') + '</p></form>');
    soloNumeros(q('#ysP'));
    (paso.usuario ? q('#ysP') : q('#ysU')).focus();
    q('#ysF').onsubmit = function (e) {
      e.preventDefault();
      var u = q('#ysU').value.trim(), p = q('#ysP').value, c = q('#ysC') ? q('#ysC').value : '';
      if (!u) { q('#ysE').textContent = 'Escribe tu usuario.'; return q('#ysU').focus(); }
      if (!/^\d{6}$/.test(p)) { q('#ysE').textContent = 'El PIN son 6 números.'; return q('#ysP').focus(); }
      if (q('#ysC') && !c) { q('#ysE').textContent = 'Falta la clave maestra del estudio.'; return q('#ysC').focus(); }
      paso.usuario = u; paso.pin = p; paso.clave = c;
      q('#ysB').disabled = true; q('#ysB').textContent = 'Revisando…'; q('#ysE').textContent = '';
      api('consent_perf_entrar', { usuario: u, pin: p, clave: c || ls.get(K.clave) || '' }).then(function (r) {
        if (r.crear) return primeraVez(r.usuario);
        entro(r);
      }).catch(function (x) {
        if (errClave(x.message)) { if (!c) ls.del(K.clave); return pantallaEntrar(paso.aviso, c ? 'La clave maestra no es correcta.' : 'La clave de este aparato cambió. Escribe la clave maestra.'); }
        q('#ysB').disabled = false; q('#ysB').textContent = 'Entrar';
        q('#ysE').textContent = /Failed to fetch|NetworkError|Load failed/i.test(x.message) ? 'No hay conexión. Revisa el internet e intenta otra vez.' : x.message;
        if (/PIN/.test(x.message)) { q('#ysP').value = ''; q('#ysP').focus(); }
      });
    };
  }
  // Primera vez (o PIN reiniciado): el PIN que escribió es el nuevo; se confirma y Luis o Yoltic ponen la clave maestra
  function primeraVez(usuario) {
    if (pinFacil(paso.pin)) { paso.pin = ''; return pantallaEntrar(paso.aviso, 'Hola, ' + usuario + '. Es tu primera vez: ese PIN es muy fácil de adivinar. Elige otro.'); }
    var yaClave = !!paso.clave;          // (ya no se escribe al entrar: aquí siempre se pide)
    abrirCapa('<h1>Hola, ' + esc(usuario) + '</h1><p class="ys-hint">Es tu primera vez (o te reiniciaron el PIN). El PIN que escribiste será el tuyo.</p>' +
      '<form class="ys-card" id="ysF" autocomplete="off">' +
      '<label>Escribe tu PIN otra vez<input type="password" id="ysP2" class="ys-pin" inputmode="numeric" placeholder="6 números"></label>' +
      (yaClave ? '' : '<label>Clave maestra del estudio <small>La escribe Luis o Yoltic.</small><input type="password" id="ysC"></label>') +
      '<button class="ys-btn" id="ysB">Crear mi PIN y entrar</button><button class="ys-btn sec" type="button" id="ysV">Volver</button>' +
      '<p class="ys-err" id="ysE" role="alert"></p></form>');
    soloNumeros(q('#ysP2')); q('#ysP2').focus();
    q('#ysV').onclick = function () { paso.pin = ''; pantallaEntrar(paso.aviso); };
    q('#ysF').onsubmit = function (e) {
      e.preventDefault();
      var p2 = q('#ysP2').value, c = yaClave ? paso.clave : q('#ysC').value;
      if (p2 !== paso.pin) { paso.pin = ''; return pantallaEntrar(paso.aviso, 'Los dos PIN no son iguales. Empieza otra vez.'); }
      if (!c) { q('#ysE').textContent = 'Falta la clave maestra del estudio.'; return q('#ysC').focus(); }
      q('#ysB').disabled = true; q('#ysB').textContent = 'Creando…'; q('#ysE').textContent = '';
      api('consent_perf_crear_pin', { usuario: usuario, pin: paso.pin, clave_general: c, clave: c }).then(function (s) { paso.clave = c; entro(s); })
        .catch(function (x) { q('#ysB').disabled = false; q('#ysB').textContent = 'Crear mi PIN y entrar'; q('#ysE').textContent = errClave(x.message) ? 'La clave maestra no es correcta.' : x.message; });
    };
  }
  function entro(s) {
    if (paso.clave) ls.set(K.clave, paso.clave);           // el aparato queda registrado
    else if (!ls.get(K.clave)) ls.set(K.clave, CON_SESION);
    ls.set(K.sesion, JSON.stringify(s));
    ls.set(K.act, String(Date.now()));
    if (s.colab && s.clave_rol !== 'ipad') { ls.set('yp_elaboro_id', s.colab.id); ls.set('yp_elaboro_alias', s.colab.alias); }
    else { ls.del('yp_elaboro_id'); ls.del('yp_elaboro_alias'); }
    paso = { usuario: '', pin: '', clave: '', aviso: '' };
    // La misma persona (se le cerró por tiempo): sigue donde estaba. Otra persona: siempre al Inicio.
    if (sesionAlAbrir && sesionAlAbrir.id === s.id) { sesionAlAbrir = s; cerrarCapa(); return aplicar(s); }
    if (PAG === 'inicio') return location.reload();
    location.replace(INICIO);
  }

  // ── Permisos y "quién está" ──────────────────────────────────────────
  function aplicar(s) {
    window.YP_SESION = s;
    document.querySelectorAll('[data-ver]').forEach(function (el) { el.classList.toggle('ys-oculto', !puede(s, el.getAttribute('data-ver'))); });
    if (!puede(s, PAGINAS[PAG] || 'dueno')) {
      abrirCapa('<h1>Tu perfil no tiene acceso a esta parte</h1><p class="ys-hint">Entraste como ' + esc(s.usuario || s.nombre) + '. Si lo necesitas, pídele a Luis o Yoltic que te lo den.</p>' +
        '<a class="ys-btn" href="' + INICIO + '">Ir al Inicio</a>');
      return;
    }
    if (PAG === 'inicio') pintarQuien(s);
    try { document.dispatchEvent(new CustomEvent('yp-sesion', { detail: s })); } catch (e) {}
  }
  var ROL_TXT = { 'Dueño': 'Dueño', 'iPad': 'iPad del estudio' };
  function pintarQuien(s) {
    var sal = document.getElementById('saludo');
    if (sal) sal.textContent = 'Hola, ' + (s.usuario || s.nombre);
    var box = document.getElementById('ysQuien');
    if (!box) { box = document.createElement('div'); box.id = 'ysQuien'; box.className = 'ys-quien'; if (sal && sal.parentNode) sal.parentNode.insertBefore(box, sal.nextSibling); else document.body.insertBefore(box, document.body.firstChild); }
    box.innerHTML = '<span class="ys-chip">' + esc(s.usuario || s.nombre) + ' · ' + esc(ROL_TXT[s.rol] || s.rol) + '</span><button class="ys-link" type="button" id="ysCambiar">Cambiar de persona</button>';
    document.getElementById('ysCambiar').onclick = function () {
      if (confirm('¿Seguro que quieres cerrar tu sesión y cambiar de persona?')) cerrar('');
    };
  }
  function cerrar(aviso) {
    ls.del(K.sesion);
    window.YP_SESION = null;
    pantallaEntrar(aviso);
  }

  // ── Tiempo sin usarse: iPad 1 h, los demás 6 h ───────────────────────
  var ultimo = 0;
  function actividad() { var t = Date.now(); if (t - ultimo > 20000) { ultimo = t; if (leerSesion()) ls.set(K.act, String(t)); } }
  function vencida(s) { var a = Number(ls.get(K.act)) || 0; return !!(s && a && Date.now() - a > limiteDe(s)); }
  var avisoTiempo = function (s) { return (s && s.clave_rol === 'ipad' ? 'El iPad estuvo 1 hora' : 'El aparato estuvo 6 horas') + ' sin usarse. Lo que estaba a medias se guardó.'; };
  function revisarHora() { var s = leerSesion(); if (s && vencida(s) && !capaAbierta()) cerrar(avisoTiempo(s)); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, actividad, { passive: true, capture: true }); });
  setInterval(revisarHora, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) revisarHora(); });

  // ── Arranque ─────────────────────────────────────────────────────────
  var sesionAlAbrir = null;
  function arrancar() {
    if (SIN_SERVIDOR) return aplicar({ id: 'PRF-000', usuario: 'Demo', nombre: 'Demo', rol: 'Dueño', clave_rol: 'dueno', modulos: [], colab: null });
    var s = leerSesion(), aviso = '';
    if (s && vencida(s)) { aviso = avisoTiempo(s); sesionAlAbrir = s; ls.del(K.sesion); s = null; }
    if (!s) return pantallaEntrar(aviso);
    sesionAlAbrir = s;
    actividad();
    aplicar(s);
    refrescar(s);
  }
  // Al abrir cada página: el servidor dice qué ve ahora este perfil (un dueño pudo cambiar sus accesos o reiniciar su PIN)
  function refrescar(s) {
    api('consent_perf_yo', { sesion: s.token }).then(function (r) {
      var antes = JSON.stringify([s.usuario, s.rol, s.clave_rol, s.modulos]);
      var n = Object.assign({}, s, { usuario: r.usuario, nombre: r.nombre, rol: r.rol, clave_rol: r.clave_rol, modulos: r.modulos });
      if (JSON.stringify([n.usuario, n.rol, n.clave_rol, n.modulos]) === antes) return;
      ls.set(K.sesion, JSON.stringify(n)); sesionAlAbrir = n;
      if (!capaAbierta()) aplicar(n);
    }).catch(function (x) { if (/sesión ya no vale/i.test(x.message)) cerrar('Tu sesión terminó. Vuelve a entrar.'); });
  }
  // ── Avance guardado de un formulario (Luis, 20/11): si sales a medias y regresas al mismo registro, sigue ahí.
  // Vive en esta pestaña y es de quien lo empezó. YP.avance(form, clave) → { restaurar() → true si había, borrar() }
  function avance(form, clave) {
    var k = 'yp_borr_' + PAG + '_' + clave + '_' + ((leerSesion() || {}).id || 'x');
    var campos = function () { return [].slice.call(form.querySelectorAll('input,textarea,select')).filter(function (e) { return e.id && e.type !== 'file' && e.type !== 'password'; }); };
    var leerV = function () { var o = {}; campos().forEach(function (e) { o[e.id] = (e.type === 'checkbox' || e.type === 'radio') ? e.checked : e.value; }); return o; };
    var base = JSON.stringify(leerV());
    var guardar = function () { try { var v = JSON.stringify(leerV()); if (v === base) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (x) {} };
    if (form._ypAvance) { form.removeEventListener('input', form._ypAvance); form.removeEventListener('change', form._ypAvance); }
    form._ypAvance = guardar; form.addEventListener('input', guardar); form.addEventListener('change', guardar);
    return {
      restaurar: function () {
        var o = null; try { o = JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (x) {}
        if (!o) return false;
        campos().forEach(function (e) { if (!(e.id in o)) return; if (e.type === 'checkbox' || e.type === 'radio') e.checked = !!o[e.id]; else e.value = o[e.id]; });
        return true;
      },
      borrar: function () { try { sessionStorage.removeItem(k); } catch (x) {} base = JSON.stringify(leerV()); },
    };
  }
  // ── Fotos (Luis, 20/11): en todo campo de fotos del equipo, "Tomar foto" (abre la cámara) o "Adjuntar foto" (galería).
  // Se van juntando; cada una se puede quitar. Las páginas leen la lista con YP.fotos(input) y la vacían con YP.fotosLimpiar(input).
  function mejorarFotos(inp) {
    if (inp._ypFotos) return;
    inp._ypFotos = [];
    var caja = document.createElement('div'); caja.className = 'yp-fotos';
    caja.innerHTML = '<div class="yp-fotos-bt"><button type="button" data-c="1">📷 Tomar foto</button><button type="button">🖼️ Adjuntar foto</button></div><div class="yp-fotos-l" aria-live="polite"></div>';
    var cam = document.createElement('input'); cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.hidden = true; cam.tabIndex = -1;
    inp.hidden = true; inp.tabIndex = -1;
    inp.parentNode.insertBefore(caja, inp.nextSibling); caja.appendChild(cam);
    var lista = caja.querySelector('.yp-fotos-l');
    inp._ypPintar = function () {
      lista.innerHTML = '';
      inp._ypFotos.forEach(function (f, i) {
        var d = document.createElement('div'); d.className = 'yp-foto';
        var im = document.createElement('img'); im.alt = 'Foto ' + (i + 1); im.src = URL.createObjectURL(f); im.onload = function () { URL.revokeObjectURL(im.src); };
        var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar foto ' + (i + 1));
        x.onclick = function (e) { e.preventDefault(); inp._ypFotos.splice(i, 1); inp._ypPintar(); inp.dispatchEvent(new Event('change', { bubbles: true })); };
        d.appendChild(im); d.appendChild(x); lista.appendChild(d);
      });
    };
    var sumar = function (el) { [].slice.call(el.files || []).forEach(function (f) { inp._ypFotos.push(f); }); el.value = ''; inp._ypPintar(); };
    caja.querySelector('.yp-fotos-bt').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; e.preventDefault();
      (b.getAttribute('data-c') ? cam : inp).click();
    });
    cam.addEventListener('change', function (e) { e.stopPropagation(); sumar(cam); inp.dispatchEvent(new Event('change', { bubbles: true })); });
    inp.addEventListener('change', function () { if (inp.files && inp.files.length) sumar(inp); });
  }
  function buscarFotos(raiz) { [].slice.call((raiz || document).querySelectorAll('input[type=file][accept^="image"]:not([capture])')).forEach(mejorarFotos); }
  try { new MutationObserver(function () { buscarFotos(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  var fotosDe = function (inp) { if (!inp) return []; if (!inp._ypFotos) mejorarFotos(inp); return inp._ypFotos.slice(); };
  var fotosLimpiar = function (inp) { if (inp && inp._ypFotos) { inp._ypFotos = []; inp._ypPintar(); } if (inp) inp.value = ''; };

  // ── WhatsApp libre (Luis, 22/11): botón para escribirle a una clienta (al tutor si es menor), con un saludo que se puede borrar.
  // No se guarda nada. YP.whatsapp(contenedor, idClienta) pone el botón; pide el número antes, para que el toque abra WhatsApp directo.
  var WA_CACHE = {};
  function whatsapp(caja, id) {
    if (!caja) return;
    caja.innerHTML = '';
    if (!id) return;
    var a = document.createElement('a'); a.className = 'yp-wa'; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-disabled', 'true'); a.textContent = '💬 Enviar WhatsApp…';
    caja.appendChild(a);
    var k = String(id).toUpperCase();
    (WA_CACHE[k] || (WA_CACHE[k] = api('consent_wa_numero', { id: id, sesion: (leerSesion() || {}).token }).catch(function (x) { delete WA_CACHE[k]; throw x; }))).then(function (d) {
      if (caja.firstChild !== a) return;
      if (!d.wa) { a.textContent = 'Sin WhatsApp registrado'; return; }
      a.href = d.link; a.removeAttribute('aria-disabled');
      a.textContent = '💬 Enviar WhatsApp' + (d.menor ? ' a ' + (d.nombre || 'su tutor') + (d.parentesco ? ' (' + String(d.parentesco).toLowerCase() + ')' : ' (tutor)') : '');
    }).catch(function (x) { if (caja.firstChild === a) a.textContent = /acceso/i.test(x.message) ? 'WhatsApp: tu perfil no tiene acceso' : 'No se pudo cargar el WhatsApp'; });
  }

  window.YP = { sesion: leerSesion, cambiar: function () { cerrar(''); }, puede: function (m) { return puede(leerSesion(), m); }, avance: avance, fotos: fotosDe, fotosLimpiar: fotosLimpiar, whatsapp: whatsapp };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { arrancar(); buscarFotos(); }); else { arrancar(); buscarFotos(); }
})();
