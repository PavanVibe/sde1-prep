(function () {
  'use strict';

  var VIEWS = [
    { id: 'today', label: 'Today' },
    { id: 'weekly', label: 'Weekly goals' },
    { id: 'readiness', label: 'Readiness' },
    { id: 'dsa', label: 'DSA' },
    { id: 'weaknesses', label: 'Weaknesses' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'stories', label: 'Stories' },
    { id: 'gate', label: 'Gate' },
    { id: 'log', label: 'Change log' }
  ];

  var MEANING = {
    'NOT STARTED': 'No meaningful study or evidence yet.',
    'LEARNING': 'Actively learning; understanding is incomplete.',
    'PRACTICING': 'Can apply it with practice, but not yet reliably.',
    'UNDERSTOOD': 'Explains and applies it independently in normal conditions.',
    'STRONG': 'Reliable on unfamiliar problems and follow-ups; only minor weaknesses.',
    'INTERVIEW READY': 'Shown repeatedly under interview-like conditions.'
  };

  var RESULT = {
    independent: 'Independent',
    hinted: 'Hint needed',
    solution: 'Solution used',
    unsolved: 'Not solved',
    unspecified: 'Not recorded'
  };

  var T = null, L = null, TODAY = '', SCALE = [];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


  /* ---------- note sheets (full-screen reader) ---------- */
  function inlineMd(t) {
    var parts = String(t).split('`'), out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2) { out += '<code>' + esc(parts[i]) + '</code>'; continue; }
      out += esc(parts[i]).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }
    return out;
  }
  function renderMd(md) {
    var lines = md.replace(/\r/g, '').split('\n'), html = '', i = 0, para = [];
    function flush() { if (para.length) { html += '<p>' + inlineMd(para.join(' ')) + '</p>'; para = []; } }
    while (i < lines.length) {
      var ln = lines[i];
      if (/^```/.test(ln)) {
        flush(); var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>'; continue;
      }
      var h = /^(#{1,3})\s+(.*)$/.exec(ln);
      if (h) { flush(); var lv = h[1].length + 1; html += '<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>'; i++; continue; }
      if (/^\|/.test(ln)) {
        flush(); var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        var cells = function (r) { return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(rows[0]), body = rows.slice(2);
        html += '<div class="tablewrap"><table><thead><tr>' + head.map(function (c) { return '<th scope="col">' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) { return '<tr>' + cells(r).map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
        continue;
      }
      if (/^\s*[-*]\s+/.test(ln) || /^\s*\d+\.\s+/.test(ln)) {
        flush(); var ordered = /^\s*\d+\./.test(ln), items = [];
        while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) { items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, '')); i++; }
        var tag = ordered ? 'ol' : 'ul';
        html += '<' + tag + '>' + items.map(function (x) { return '<li>' + inlineMd(x) + '</li>'; }).join('') + '</' + tag + '>';
        continue;
      }
      if (!ln.trim()) { flush(); i++; continue; }
      para.push(ln.trim()); i++;
    }
    flush();
    return html;
  }
  var lastOpener = null;
  function openSheet(id, opener) {
    var sh = (T.studyNotes.sheets || []).filter(function (x) { return x.id === id; })[0];
    if (!sh) return;
    lastOpener = opener || null;
    var dlg = $('#sheet-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'sheet-dialog'; dlg.className = 'sheet-dialog';
      dlg.setAttribute('aria-labelledby', 'sheet-title');
      dlg.innerHTML = '<div class="sheet-bar"><h2 id="sheet-title"></h2><button type="button" class="close-btn" id="sheet-close">Close</button></div><article class="sheet-body" id="sheet-body" tabindex="-1"></article>';
      document.body.appendChild(dlg);
      $('#sheet-close').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('close', function () { document.documentElement.classList.remove('sheet-open'); if (lastOpener) lastOpener.focus(); });
    }
    $('#sheet-title').textContent = sh.title;
    $('#sheet-body').innerHTML = '<p class="muted">Loading the notes.</p>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.classList.add('sheet-open');
    fetch(sh.file, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(sh.file + ' returned ' + r.status); return r.text(); })
      .then(function (md) {
        md = md.replace(/^#\s+.*\n/, '');
        $('#sheet-body').innerHTML = renderMd(md);
        $('#sheet-body').scrollTop = 0; $('#sheet-body').focus();
      })
      .catch(function (e) { $('#sheet-body').innerHTML = '<p class="problem">Could not load the notes: ' + esc(e.message) + '</p>'; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sheet]');
    if (b) openSheet(b.getAttribute('data-sheet'), b);
  });

  /* ---------- helpers ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function diffDays(a, b) { return Math.round((ms(b) - ms(a)) / 86400000); }
  function addDays(s, n) { return new Date(ms(s) + n * 86400000).toISOString().slice(0, 10); }
  function fmt(s) { if (!s) return '—'; var p = s.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function fmtShort(s) { var p = s.split('-'); return +p[2] + ' ' + MON[+p[1] - 1]; }
  function fmtLong(s) {
    return new Date(ms(s)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function ago(s) {
    var d = diffDays(s, TODAY);
    if (d === 0) return 'today';
    if (d === 1) return '1 day ago';
    if (d < 0) return 'in ' + plural(-d, 'day', 'days');
    return d + ' days ago';
  }
  function sentence(st) { return st.charAt(0) + st.slice(1).toLowerCase(); }
  function level(st) { return Math.max(0, SCALE.indexOf(st)); }

  function todayIST() {
    var q = new URLSearchParams(location.search).get('today');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }

  /* ---------- small components ---------- */
  function status(st) {
    var lv = level(st);
    return '<span class="status lv' + lv + '"><span class="ladder lv' + lv + '" role="img" aria-label="' +
      esc(sentence(st)) + ', level ' + lv + ' of 5"><i></i><i></i><i></i><i></i><i></i></span>' +
      '<span class="label">' + esc(sentence(st)) + '</span></span>';
  }
  function result(r) {
    return '<span class="res ' + r + '"><span>' + esc(RESULT[r] || r) + '</span></span>';
  }
  function table(head, rows, cls, bodyId) {
    return '<div class="tablewrap"><table' + (cls ? ' class="' + cls + '"' : '') + '><thead><tr>' +
      head.map(function (h) { return '<th scope="col"' + (h.num ? ' class="num"' : '') + '>' + esc(h.t || h) + '</th>'; }).join('') +
      '</tr></thead><tbody' + (bodyId ? ' id="' + bodyId + '"' : '') + '>' + rows.join('') + '</tbody></table></div>';
  }

  /* ---------- derived data ---------- */
  function dsaCounts() {
    var c = { independent: 0, hinted: 0, solution: 0, unsolved: 0, unspecified: 0 };
    T.dsaLog.forEach(function (r) { c[r.independence] = (c[r.independence] || 0) + 1; });
    c.total = T.dsaLog.length;
    return c;
  }
  function currentWeek() {
    for (var i = 0; i < T.weeks.length; i++) {
      var w = T.weeks[i];
      if (TODAY >= w.start && TODAY <= w.end) return w;
    }
    return null;
  }
  function weekStart(n) {
    for (var i = 0; i < T.weeks.length; i++) if (T.weeks[i].week === n) return T.weeks[i].start;
    return null;
  }
  function lastEvidenceDate() {
    var d = null;
    L.entries.forEach(function (e) { if (e.kind === 'evidence' && (!d || e.date > d)) d = e.date; });
    return d;
  }
  function neglected() {
    var out = [];
    T.tracks.forEach(function (t) {
      var starts = weekStart(t.startsWeek);
      if (starts && starts > TODAY) return;
      if (!t.lastEvidence) { out.push({ track: t, why: 'No evidence logged yet' }); return; }
      var d = diffDays(t.lastEvidence, TODAY);
      if (d > 7) out.push({ track: t, why: 'Last evidence ' + d + ' days ago (' + fmt(t.lastEvidence) + ')' });
    });
    return out;
  }
  function openRetests() {
    return T.retests.filter(function (r) { return r.state === 'pending'; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  }

  /* ---------- sprint strip ---------- */
  function strip() {
    var start = T.meta.sprintStart, total = diffDays(start, T.meta.gateDate) + 1;
    var todayIdx = diffDays(start, TODAY);
    var ev = {};
    L.entries.forEach(function (e) { if (e.kind === 'evidence') ev[e.date] = true; });
    var cells = '', i, d, cls;
    for (i = 0; i < total; i++) {
      d = addDays(start, i);
      cls = [];
      if (i < todayIdx) cls.push('gone');
      if (ev[d]) cls.push('ev');
      if (i === todayIdx) cls.push('now');
      if (i === total - 1) cls.push('last');
      var tip = 'Day ' + i + ', ' + fmtLong(d) + (ev[d] ? ': evidence logged' : (i <= todayIdx ? ': no evidence logged' : ''));
      cells += '<i class="' + cls.join(' ') + '" style="--n:' + i + '" title="' + esc(tip) + '"></i>';
    }
    var weeks = '';
    T.weeks.forEach(function (w) {
      if (w.week < 1 || w.gate) return;
      var idx = diffDays(start, w.start);
      weeks += '<span class="' + (w.week % 2 ? 'odd' : '') + '" style="left:' + (idx / total * 100).toFixed(2) + '%">W' + w.week + '</span>';
    });
    var marks = '';
    T.milestones.forEach(function (m) {
      var idx = diffDays(start, m.date);
      var right = idx >= total - 2;
      marks += '<span class="' + (right ? 'right' : '') + '" style="left:' + ((idx + (right ? 1 : 0)) / total * 100).toFixed(2) + '%">' + esc(m.label) + '</span>';
    });
    return '<div class="strip-wrap"><div class="strip-marks" aria-hidden="true">' + marks + '</div>' +
      '<div class="strip" style="--cols:' + total + '" role="img" aria-label="Sprint calendar of ' + total + ' cells. Day ' + todayIdx + ' is today.">' + cells + '</div>' +
      '<div class="strip-weeks" aria-hidden="true">' + weeks + '</div>' +
      '<div class="strip-key"><span><i class="ev"></i>Evidence logged</span><span><i class="gone"></i>Past day, nothing logged</span><span><i class="now"></i>Today</span><span><i></i>Still ahead</span></div></div>';
  }

  /* ---------- views ---------- */
  var VIEW = {};


  /* ---------- weekly goals ---------- */
  var GSTATE = { done: 'At target', late: 'At target, late', partial: 'Part-way', pending: 'Not done yet', blocked: 'Blocked', missed: 'Missed' };

  function topicOf(ref) {
    var tr = T.tracks.filter(function (t) { return t.id === ref.track; })[0];
    return tr ? tr.topics.filter(function (x) { return x.name === ref.topic; })[0] : null;
  }
  function goalProgress(x) {
    if (x.refs && x.target) {
      var tl = level(x.target), sum = 0;
      x.refs.forEach(function (r) { var tp = topicOf(r); sum += Math.min(1, (tp ? level(tp.status) : 0) / tl); });
      return sum / x.refs.length;
    }
    return (x.state === 'done' || x.state === 'late') ? 1 : (x.state === 'partial' ? 0.5 : 0);
  }
  function weekStats(w) {
    var g = w.goals || [];
    var score = 0, n = { done: 0, late: 0, partial: 0, pending: 0, blocked: 0, missed: 0 };
    g.forEach(function (x) {
      var pr = goalProgress(x); x._p = pr;
      var k = pr >= 1 ? (x.state === 'late' ? 'late' : 'done') : (pr > 0 ? 'partial' : (x.refs ? (x.state === 'blocked' || x.state === 'missed' ? x.state : 'pending') : (x.state === 'partial' ? 'pending' : x.state)));
      x._k = k;
      n[x._k] = (n[x._k] || 0) + 1; score += pr;
    });
    var len = diffDays(w.start, w.end) + 1;
    var phase = TODAY > w.end ? 'past' : (TODAY < w.start ? 'future' : 'now');
    var expected = phase === 'past' ? 1 : (phase === 'future' ? 0 : Math.min(1, (diffDays(w.start, TODAY) + 1) / len));
    var pct = g.length ? score / g.length : 0;
    var newLeft = g.filter(function (x) { return x.kind === 'new' && x._p < 1; }).length;
    var rts = T.retests.filter(function (r) { return r.due >= w.start && r.due <= w.end && r.state !== 'superseded'; });
    var rtPassed = rts.filter(function (r) { return r.state === 'passed'; }).length;
    var behind = Math.round((expected * g.length - score) * 2) / 2;
    var verdict, cls;
    if (phase === 'future') { verdict = 'Upcoming'; cls = ''; }
    else if (phase === 'past') { verdict = pct >= 1 ? 'Weekly goal met' : 'Weekly goal missed'; cls = pct >= 1 ? 'ok' : 'warn'; }
    else if (behind <= 0.5) { verdict = 'On track'; cls = 'ok'; }
    else { verdict = 'Behind by ' + behind + ' ' + (behind === 1 ? 'goal' : 'goals'); cls = 'warn'; }
    return { g: g, n: n, score: score, pct: pct, expected: expected, phase: phase, newLeft: newLeft, rts: rts, rtPassed: rtPassed, verdict: verdict, cls: cls };
  }
  function goalBar(st, label) {
    var tot = st.g.length || 1;
    var seg = function (c, k) { return c > 0 ? '<i class="' + k + '" style="width:' + (c / tot * 100).toFixed(2) + '%"></i>' : ''; };
    var pd = 0, pl = 0, pp = 0; st.g.forEach(function (x) { if (x._p >= 1) { if (x._k === 'late') pl++; else pd++; } else pp += x._p; });
    var mark = st.phase === 'now' ? '<b class="expect" style="left:' + (st.expected * 100).toFixed(1) + '%" title="Where you should be today"></b>' : '';
    return '<div class="gbar" role="img" aria-label="' + esc(label) + '">' + seg(pd, 'gd') + seg(pl, 'gl') + seg(pp, 'gp') + mark + '</div>';
  }
  function overdueNow() { return T.retests.filter(function (r) { return r.state === 'pending' && r.due < TODAY; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; }); }

  function carryFor(w) {
    var goals = [];
    T.weeks.forEach(function (v) {
      if (v.week >= w.week) return;
      weekStats(v);
      (v.goals || []).forEach(function (x) { if (x.kind !== 'checkpoint' && x._p < 1) goals.push({ week: v.week, g: x }); });
    });
    var rts = T.retests.filter(function (r) { return r.state === 'pending' && r.due < w.start; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    return { goals: goals, rts: rts, n: goals.length + rts.length };
  }
  function carryHtml(w, c) {
    if (!c.n) return '<p class="okc small">Nothing carried over from earlier weeks.</p>';
    var html = '<div class="carry"><h3>Carried over from earlier weeks: ' + c.n + '</h3><p class="small muted">These are unfinished. Overdue retests block this week\'s new topics; earlier goals below target must be brought up alongside this week\'s work.</p><ul>';
    c.rts.forEach(function (r) { html += '<li><span class="late-tag">Retest ' + esc(r.id) + '</span> ' + esc(r.task) + ' <span class="muted small">(due ' + esc(fmtShort(r.due)) + ')</span></li>'; });
    c.goals.forEach(function (o) { html += '<li><span class="cw">Week ' + o.week + '</span> ' + esc(o.g.item) + ' <span class="muted small">(' + Math.round(o.g._p * 100) + '% of target' + (o.g.target ? ' ' + esc(sentence(o.g.target)) : '') + ')</span></li>'; });
    return html + '</ul></div>';
  }
  function weekSummary(w, st) {
    var pct = Math.round(st.pct * 100);
    var label = pct + '% of week ' + w.week + ' goals done';
    return '<div class="gsum">' + goalBar(st, label) +
      '<p class="gline"><span class="pill ' + st.cls + '">' + esc(st.verdict) + '</span> <strong>' + pct + '%</strong> of the week\'s targets (' + (st.n.done + st.n.late) + ' of ' + st.g.length + ' goals at target' + (st.n.partial ? ', ' + st.n.partial + ' part-way' : '') + ')' +
      (st.phase === 'now' ? '; by today you should be at ' + Math.round(st.expected * 100) + '%' : '') + '.</p>' +
      '<p class="gline small">' + (st.rts.length ? 'Retests due this week: <strong>' + st.rtPassed + ' of ' + st.rts.length + '</strong> passed. ' : '') +
      (st.phase !== 'future' ? 'New topics not done: <strong>' + st.newLeft + '</strong>' + (st.n.blocked ? ' (' + st.n.blocked + ' blocked by overdue retests)' : '') + '.' : '') + '</p></div>';
  }
  VIEW.weekly = function () {
    var html = '<h1>Weekly goals</h1><p class="lede">Each topic has a target level for the end of its week, set by where it sits in the plan: a topic that comes back later only needs a lower level the first time; a one-shot topic must reach its final level in its own week. Progress is your evidence-backed level against that target, never attempts or hours. A goal without a topic (a story draft, a checkpoint) counts when it is done. The dark tick on the current week\'s bar is where you should be by today if the week\'s goals were spread evenly.</p>';
    var od = overdueNow();
    if (od.length) {
      html += '<div class="blockers"><h2>Blocking new topics right now</h2><p class="muted small">Overdue retests stop new material until they pass. Clear these first.</p><ul class="attn">' +
        od.map(function (r) { return '<li class="late"><b>' + esc(r.id) + ': ' + esc(r.task) + '</b><span class="late-tag">' + plural(diffDays(r.due, TODAY), 'day', 'days') + ' overdue</span></li>'; }).join('') + '</ul></div>';
    }
    var sy = T.syllabus;
    if (sy) {
      html += '<h2>How much of the interview syllabus the plan covers</h2><p class="muted small">' + esc(sy.note) + '</p>' +
        table(['Area', 'Share of the interview', 'Scheduled in the plan', 'Not in the plan'], [sy.areas.map(function (a) {
          return '<tr><td><strong>' + esc(a.area) + '</strong></td><td>' + a.weight + '%</td><td><div class="gbar" style="max-width:10rem"><i class="gp" style="width:' + a.coverage + '%"></i></div><span class="sub">' + a.coverage + '%</span></td><td>' + esc(a.missing) + '</td></tr>';
        }).join('')]) +
        '<p>All weeks together schedule about <strong>' + sy.total + '%</strong> of the weighted syllabus (' + sy.byWeek.map(function (b) { return 'W' + b.week + ' ' + b.share + '%'; }).join(', ') + '). ' + esc(sy.decision) + '</p>';
    }
    html += '<h2>Week by week</h2><div class="key small"><span><i class="gd"></i>At target</span><span><i class="gl"></i>At target, late</span><span><i class="gp"></i>Part-way</span><span><i></i>Not started</span></div>';
    T.weeks.forEach(function (w) {
      var st = weekStats(w);
      var rows = st.g.map(function (x) {
        return '<tr class="gs-' + x.state + '"><td>' + esc(x.lane === 'lp' ? 'Behavioral' : x.lane === 'applied' ? 'Internship' : x.lane === 'checkpoint' ? 'Checkpoint' : x.lane === 'core' ? 'Core' : 'DSA') + (x.kind === 'retest' ? '<span class="sub">retest</span>' : '') + '</td><td><strong>' + esc(x.item) + '</strong>' + (x.quota ? '<span class="sub"><b>Quota:</b> ' + esc(x.quota) + '</span>' : '') + (x.note ? '<span class="sub">' + esc(x.note) + '</span>' : '') + '</td><td>' + (x.refs ? '<span class="sub">Target: <strong>' + esc(sentence(x.target)) + '</strong></span>' + x.refs.map(function (r) { var tp = topicOf(r); return '<span class="sub">' + esc(r.topic) + ': ' + esc(sentence(tp ? tp.status : 'NOT STARTED')) + (tp && tp.gateTarget ? ' (gate: ' + esc(sentence(tp.gateTarget)) + ')' : '') + '</span>'; }).join('') : '') + '</td><td><span class="gchip ' + x._k + '">' + esc(GSTATE[x._k]) + '</span><span class="sub">' + Math.round(x._p * 100) + '% of target</span>' + (x.doneDate ? '<span class="sub">' + esc(fmt(x.doneDate)) + '</span>' : '') + '</td></tr>';
      }).join('');
      var rtRows = st.rts.map(function (r) { return '<li>' + esc(r.id) + ' ' + esc(r.task) + ' <span class="' + (r.state === 'passed' ? 'okc' : (r.due < TODAY ? 'late-tag' : 'muted')) + '">' + esc(r.state === 'passed' ? 'passed' : r.state === 'failed' ? 'failed' : (r.due < TODAY ? 'overdue' : 'due ' + fmtShort(r.due))) + '</span></li>'; }).join('');
      var cy = carryFor(w); st = weekStats(w);
      html += '<details class="wk"' + (st.phase === 'now' ? ' open' : '') + '><summary><span class="name">' + (w.gate ? 'Gate' : 'Week ' + w.week) + (st.phase === 'now' ? ' (this week)' : '') + '<span class="sub">' + esc(fmtShort(w.start)) + ' to ' + esc(fmtShort(w.end)) + '</span></span>' +
        goalBar(st, Math.round(st.pct * 100) + '% done') + '<span class="small"><strong>' + Math.round(st.pct * 100) + '%</strong> of ' + st.g.length + ' goals</span><span><span class="pill ' + st.cls + '">' + esc(st.verdict) + '</span>' + (cy.n && st.phase !== 'past' ? '<span class="sub late-tag">' + cy.n + ' carried over</span>' : '') + '</span></summary>' +
        '<div class="body">' + (st.phase !== 'past' ? carryHtml(w, cy) : '') + weekSummary(w, st) + table(['Lane', 'Planned goal', 'Target level and where you are', 'Progress'], [rows]) +
        (rtRows ? '<h3 class="small">Retests due this week</h3><ul class="rtl small">' + rtRows + '</ul>' : '') + '</div></details>';
    });
    return { title: 'Weekly goals', html: html };
  };

  VIEW.today = function () {
    var start = T.meta.sprintStart, total = diffDays(start, T.meta.gateDate);
    var day = diffDays(start, TODAY), left = diffDays(TODAY, T.meta.gateDate);
    var wk = currentWeek();
    var big, line;
    if (day < 0) { big = '–'; line = 'The sprint starts in <strong>' + plural(-day, 'day', 'days') + '</strong>'; }
    else if (day > total) { big = String(day); line = 'Past the gate review by <strong>' + plural(day - total, 'day', 'days') + '</strong>'; }
    else { big = String(day); line = 'of <strong>' + total + '</strong> sprint days'; }
    var gateLine = left > 0 ? plural(left, 'day', 'days') + ' to the gate review on ' + fmtLong(T.meta.gateDate) : (left === 0 ? 'Gate review is today' : '');

    var html = '<h1 class="hero" aria-label="Day ' + esc(big) + ' of ' + total + '"><span class="daynum" aria-hidden="true">' + esc(big) + '</span>' +
      '<span class="dayof" aria-hidden="true">' + line + '<br>' + esc(gateLine) + '</span></h1>';
    html += strip();

    var le = lastEvidenceDate();
    var inSprint = L.entries.filter(function (e) { return e.kind === 'evidence' && e.date >= start; }).length;
    html += '<p class="lede">' + (le
      ? 'Last evidence logged: <strong>' + fmt(le) + '</strong> (' + ago(le) + '). ' + (inSprint === 0 ? 'No evidence has been logged since the sprint began on ' + fmt(start) + '. If you have done work since then, bring the answers or solutions and they get logged.' : plural(inSprint, 'evidence entry', 'evidence entries') + ' since the sprint began.')
      : 'No evidence has been logged yet.') + '</p>';

    html += '<div class="split"><div>';
    html += '<h2>' + (wk ? 'This week' + (wk.gate ? '' : ', week ' + wk.week) : 'This week') + '</h2>';
    if (wk) {
      html += '<p class="muted small">' + fmtShort(wk.start) + ' to ' + fmtShort(wk.end) + (wk.checkpoint ? '. ' + esc(wk.checkpoint) : '') + '</p><dl style="margin:0">' +
        '<div class="lane"><dt>Core topic</dt><dd>' + esc(wk.core) + '</dd></div>' +
        (wk.applied ? '<div class="lane"><dt>Applied to the internship</dt><dd>' + esc(wk.applied) + '</dd></div>' : '') +
        '<div class="lane"><dt>DSA</dt><dd>' + esc(wk.dsa) + '</dd></div>' +
        (wk.lp ? '<div class="lane"><dt>Behavioral</dt><dd>' + esc(wk.lp) + '</dd></div>' : '') + '</dl>';
      if (wk.goals) { var cyt = carryFor(wk); html += weekSummary(wk, weekStats(wk)) + carryHtml(wk, cyt) + '<p class="small"><a href="#weekly">See every week\'s goals</a></p>'; }
    } else {
      html += '<p class="empty">No roadmap week covers today.</p>';
    }
    html += '</div><div><h2>Needs attention</h2>';
    var rt = openRetests().filter(function (r) { return r.due <= addDays(TODAY, 7); });
    var ng = neglected();
    if (!rt.length && !ng.length) html += '<p class="empty">Nothing overdue or neglected.</p>';
    else {
      html += '<ul class="attn">';
      rt.forEach(function (r) {
        var d = diffDays(r.due, TODAY);
        var tag = d > 0 ? '<span class="late-tag">' + plural(d, 'day', 'days') + ' overdue</span>, due ' + fmtShort(r.due) : (d === 0 ? '<span class="late-tag">Due today</span>' : 'Due ' + fmtShort(r.due));
        html += '<li class="' + (d > 0 ? 'late' : '') + '"><b>' + esc(r.task) + '</b>' + tag + (r.weakness ? ', ' + esc(r.weakness) : '') + '<span class="sub muted small" style="display:block">' + esc(r.note) + '</span></li>';
      });
      ng.forEach(function (n) {
        html += '<li class="late"><b>' + esc(n.track.name) + ' is neglected</b>' + esc(n.why) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div></div>';

    html += '<h2>Next actions</h2><ol class="steps">' + T.nextActions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>';
    html += '<p class="muted small">Per the plan: if the planned topic has no passed evidence, do not advance. Clear the blocker first.</p>';
    return { title: 'Today', html: html };
  };

  VIEW.readiness = function () {
    var html = '<h1>Readiness</h1><p class="lede">There is no readiness percentage. The only question is what you can demonstrate right now, under interview conditions, without AI. ' + esc(T.meta.evidenceRule) + '</p>';
    html += '<h2>The six states</h2><div class="tablewrap"><table><tbody>' +
      T.statusScale.map(function (s) { return '<tr><td style="width:14rem">' + status(s) + '</td><td>' + esc(MEANING[s]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    html += '<h2>Tracks</h2>';
    var neg = {};
    neglected().forEach(function (n) { neg[n.track.id] = n.why; });
    T.tracks.forEach(function (t) {
      var counts = SCALE.map(function () { return 0; });
      t.topics.forEach(function (tp) { counts[level(tp.status)]++; });
      var bar = counts.map(function (c, i) { return c ? '<i class="c' + i + '" style="flex:' + c + '" title="' + esc(sentence(SCALE[i]) + ': ' + c) + '"></i>' : ''; }).join('');
      var parts = [];
      for (var i = SCALE.length - 1; i >= 0; i--) if (counts[i]) parts.push(counts[i] + ' ' + SCALE[i].toLowerCase());
      var rows = t.topics.map(function (tp) {
        return '<tr><td><strong>' + esc(tp.name) + '</strong>' + (tp.note ? '<span class="sub">' + esc(tp.note) + '</span>' : '') + '</td><td>' + status(tp.status) + '</td><td>' + esc(tp.evidence) + '</td><td>' + esc(fmt(tp.lastTested)) + '</td><td>' + esc(tp.next) + '</td></tr>';
      });
      html += '<details><summary><span class="name">' + esc(t.name) + '</span><span class="dist" aria-hidden="true">' + bar + '</span>' +
        '<span class="small">' + esc(parts.join(', ')) + '</span>' +
        '<span class="small">' + (t.lastEvidence ? 'Evidence ' + esc(ago(t.lastEvidence)) : 'No evidence yet') + (neg[t.id] ? '<br><span class="flag">Neglected</span>' : '') + '</span></summary>' +
        '<div class="body"><p class="note">' + esc(t.note) + '</p>' +
        table(['Topic', 'Status', 'Evidence', 'Last tested', 'Next evidence needed'], rows) + '</div></details>';
    });
    return { title: 'Readiness', html: html };
  };

  function family(p) { return p.split(/ \(| \+ /)[0]; }
  function dsaRows(pattern, res) {
    return T.dsaLog.filter(function (r) {
      return (!pattern || family(r.pattern) === pattern) && (!res || r.independence === res);
    }).map(function (r) {
      return '<tr><td class="num">' + r.lc + '</td><td><strong>' + esc(r.title) + '</strong><span class="sub">' + esc(r.difficulty) + '</span></td><td>' + esc(r.pattern) + '</td><td>' + result(r.independence) + '</td><td>' + esc(r.hint) + '</td><td>' + (r.date ? esc(fmt(r.date)) : '—') + (r.dateNote ? '<span class="sub">' + esc(r.dateNote) + '</span>' : '') + '</td><td>' + esc(r.note) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">No problems match these filters.</td></tr>';
  }

  VIEW.dsa = function () {
    var c = dsaCounts();
    var dsa = T.tracks.filter(function (t) { return t.id === 'dsa'; })[0];
    var html = '<h1>DSA in C++</h1><p class="lede">Unseen, independent solves count. Solve counts do not. A pattern advances only when an unnamed-pattern problem is recognized and solved without help.</p>';
    html += '<h2>How the logged problems were solved</h2><div class="tally">' +
      ['independent', 'hinted', 'solution', 'unsolved', 'unspecified'].map(function (k) {
        return '<div><b>' + c[k] + '</b><span>' + esc(RESULT[k]) + '</span></div>';
      }).join('') + '<div><b>' + c.total + '</b><span>Total logged</span></div></div>';
    html += '<div class="stack" role="img" aria-label="Distribution of how problems were solved">' +
      ['independent', 'hinted', 'solution', 'unsolved', 'unspecified'].map(function (k) { return c[k] ? '<i class="res-' + k + '" style="flex:' + c[k] + '"></i>' : ''; }).join('') + '</div>';
    html += '<p class="muted small">Counts only, not a score. Time, edge-case and complexity fields were not recorded for these historical rows. New entries should include them.</p>';

    html += '<h2>Patterns</h2>';
    html += table(['Pattern', 'Status', 'Evidence', 'Last tested', 'Next evidence needed'], dsa.topics.map(function (tp) {
      return '<tr><td><strong>' + esc(tp.name) + '</strong>' + (tp.note ? '<span class="sub">' + esc(tp.note) + '</span>' : '') + '</td><td>' + status(tp.status) + '</td><td>' + esc(tp.evidence) + '</td><td>' + esc(fmt(tp.lastTested)) + '</td><td>' + esc(tp.next) + '</td></tr>';
    }));

    html += '<h2>Your study notes</h2>';
    (T.studyNotes.sheets || []).forEach(function (sh) {
      html += '<div class="sheet-row"><div><h3>' + esc(sh.title) + '</h3><p class="from">' + esc(sh.summary || '') + '</p></div>' +
        '<button type="button" class="open-btn" data-sheet="' + esc(sh.id) + '" aria-haspopup="dialog">Open</button></div>';
    });
    html += '<p class="muted">' + esc(T.studyNotes.source) + '</p>';
    html += '<div class="note-card"><h3>' + esc(T.dsaTemplate.title) + '</h3><p class="from">Sliding window</p><p>' + esc(T.dsaTemplate.caution) + '</p><pre><code>' + esc(T.dsaTemplate.code) + '</code></pre></div>';
    T.studyNotes.items.forEach(function (n) {
      html += '<div class="note-card"><h3>' + esc(n.title) + '</h3><p class="from">' + esc(n.area) + '</p><p>' + esc(n.text) + '</p>' + (n.code ? '<pre><code>' + esc(n.code) + '</code></pre>' : '') + '<p class="small muted">' + esc(n.status) + '</p><p class="check"><b>Self-test.</b> ' + esc(n.check) + '</p></div>';
    });

    var patterns = []; T.dsaLog.forEach(function (r) { var f = family(r.pattern); if (patterns.indexOf(f) < 0) patterns.push(f); });
    html += '<h2>Problem log</h2><div class="filters">' +
      '<label>Pattern<select id="f-pattern"><option value="">All patterns</option>' + patterns.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</select></label>' +
      '<label>How it was solved<select id="f-res"><option value="">All results</option>' + Object.keys(RESULT).map(function (k) { return '<option value="' + k + '">' + esc(RESULT[k]) + '</option>'; }).join('') + '</select></label></div>';
    html += table([{ t: 'LC', num: true }, 'Problem', 'Pattern', 'Result', 'Hint', 'Date', 'Note'], [dsaRows('', '')], '', 'dsa-body');
    return { title: 'DSA', html: html };
  };

  VIEW.weaknesses = function () {
    var open = T.weaknesses.filter(function (w) { return w.state === 'open'; });
    var html = '<h1>Weaknesses</h1><p class="lede">A weakness closes only after an independent retest. Reading the correction, or being told the answer, does not close it. Repeated mistakes outrank isolated ones.</p>';
    html += '<h2>Open (' + open.length + ')</h2>';
    open.forEach(function (w) {
      var d = w.retestDue ? diffDays(w.retestDue, TODAY) : 0;
      var due = w.retestDue ? (d > 0 ? '<span class="pill warn">' + plural(d, 'day', 'days') + ' overdue</span> was due ' + fmtShort(w.retestDue) : 'Due ' + fmtShort(w.retestDue)) : '';
      html += '<section class="case"><div class="id">' + esc(w.id) + '</div><div><h3>' + esc(w.topic) + '</h3>' +
        '<span class="muted small">Identified ' + esc(fmt(w.identified)) + ', from ' + esc(w.source) + '</span><dl>' +
        '<dt>What went wrong</dt><dd>' + esc(w.mistake) + '</dd>' +
        '<dt>Correct reasoning</dt><dd>' + esc(w.correct) + '</dd>' +
        '<dt>Cause</dt><dd>' + esc(w.cause) + '</dd>' +
        '<dt>Corrective exercise</dt><dd>' + esc(w.exercise) + '</dd>' +
        '<dt>Retest</dt><dd><span class="pill plain">' + esc(w.retest) + '</span> ' + due + '</dd></dl></div></section>';
    });
    html += '<h2>Closed (' + T.closedWeaknesses.length + ')</h2>';
    if (!T.closedWeaknesses.length) html += '<p class="empty">Nothing closed yet. The first closure needs a passed, unaided retest logged with its date.</p>';
    else html += table(['ID', 'Topic', 'Retest result', 'Closed'], T.closedWeaknesses.map(function (w) { return '<tr><td>' + esc(w.id) + '</td><td>' + esc(w.topic) + '</td><td>' + esc(w.result) + '</td><td>' + esc(fmt(w.closed)) + '</td></tr>'; }));
    html += '<h2>Scheduled retests</h2>' + table(['Due', 'Retest', 'Weakness', 'State'], openRetests().map(function (r) {
      var d = diffDays(r.due, TODAY);
      return '<tr><td>' + esc(fmt(r.due)) + (d > 0 ? '<span class="sub flag">' + plural(d, 'day', 'days') + ' overdue</span>' : '') + '</td><td>' + esc(r.task) + '<span class="sub">' + esc(r.note) + '</span></td><td>' + esc(r.weakness || '—') + '</td><td>Pending</td></tr>';
    }));
    return { title: 'Weaknesses', html: html };
  };

  VIEW.roadmap = function () {
    var wk = currentWeek();
    var days = diffDays(T.meta.sprintStart, T.meta.gateDate);
    var html = '<h1>Roadmap</h1><p class="lede">A ' + days + '-day sprint from ' + fmt(T.meta.sprintStart) + ' (Day 0) to the gate review on ' + fmt(T.meta.gateDate) + '. ' + esc(T.scopeNote) + '</p>';

    html += '<h2>Standards that do not bend</h2><ol class="steps">' + T.standards.map(function (r) { return '<li><strong>' + esc(r.title) + '.</strong> ' + esc(r.text) + '</li>'; }).join('') + '</ol>';

    html += '<h2>What each status requires</h2><p class="muted">A status moves up only when its row is met and logged with a date.</p>' +
      table(['Applies to', 'Status', 'Evidence needed'], T.thresholds.map(function (r) {
        return '<tr><td>' + esc(r.area) + '</td><td>' + status(r.status) + '</td><td>' + esc(r.needs) + '</td></tr>';
      }));

    html += '<h2>Weekly rhythm</h2><p class="muted">' + esc(T.weeklyTime.note) + '</p><dl class="timeblocks">' +
      T.weeklyTime.blocks.map(function (b) { return '<div><dt>' + esc(b.when) + '</dt><dd>' + esc(b.what) + '</dd></div>'; }).join('') + '</dl>';
    html += '<h2>Daily DSA loop</h2><ol class="steps">' + T.weeklyTime.dailyDsa.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><p class="muted">' + esc(T.weeklyTime.target) + '</p>';

    html += '<h2>Week by week</h2><ol class="weeks">' + T.weeks.map(function (w) {
      var cls = 'week' + (w.end < TODAY ? ' past' : '') + (wk && wk.week === w.week ? ' now' : '');
      return '<li class="' + cls + '"' + (wk && wk.week === w.week ? ' aria-current="step"' : '') + '><div class="when"><b>' + (w.gate ? 'Gate' : 'Week ' + w.week) + '</b><span>' + esc(fmtShort(w.start)) + ' to ' + esc(fmtShort(w.end)) + '</span></div>' +
        '<dl class="lanes"><dt>Core topic</dt><dd>' + esc(w.core) + '</dd>' + (w.applied ? '<dt>Internship</dt><dd>' + esc(w.applied) + '</dd>' : '') + '<dt>DSA</dt><dd>' + esc(w.dsa) + '</dd>' +
        (w.lp ? '<dt>Behavioral</dt><dd>' + esc(w.lp) + '</dd>' : '') +
        (w.checkpoint ? '<dd class="cp" style="grid-column:1/-1">' + esc(w.checkpoint) + '</dd>' : '') + '</dl></li>';
    }).join('') + '</ol>';

    html += '<h2>When you fall behind</h2><p class="muted">Cut in this order, and never by adding hours.</p><ol class="steps">' +
      T.cutLadder.order.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ol><p>' + esc(T.cutLadder.never) + '</p><p class="muted">' + esc(T.cutLadder.alreadyCut) + '</p>';
    if (T.portfolio) html += '<h2>' + esc(T.portfolio.title) + '</h2><p>' + esc(T.portfolio.body) + '</p>';
    html += '<h2>Resume rules</h2><ul class="steps">' + T.resumeRules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>';
    return { title: 'Roadmap', html: html };
  };

  VIEW.stories = function () {
    var html = '<h1>Interview stories</h1><p class="lede">A bank of real experiences only.</p><ul class="steps">' + T.storyRules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>';
    html += '<h2>Story inventory</h2>' + table(['ID', 'Source', 'Status', 'Principles', 'Evidence needed'], T.stories.map(function (s) {
      return '<tr><td><strong>' + esc(s.id) + '</strong></td><td>' + esc(s.source) + '</td><td><span class="pill plain">' + esc(sentence(s.status)) + '</span></td><td>' + esc(s.lps) + '</td><td>' + esc(s.needed) + '</td></tr>';
    }));
    html += '<h2>How a story advances</h2><ol class="steps">' + T.storyStages.map(function (s) { return '<li><strong>' + esc(s.name) + '.</strong> ' + esc(s.means) + '</li>'; }).join('') + '</ol>';
    html += '<h2>Leadership principle coverage</h2>' + table(['Principle', 'Strong story', 'Backup story', 'Status'], T.leadershipPrinciples.map(function (p) {
      return '<tr><td>' + esc(p) + '</td><td class="muted">—</td><td class="muted">—</td><td>' + status('NOT STARTED') + '</td></tr>';
    }));
    return { title: 'Stories', html: html };
  };

  VIEW.gate = function () {
    var left = diffDays(TODAY, T.gate.date);
    var c = dsaCounts();
    var html = '<h1>Gate review</h1><p class="lede">' + fmtLong(T.gate.date) + (left > 0 ? ', ' + plural(left, 'day', 'days') + ' away. ' : '. ') + esc(T.gate.note) + '</p>';
    html += '<h2>Required evidence</h2>';
    T.gate.requirements.forEach(function (r) {
      html += '<section class="req"><h3>' + esc(r.area) + '</h3><div><p><strong>Required:</strong> ' + esc(r.required) + '</p><p class="muted"><strong>So far:</strong> ' + esc(r.current.replace('{{dsa.independent}}', c.independent)) + '</p></div><div><span class="pill warn">Not met</span></div></section>';
    });
    return { title: 'Gate', html: html };
  };

  function logEntries(kind) {
    var out = L.entries.filter(function (e) { return !kind || e.kind === kind; }).map(function (e) {
      var changes = (e.changes || []).map(function (c) {
        return '<div><span class="muted">' + esc(c.track) + ', ' + esc(c.topic) + ':</span> ' + status(c.from) + '<span class="muted">to</span>' + status(c.to) + '</div>';
      }).join('');
      return '<article class="entry"><div><span class="date">' + esc(fmt(e.date)) + '</span><span class="kind"><span class="pill plain">' + esc(L.kinds[e.kind] || e.kind) + '</span></span></div><div><h3>' + esc(e.summary) + '</h3>' +
        (changes ? '<div class="changes">' + changes + '</div>' : '') +
        ((e.details && e.details.length) ? '<ul>' + e.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') + '</div></article>';
    });
    return out.join('') || '<p class="empty">No entries of this kind.</p>';
  }

  VIEW.log = function () {
    var html = '<h1>Change log</h1><p class="lede">Every change to a status, weakness, plan or this site is an entry here, newest first, and a commit in the repository history. ' + esc(T.meta.sources) + '</p>';
    html += '<div class="filters"><label>Show<select id="f-kind"><option value="">All entries</option>' + Object.keys(L.kinds).map(function (k) { return '<option value="' + k + '">' + esc(L.kinds[k]) + '</option>'; }).join('') + '</select></label></div>';
    html += '<div id="log-list">' + logEntries('') + '</div>';
    return { title: 'Change log', html: html };
  };

  var BIND = {
    dsa: function () {
      function upd() { $('#dsa-body').innerHTML = dsaRows($('#f-pattern').value, $('#f-res').value); }
      $('#f-pattern').addEventListener('change', upd);
      $('#f-res').addEventListener('change', upd);
    },
    log: function () {
      $('#f-kind').addEventListener('change', function (e) { $('#log-list').innerHTML = logEntries(e.target.value); });
    }
  };

  /* ---------- shell ---------- */
  function buildNav(active) {
    var open = T.weaknesses.filter(function (w) { return w.state === 'open'; }).length;
    $('#nav').innerHTML = VIEWS.map(function (v) {
      var badge = v.id === 'weaknesses' && open ? '<span class="count" aria-label="' + open + ' open">' + open + '</span>' : '';
      return '<a href="#' + v.id + '"' + (v.id === active ? ' aria-current="page"' : '') + '>' + esc(v.label) + badge + '</a>';
    }).join('');
  }

  function route(first) {
    var id = (location.hash || '#today').slice(1);
    if (!VIEW[id]) id = 'today';
    var v = VIEW[id]();
    var main = $('#main');
    main.innerHTML = v.html;
    document.title = v.title + ' | ' + T.meta.title;
    buildNav(id);
    if (BIND[id]) BIND[id]();
    if (!first) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }

  function boot(t, l) {
    T = t; L = l; SCALE = T.statusScale; TODAY = todayIST();
    $('#brand-sub').textContent = T.meta.target + ', ' + T.meta.candidate;
    var q = new URLSearchParams(location.search).get('today');
    $('#rail-foot').textContent = (q ? 'Viewing as of ' : 'Ledger updated ') + fmt(q ? TODAY : T.meta.lastUpdated);
    route(true);
    window.addEventListener('hashchange', function () { route(false); });
  }

  function fail(msg) {
    var m = $('#main');
    m.innerHTML = '<p class="problem">' + esc(msg) + '</p><p>The ledger reads data/tracker.json and data/changelog.json. Open the site through GitHub Pages or a local server (for example <code>python3 -m http.server</code>); browsers block these reads on file:// addresses.</p>';
  }

  Promise.all([
    fetch('data/tracker.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('tracker.json returned ' + r.status); return r.json(); }),
    fetch('data/changelog.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('changelog.json returned ' + r.status); return r.json(); })
  ]).then(function (d) { boot(d[0], d[1]); }).catch(function (e) { fail('Could not load the ledger data: ' + e.message); });
})();
