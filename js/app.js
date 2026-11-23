(function () {
  'use strict';
  var DATA = window.APP_DATA, CONF = window.APP_CONFIG;
  var CLAVE = 'ni-elecciones2026-v1';
  var propuestas = DATA.propuestas.map(function (p, i) {
    return { id: i + 1, tema: p[0], texto: p[1], t: (p[2] == null ? null : p[2]) };
  });
  var temas = {};
  DATA.temas.forEach(function (t) { temas[t.id] = t; });

  var perfiles = {
    salud: 'Te preocupa especialmente la sanidad y el acceso real a los servicios públicos.',
    educacion: 'Pones el foco en la escuela, la formación y la igualdad de oportunidades.',
    empleo: 'Mirás el empleo, los salarios y cómo se reparte la riqueza.',
    vivienda: 'La vivienda y el derecho a emanciparse están en el centro de tus prioridades.',
    clima: 'Tu brújula apunta a la energía limpia y a la protección del entorno.',
    movilidad: 'Quieres moverte mejor: transporte público, tren y calles más seguras.',
    derechos: 'Defiendes los derechos sociales, la igualdad y el cuidado a los demás.',
    democracia: 'Te importan la transparencia, la justicia y la calidad de la democracia.',
    tecnologia: 'Mirás la tecnología desde los derechos digitales y la privacidad.',
    cultura: 'Cultura, deporte y vida local también son parte de tu agenda.'
  };

  var guardado = cargar();
  var estado = {
    pagina: 'inicio',
    modo: guardado.modo || 'rapido',
    preguntas: [],
    indice: 0,
    respuestas: guardado.respuestas || {},
    filtroTema: 'todos',
    busqueda: '',
    soloFav: false,
    favoritos: guardado.favoritos || [],
    videoIndice: -1,
    reproductor: null,
    intervaloVideo: null
  };

  function cargar() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; }
    catch (e) { return {}; }
  }
  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        modo: estado.modo, respuestas: estado.respuestas, indice: estado.indice,
        favoritos: estado.favoritos, completado: !!guardado.completado,
        videoId: guardado.videoId, tema: guardado.tema
      }));
    } catch (e) { /* almacenamiento no disponible: la app sigue funcionando */ }
  }
  function $(id) { return document.getElementById(id); }
  function n(id) { return $(id); }
  function aviso(texto) {
    var t = $('toast');
    t.textContent = texto;
    t.classList.add('visible');
    clearTimeout(aviso.tiempo);
    aviso.tiempo = setTimeout(function () { t.classList.remove('visible'); }, 2600);
  }
  function elegirModo(modo) {
    estado.modo = modo;
    Array.prototype.forEach.call(document.querySelectorAll('.modo'), function (b) {
      var activo = b.dataset.modo === modo;
      b.classList.toggle('seleccionado', activo);
      b.setAttribute('aria-checked', activo ? 'true' : 'false');
    });
    $('continuarTest').hidden = Object.keys(estado.respuestas).length === 0;
  }

  /* Navegación */
  function mostrar(id) {
    estado.pagina = id;
    Array.prototype.forEach.call(document.querySelectorAll('.pagina'), function (p) {
      p.classList.toggle('activa', p.id === 'pagina-' + id);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.nav button'), function (b) {
      b.classList.toggle('activo', b.dataset.tab === id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (id === 'resultados' && guardado.completado) pintarResultado();
    if (id === 'propuestas') pintarPropuestas();
    if (id === 'video') activarVideo();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
    b.addEventListener('click', function () { mostrar(b.dataset.tab); });
  });

  /* Tema claro/oscuro */
  if (guardado.tema === 'oscuro' || (!guardado.tema && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-tema', 'oscuro');
  }
  $('temaBoton').addEventListener('click', function () {
    var oscuro = document.documentElement.getAttribute('data-tema') === 'oscuro';
    if (oscuro) document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', 'oscuro');
    guardado.tema = oscuro ? 'claro' : 'oscuro';
    guardar();
  });

  /* Vídeo */
  function idYoutube(texto) {
    if (!texto) return '';
    var s = texto.trim();
    var m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(s) ? s : '';
  }
  function videoOficial() {
    return !CONF.localVideo && !!CONF.videoId && (guardado.videoId || CONF.videoId) === CONF.videoId;
  }
  function reloj(seg) {
    seg = Math.max(0, Math.floor(seg || 0));
    return String(Math.floor(seg / 60)).padStart(2, '0') + ':' + String(seg % 60).padStart(2, '0');
  }
  function pintarVideo() {
    var marco = $('videoMarco');
    marco.textContent = '';
    var id = guardado.videoId || CONF.videoId;
    if (CONF.localVideo) {
      var v = document.createElement('video');
      v.setAttribute('controls', '');
      v.setAttribute('playsinline', '');
      v.src = 'video/video.mp4';
      marco.appendChild(v);
      $('videoAcomp').hidden = true;
    } else if (videoOficial()) {
      var div = document.createElement('div');
      div.id = 'playerYT';
      marco.appendChild(div);
      $('videoAcomp').hidden = false;
      crearReproductor();
    } else if (id) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
      f.title = 'Vídeo: noticias ilustradas, elecciones 2026';
      f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      marco.appendChild(f);
      $('videoAcomp').hidden = true;
    } else {
      var vacio = document.createElement('div');
      vacio.className = 'video-vacio';
      vacio.innerHTML = '<span class="video-icono" aria-hidden="true">▶</span><strong>Vídeo pendiente de enlazar</strong><p>Pega abajo el enlace de YouTube.</p>';
      marco.appendChild(vacio);
      $('videoAcomp').hidden = true;
    }
  }
  function cargarApiYouTube(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    window.onYouTubeIframeAPIReady = cb;
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  function crearReproductor() {
    if (!videoOficial() || !$('playerYT')) return;
    cargarApiYouTube(function () {
      if (estado.reproductor || !$('playerYT')) return;
      estado.reproductor = new window.YT.Player('playerYT', {
        videoId: CONF.videoId,
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onReady: function () { activarVideo(); },
          onError: function () { aviso('No se pudo cargar el vídeo de YouTube'); }
        }
      });
    });
  }
  function destruirReproductor() {
    if (estado.intervaloVideo) { clearInterval(estado.intervaloVideo); estado.intervaloVideo = null; }
    if (estado.reproductor && estado.reproductor.destroy) {
      try { estado.reproductor.destroy(); } catch (e) {}
    }
    estado.reproductor = null;
    estado.videoIndice = -1;
  }
  function activarVideo() {
    if (!videoOficial() || !estado.reproductor) return;
    if (!estado.intervaloVideo) estado.intervaloVideo = setInterval(revisarTiempoVideo, 400);
    revisarTiempoVideo();
  }
  function revisarTiempoVideo() {
    var r = estado.reproductor;
    if (!r || typeof r.getCurrentTime !== 'function') return;
    var t;
    try { t = r.getCurrentTime(); } catch (e) { return; }
    if (typeof t !== 'number') return;
    var idx = -1;
    for (var i = 0; i < propuestas.length; i++) {
      var pt = propuestas[i].t;
      if (pt == null) continue;
      if (pt <= t) idx = i; else break;
    }
    if (t < CONF.videoInicio) idx = -1;
    if (t > CONF.videoFin) idx = propuestas.length - 1;
    if (idx >= 0 && idx !== estado.videoIndice) {
      estado.videoIndice = idx;
      pintarPropuestaVideo(idx);
    }
  }
  function pintarPropuestaVideo(idx) {
    var p = propuestas[idx];
    if (!p) return;
    $('videoNum').textContent = 'Propuesta ' + p.id + ' de ' + propuestas.length;
    $('videoTexto').textContent = p.texto;
    $('videoTiempo').textContent = reloj(p.t);
    Array.prototype.forEach.call(document.querySelectorAll('#videoAcomp [data-resp]'), function (b) {
      b.classList.toggle('elegida', estado.respuestas[p.id] === b.dataset.resp);
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('#videoAcomp [data-resp]'), function (b) {
    b.addEventListener('click', function () {
      if (estado.videoIndice < 0) return;
      var id = propuestas[estado.videoIndice].id;
      estado.respuestas[id] = b.dataset.resp;
      guardar();
      pintarPropuestaVideo(estado.videoIndice);
    });
  });
  $('videoAnterior').addEventListener('click', function () {
    var idx = Math.max(0, estado.videoIndice - 1);
    if (estado.reproductor && propuestas[idx] && propuestas[idx].t != null && estado.reproductor.seekTo) {
      estado.reproductor.seekTo(propuestas[idx].t, true);
    }
  });
  $('videoTerminar').addEventListener('click', function () {
    guardado.completado = true;
    guardar();
    $('navResultados').hidden = false;
    mostrar('resultados');
  });
  $('videoForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = idYoutube($('videoUrl').value);
    if (!id) { aviso('No he reconocido ese enlace de YouTube'); return; }
    guardado.videoId = id;
    guardar();
    destruirReproductor();
    pintarVideo();
    aviso('Vídeo cargado');
  });
  $('videoQuitar').addEventListener('click', function () {
    guardado.videoId = '';
    CONF.videoId = '';
    $('videoUrl').value = '';
    guardar();
    destruirReproductor();
    pintarVideo();
  });
  if (guardado.videoId) $('videoUrl').value = guardado.videoId;
  pintarVideo();

  /* Test */
  function construirPreguntas() {
    if (estado.modo === 'completo') return propuestas.map(function (p) { return p.id; });
    var ids = [];
    DATA.temas.forEach(function (t) {
      var delTema = propuestas.filter(function (p) { return p.tema === t.id; });
      if (!delTema.length) return;
      var a = delTema[Math.min(1, delTema.length - 1)];
      var b = delTema[Math.min(6, delTema.length - 1)];
      ids.push(a.id);
      if (b.id !== a.id) ids.push(b.id);
    });
    return ids;
  }
  function empezar(continuar) {
    var tiene = Object.keys(estado.respuestas).length > 0;
    if (!continuar && tiene && !window.confirm('Empezar de cero borra tus respuestas anteriores. ¿Continuar?')) return;
    estado.preguntas = construirPreguntas();
    if (!continuar) { estado.respuestas = {}; guardado.completado = false; }
    var guardados = Object.keys(estado.respuestas).filter(function (k) {
      return estado.preguntas.indexOf(Number(k)) !== -1;
    });
    estado.indice = continuar ? Math.min(guardados.length, estado.preguntas.length - 1) : 0;
    $('testInicio').hidden = true;
    $('testJuego').hidden = false;
    guardar();
    pintarPregunta();
  }
  $('empezarTest').addEventListener('click', function () { empezar(false); });
  $('continuarTest').addEventListener('click', function () { empezar(true); });
  Array.prototype.forEach.call(document.querySelectorAll('.modo'), function (b) {
    b.addEventListener('click', function () { elegirModo(b.dataset.modo); });
  });
  elegirModo(estado.modo);

  function pintarPregunta() {
    var id = estado.preguntas[estado.indice];
    var p = propuestas[id - 1];
    var t = temas[p.tema];
    var total = estado.preguntas.length;
    $('numeroPregunta').textContent = String(estado.indice + 1).padStart(2, '0') + ' / ' + total;
    $('textoPregunta').textContent = p.texto;
    $('progresoTexto').textContent = 'Pregunta ' + (estado.indice + 1) + ' de ' + total;
    $('progresoBloque').textContent = t.icono + ' ' + t.nombre;
    $('progresoRelleno').style.width = (estado.indice / total * 100) + '%';
    Array.prototype.forEach.call(document.querySelectorAll('.respuesta'), function (b) {
      b.classList.toggle('elegida', estado.respuestas[id] === b.dataset.resp);
    });
    $('volverPregunta').disabled = estado.indice === 0;
  }
  function responder(resp) {
    var id = estado.preguntas[estado.indice];
    estado.respuestas[id] = resp;
    if (estado.indice === estado.preguntas.length - 1) {
      terminar();
    } else {
      estado.indice++;
      guardar();
      pintarPregunta();
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('.respuesta'), function (b) {
    b.addEventListener('click', function () { responder(b.dataset.resp); });
  });
  $('volverPregunta').addEventListener('click', function () {
    if (estado.indice > 0) { estado.indice--; guardar(); pintarPregunta(); }
  });
  document.addEventListener('keydown', function (e) {
    if (estado.pagina !== 'test' || $('testJuego').hidden) return;
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === '1') responder('si');
    else if (e.key === '2') responder('no');
    else if (e.key === '3') responder('ns');
    else if (e.key === 'ArrowLeft' && estado.indice > 0) $('volverPregunta').click();
  });

  function terminar() {
    guardado.completado = true;
    guardar();
    $('navResultados').hidden = false;
    $('testJuego').hidden = true;
    $('testInicio').hidden = false;
    mostrar('resultados');
    aviso('Test terminado: aquí está tu resultado');
  }
  $('repetirTest').addEventListener('click', function () {
    if (!window.confirm('¿Borrar tus respuestas y empezar otro test?')) return;
    estado.respuestas = {};
    guardado.completado = false;
    $('navResultados').hidden = true;
    $('testJuego').hidden = true;
    $('testInicio').hidden = false;
    guardar();
    elegirModo(estado.modo);
    mostrar('test');
  });

  /* Resultado */
  function pintarResultado() {
    var si = 0, no = 0, ns = 0;
    var porTema = {};
    DATA.temas.forEach(function (t) { porTema[t.id] = { si: 0, no: 0, ns: 0 }; });
    Object.keys(estado.respuestas).forEach(function (k) {
      var p = propuestas[Number(k) - 1];
      if (!p) return;
      var r = estado.respuestas[k];
      var c = porTema[p.tema];
      if (r === 'si') { si++; c.si++; }
      else if (r === 'no') { no++; c.no++; }
      else { ns++; c.ns++; }
    });
    var totalSiNo = si + no;
    var pct = totalSiNo ? Math.round(si / totalSiNo * 100) : 0;
    $('porcentajeSi').textContent = pct + ' %';
    $('resultadoBajada').textContent = 'Has respondido ' + Object.keys(estado.respuestas).length + ' propuestas (' + ns + ' sin decidirte). Esto no es un resultado político: es un espejo de lo que te importa.';

    var orden = DATA.temas.slice().map(function (t) {
      var c = porTema[t.id], n = c.si + c.no;
      return { t: t, n: n, pct: n ? Math.round(c.si / n * 100) : -1 };
    }).sort(function (a, b) { return b.pct - a.pct; });
    var conDatos = orden.filter(function (o) { return o.n > 0; });
    $('perfilTitulo').textContent = conDatos.length ? 'Tu agenda: ' + conDatos[0].t.nombre : 'Sin datos suficientes';
    $('perfilTexto').textContent = conDatos.length
      ? perfiles[conDatos[0].t.id] + (conDatos[1] ? ' También te mueve ' + conDatos[1].t.nombre.toLowerCase() + '.' : '')
      : 'Responde alguna propuesta para ver tu fotografía.';

    var caja = $('barrasResultado');
    caja.textContent = '';
    orden.forEach(function (o) {
      var fila = document.createElement('div');
      fila.className = 'fila-barra';
      var nombre = document.createElement('span');
      nombre.textContent = o.t.icono + ' ' + o.t.nombre;
      var fondo = document.createElement('div');
      fondo.className = 'barra-fondo';
      var relleno = document.createElement('div');
      relleno.className = 'barra-relleno';
      relleno.style.background = o.t.color;
      relleno.style.width = (o.pct < 0 ? 0 : o.pct) + '%';
      fondo.appendChild(relleno);
      var valor = document.createElement('b');
      valor.textContent = o.pct < 0 ? '—' : o.pct + '%';
      fila.appendChild(nombre); fila.appendChild(fondo); fila.appendChild(valor);
      caja.appendChild(fila);
    });

    ['listaSi', 'listaNo'].forEach(function (id) {
      var lista = $(id);
      lista.textContent = '';
      var respuesta = id === 'listaSi' ? 'si' : 'no';
      var items = Object.keys(estado.respuestas).filter(function (k) { return estado.respuestas[k] === respuesta; }).slice(0, 8);
      if (!items.length) {
        var li0 = document.createElement('li'); li0.textContent = 'Ninguna todavía.'; lista.appendChild(li0);
      }
      items.forEach(function (k) {
        var p = propuestas[Number(k) - 1];
        var li = document.createElement('li');
        li.textContent = p ? p.texto : '';
        lista.appendChild(li);
      });
    });
    guardado.resultadoTexto = 'Mi test de 100 propuestas para España: ' + pct + '% de acuerdo. Mis prioridades: ' +
      conDatos.slice(0, 3).map(function (o) { return o.t.nombre; }).join(', ') + '. ' +
      (CONF.urlPublica || location.href.split('#')[0]);
  }
  $('compartirResultado').addEventListener('click', function () {
    var texto = guardado.resultadoTexto || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { aviso('Resultado copiado'); }, function () { copiarRespaldo(texto); });
    } else copiarRespaldo(texto);
  });
  function copiarRespaldo(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); aviso('Resultado copiado'); }
    catch (e) { aviso('No se pudo copiar en este navegador'); }
    document.body.removeChild(ta);
  }

  /* Catálogo de propuestas */
  function pintarPropuestas() {
    var caja = $('listaPropuestas');
    caja.textContent = '';
    var q = estado.busqueda.toLowerCase().trim();
    var lista = propuestas.filter(function (p) {
      if (estado.filtroTema !== 'todos' && p.tema !== estado.filtroTema) return false;
      if (estado.soloFav && estado.favoritos.indexOf(p.id) === -1) return false;
      return !q || p.texto.toLowerCase().indexOf(q) !== -1;
    });
    $('contadorPropuestas').textContent = lista.length + ' de 100 propuestas';
    if (!lista.length) {
      var vacio = document.createElement('li');
      vacio.className = 'vacio-lista';
      vacio.textContent = 'No hay propuestas con esos filtros.';
      caja.appendChild(vacio);
      return;
    }
    lista.forEach(function (p) {
      var t = temas[p.tema];
      var li = document.createElement('li');
      li.className = 'propuesta';
      li.style.setProperty('--color-tema', t.color);
      var num = document.createElement('span');
      num.className = 'propuesta-num';
      num.textContent = String(p.id).padStart(3, '0');
      var txt = document.createElement('div');
      txt.className = 'propuesta-texto';
      var strong = document.createElement('strong');
      strong.textContent = p.texto;
      var small = document.createElement('small');
      small.textContent = t.icono + ' ' + t.nombre;
      txt.appendChild(strong); txt.appendChild(small);
      var fav = document.createElement('button');
      var esFav = estado.favoritos.indexOf(p.id) !== -1;
      fav.className = 'favorita' + (esFav ? ' si' : '');
      fav.textContent = esFav ? '♥' : '♡';
      fav.setAttribute('aria-label', (esFav ? 'Quitar de favoritas: ' : 'Guardar en favoritas: ') + p.texto);
      fav.addEventListener('click', function () {
        var i = estado.favoritos.indexOf(p.id);
        if (i === -1) estado.favoritos.push(p.id); else estado.favoritos.splice(i, 1);
        guardar();
        pintarPropuestas();
      });
      li.appendChild(num); li.appendChild(txt); li.appendChild(fav);
      caja.appendChild(li);
    });
  }
  var chips = $('filtroTemas');
  function pintarChips() {
    chips.textContent = '';
    [{ id: 'todos', nombre: 'Todos', icono: '▦' }].concat(DATA.temas).forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'chip' + (estado.filtroTema === t.id ? ' activo' : '');
      b.textContent = t.icono + ' ' + t.nombre;
      b.addEventListener('click', function () { estado.filtroTema = t.id; pintarChips(); pintarPropuestas(); });
      chips.appendChild(b);
    });
  }
  $('buscarPropuestas').addEventListener('input', function (e) { estado.busqueda = e.target.value; pintarPropuestas(); });
  $('soloFavoritas').addEventListener('click', function () {
    estado.soloFav = !estado.soloFav;
    this.textContent = estado.soloFav ? '♥ Solo favoritas' : '♡ Solo favoritas';
    pintarPropuestas();
  });
  pintarChips();

  /* Limpieza */
  $('borrarDatos').addEventListener('click', function () {
    if (!window.confirm('Se borrarán tus respuestas, favoritos, resultado y vídeo guardado. ¿Continuar?')) return;
    localStorage.removeItem(CLAVE);
    guardado = {};
    estado.respuestas = {}; estado.favoritos = []; estado.indice = 0;
    $('navResultados').hidden = true;
    $('testJuego').hidden = true; $('testInicio').hidden = false;
    $('videoUrl').value = '';
    elegirModo('rapido');
    pintarVideo(); pintarPropuestas();
    aviso('Datos locales borrados');
    mostrar('inicio');
  });

  if (guardado.completado) $('navResultados').hidden = false;
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
