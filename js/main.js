/* TrivoxIA — interações da landing page */
(function () {
  'use strict';

  /* ---------- header ---------- */
  var header = document.querySelector('.header');
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById('nav-burger');
  burger.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () {
      header.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- tabs do painel demo ---------- */
  var tabs = document.querySelectorAll('.demo-tab');
  var views = document.querySelectorAll('.demo-view');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      views.forEach(function (v) {
        v.classList.toggle('active', v.dataset.view === tab.dataset.view);
      });
    });
  });

  /* ---------- demo de chat ---------- */
  var chatBody = document.getElementById('chat-body');
  var chatQuick = document.getElementById('chat-quick');
  var replayBtn = document.getElementById('chat-replay');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var script = [
    { who: 'in',  text: 'Oi! Vocês fazem limpeza de pele?' },
    { who: 'out', text: 'Oi! 😊 Fazemos sim. Quer agendar uma avaliação gratuita com a nossa esteticista?' },
    { who: 'in',  text: 'Quero! Pode ser sexta de manhã?' },
    { who: 'out', text: 'Perfeito! Tenho sexta às 9h30 ou às 11h. Qual você prefere?', event: 3 },
    { who: 'in',  text: '9h30, por favor' },
    { who: 'out', text: 'Agendado! ✅ Sexta às 9h30. Um dia antes eu te envio um lembrete por aqui. Até lá! 💜', event: 5 },
    { who: 'sys', text: 'Consulta criada na agenda · Lead registrado no CRM', event: 6 }
  ];

  var quickReplies = [
    { q: 'E se eu precisar remarcar?', a: 'Sem problema! É só me chamar aqui que eu remarco na hora, sem burocracia. 😉' },
    { q: 'Quais formas de pagamento?', a: 'Aceitamos Pix, cartão em até 12x e dinheiro. Posso te explicar os valores de cada tratamento também!' },
    { q: 'Atendem aos sábados?', a: 'Atendemos sim, aos sábados das 8h às 12h. Quer que eu veja um horário pra você?' }
  ];

  var chatTimers = [];
  var chatStarted = false;

  function wait(ms) { return reduceMotion ? 0 : ms; }

  function later(fn, ms) {
    var t = setTimeout(fn, wait(ms));
    chatTimers.push(t);
  }

  function scrollChat() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addMsg(who, text) {
    var el = document.createElement('div');
    if (who === 'sys') {
      el.className = 'msg-sys';
      el.innerHTML = '<svg width="13" height="13"><use href="#i-check"/></svg> ' + text;
    } else {
      el.className = 'msg msg-' + who;
      el.innerHTML = who === 'out' ? '<span class="msg-tag">TrivoxIA</span>' + text : text;
    }
    chatBody.appendChild(el);
    scrollChat();
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    chatBody.appendChild(t);
    scrollChat();
    return t;
  }

  function fireEvent(step) {
    var ev = document.querySelector('.side-event[data-step="' + step + '"]');
    if (ev) ev.classList.add('on');
  }

  function playStep(i) {
    if (i >= script.length) { showQuickReplies(); return; }
    var m = script[i];
    if (m.who === 'out') {
      var typing = showTyping();
      later(function () {
        typing.remove();
        addMsg(m.who, m.text);
        if (m.event) fireEvent(m.event);
        later(function () { playStep(i + 1); }, 700);
      }, 1000);
    } else {
      addMsg(m.who, m.text);
      if (m.event) fireEvent(m.event);
      later(function () { playStep(i + 1); }, m.who === 'sys' ? 500 : 800);
    }
  }

  function showQuickReplies() {
    chatQuick.innerHTML = '';
    quickReplies.forEach(function (qr) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = qr.q;
      b.addEventListener('click', function () {
        b.remove();
        addMsg('in', qr.q);
        var typing = showTyping();
        later(function () {
          typing.remove();
          addMsg('out', qr.a);
        }, 900);
      });
      chatQuick.appendChild(b);
    });
  }

  function resetChat() {
    chatTimers.forEach(clearTimeout);
    chatTimers = [];
    chatBody.innerHTML = '';
    chatQuick.innerHTML = '';
    document.querySelectorAll('.side-event').forEach(function (e) { e.classList.remove('on'); });
  }

  function startChat() {
    resetChat();
    later(function () { playStep(0); }, 400);
  }

  replayBtn.addEventListener('click', startChat);

  var demo = document.getElementById('demo');
  var demoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !chatStarted) {
        chatStarted = true;
        startChat();
        demoObserver.disconnect();
      }
    });
  }, { threshold: 0.25 });
  demoObserver.observe(demo);

  /* ---------- faq ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.querySelector('.faq-q').addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.faq-q').setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- reveal on scroll ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

  /* ---------- contadores ---------- */
  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    var prefix = el.dataset.prefix || (target < 0 ? '' : '');
    var suffix = el.dataset.suffix || '';
    var decimals = parseInt(el.dataset.decimal || '0', 10);
    var duration = 1300;
    var start = null;

    function format(v) {
      var s = Math.abs(v).toFixed(decimals).replace('.', ',');
      return (el.dataset.prefix || '') + (target < 0 ? '-' : '') + s + suffix;
    }
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = format(target);
    }
    if (reduceMotion) { el.textContent = format(target); return; }
    requestAnimationFrame(frame);
  }
  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-val[data-count]').forEach(function (el) { statObserver.observe(el); });

  /* ---------- formulário → n8n ---------- */
  var form = document.getElementById('contact-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var submitBtn = form.querySelector('.form-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    var fd = new FormData(form);
    var payload = {
      nome: fd.get('nome'),
      email: fd.get('email'),
      whatsapp: fd.get('whatsapp'),
      automatizar: fd.get('automatizar'),
      origem: 'site-trivoxia',
      enviado_em: new Date().toISOString()
    };

    fetch('https://n8n.trivoxia.com/webhook/site-trivoxia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () { /* confirma mesmo com erro de rede */ }).finally(function () {
      form.querySelector('.form-success').hidden = false;
    });
  });
})();
