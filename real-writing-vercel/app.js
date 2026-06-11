// Firebase Config
var firebaseConfig = {
  apiKey: "AIzaSyBddgTRxwSs9fGxIc1hx78XnewPbeij8Bk",
  authDomain: "real-writing.firebaseapp.com",
  projectId: "real-writing",
  storageBucket: "real-writing.firebasestorage.app",
  messagingSenderId: "909052997133",
  appId: "1:909052997133:web:e3e7e9ed1ece09982fef44"
};
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();
var TEACHER_EMAILS = ['rachel0030@gmail.com'];
var currentUser = null;

// Handle redirect result
auth.getRedirectResult().then(function(result) {
  if (result && result.user) {
    console.log('Redirect login OK:', result.user.email);
  }
}).catch(function(e) {
  console.warn('redirect result:', e.message);
});

auth.onAuthStateChanged(function(user) {
  console.log('Auth state changed:', user ? user.email : 'null');
  if (user) {
    currentUser = user;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
    var ts = document.getElementById('teacherScreen');
    if (ts) ts.style.display = 'none';
    if (TEACHER_EMAILS.includes(user.email)) {
      console.log('Teacher detected:', user.email);
      showTeacherDashboard();
    } else {
      console.log('Student detected:', user.email);
      var ls = document.getElementById('levelScreen');
      ls.style.display = 'flex';
      ls.style.flexDirection = 'column';
      ls.style.alignItems = 'center';
    }
  } else {
    // 코드 로그인(학생)은 Firebase Auth를 쓰지 않으므로 무시
    if (currentUser && currentUser.isStudent) return;
    currentUser = null;
    var login = document.getElementById('loginScreen');
    login.style.display = 'flex';
    login.style.flexDirection = 'column';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
    var ts = document.getElementById('teacherScreen');
    if (ts) ts.style.display = 'none';
  }
});

function signInWithGoogle() {
  var e = document.getElementById('loginError');
  e.textContent = '구글 로그인 창 열리는 중...';
  e.style.display = 'block';
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(function(result) {
    e.style.display = 'none';
  }).catch(function(err) {
    // If popup blocked, try redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      e.textContent = '팝업이 차단됐어요. 리디렉트로 시도 중...';
      auth.signInWithRedirect(provider);
    } else {
      e.textContent = '로그인 실패: ' + err.message;
    }
  });
}

function signOut() { auth.signOut(); }

function loginWithCode() {
  var code = document.getElementById('studentCodeInput').value.trim().toUpperCase();
  var e = document.getElementById('codeError');
  if (!code) { e.textContent = '코드를 입력해주세요!'; e.style.display = 'block'; return; }
  e.textContent = '확인 중...'; e.style.display = 'block';
  db.collection('students').where('code', '==', code).limit(1).get().then(function(snap) {
    if (snap.empty) { e.textContent = '코드를 찾을 수 없어요. 선생님께 확인해주세요!'; return; }
    var doc = snap.docs[0], data = doc.data();
    currentUser = { uid: doc.id, displayName: data.name, email: data.code + '@student', photoURL: '', isStudent: true, studentData: data };
    lv = data.level || 1;
    document.getElementById('loginScreen').style.display = 'none';
    var ls = document.getElementById('levelScreen');
    ls.style.display = 'flex'; ls.style.flexDirection = 'column'; ls.style.alignItems = 'center';
    selLv(lv);
  }).catch(function(err) { e.textContent = '오류: ' + err.message; });
}

function saveRecord(wrapUp) {
  if (!currentUser) return;
  var now = new Date();
  var tuid = (currentUser.isStudent && currentUser.studentData) ? (currentUser.studentData.teacherUid || '') : currentUser.uid;
  db.collection('records').add({
    uid: currentUser.uid, studentId: currentUser.uid, teacherUid: tuid,
    name: currentUser.displayName || '학생', email: currentUser.email, photo: currentUser.photoURL || '',
    date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    level: lv, levelName: LVCONF[lv].name, topic: topic.ko, topicEn: topic.en,
    sentences: sentences.map(function(s) { return { q: s.q, eng: s.eng, corr: s.corr }; }),
    story: storyFinal, wrapUp: wrapUp, score: score
  }).then(function() { console.log('Saved!'); }).catch(function(e) { console.warn(e); });
}

function showTeacherDashboard() {
  var ts = document.getElementById('teacherScreen');
  ts.style.display = 'flex'; ts.style.flexDirection = 'column';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('levelScreen').style.display = 'none';
  loadDashboard();
}

function showTeacherTab(tab) {
  var dc = document.getElementById('tabDashContent');
  var sc = document.getElementById('tabStudentsContent');
  dc.style.display = tab === 'dashboard' ? 'flex' : 'none';
  dc.style.flexDirection = 'column';
  sc.style.display = tab === 'students' ? 'flex' : 'none';
  sc.style.flexDirection = 'column';
  var td = document.getElementById('tabDash');
  var ts = document.getElementById('tabStudents');
  td.style.background = tab === 'dashboard' ? '#5B5FFF' : '#fff';
  td.style.color = tab === 'dashboard' ? '#fff' : '#6B7280';
  td.style.border = tab === 'dashboard' ? 'none' : '1.5px solid #E5E7EB';
  ts.style.background = tab === 'students' ? '#5B5FFF' : '#fff';
  ts.style.color = tab === 'students' ? '#fff' : '#6B7280';
  ts.style.border = tab === 'students' ? 'none' : '1.5px solid #E5E7EB';
  if (tab === 'students') loadStudentMgmt();
}

function mkDiv(style, content) {
  return '<div style="' + style + '">' + content + '</div>';
}

function loadDashboard() {
  document.getElementById('teacherStats').innerHTML = mkDiv('grid-column:1/-1;text-align:center;padding:20px;color:#6B7280', '불러오는 중...');
  db.collection('records').orderBy('timestamp', 'desc').limit(200).get().then(function(snap) {
    var recs = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    var today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    var studs = new Set(recs.map(function(r) { return r.uid; })).size;
    var avg = recs.length ? Math.round(recs.reduce(function(a, r) { return a + (r.score || 0); }, 0) / recs.length) : 0;
    var tod = recs.filter(function(r) { return r.date === today; }).length;

    document.getElementById('teacherStats').innerHTML =
      mkDiv('background:#EEEFFE;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#5B5FFF', studs) + mkDiv('font-size:13px;color:#6B7280', '총 학생')) +
      mkDiv('background:#DCFCE7;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#22C55E', recs.length) + mkDiv('font-size:13px;color:#6B7280', '총 학습')) +
      mkDiv('background:#FEF3C7;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#F59E0B', avg) + mkDiv('font-size:13px;color:#6B7280', '평균점수')) +
      mkDiv('background:#FFF0EB;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#FF6B35', tod) + mkDiv('font-size:13px;color:#6B7280', '오늘'));

    db.collection('students').where('teacherUid', '==', currentUser.uid).get().then(function(ss) {
      var tot = ss.size;
      var ruids = recs.map(function(r) { return r.studentId || r.uid; });
      var done = ss.docs.filter(function(d) { return ruids.includes(d.id); }).length;
      document.getElementById('assignmentOverview').innerHTML = tot > 0 ?
        mkDiv('background:#fff;border-radius:14px;padding:16px;border:1.5px solid #E5E7EB;margin-bottom:4px',
          mkDiv('font-weight:700;font-size:14px;margin-bottom:10px', '과제 현황') +
          mkDiv('display:flex;gap:10px',
            mkDiv('flex:1;background:#DCFCE7;border-radius:12px;padding:12px;text-align:center', mkDiv('font-size:22px;font-weight:800;color:#22C55E', done) + mkDiv('font-size:12px;color:#166534', '완료')) +
            mkDiv('flex:1;background:#FEF2F2;border-radius:12px;padding:12px;text-align:center', mkDiv('font-size:22px;font-weight:800;color:#EF4444', tot - done) + mkDiv('font-size:12px;color:#991B1B', '미학습')) +
            mkDiv('flex:1;background:#EEEFFE;border-radius:12px;padding:12px;text-align:center', mkDiv('font-size:22px;font-weight:800;color:#5B5FFF', tot) + mkDiv('font-size:12px;color:#3730A3', '전체'))
          )
        ) : '';

      var by = {};
      recs.forEach(function(r) {
        if (!by[r.uid]) by[r.uid] = { name: r.name || '학생', email: r.email || '', recs: [] };
        by[r.uid].recs.push(r);
      });
      var keys = Object.keys(by);
      if (!keys.length) {
        document.getElementById('teacherList').innerHTML = mkDiv('text-align:center;padding:40px;color:#6B7280', '아직 학습 기록이 없어요!');
        return;
      }
      var listEl = document.getElementById('teacherList');
      listEl.innerHTML = '';
      keys.forEach(function(uid, i) {
        var s = by[uid];
        var avg2 = Math.round(s.recs.reduce(function(a, r) { return a + (r.score || 0); }, 0) / s.recs.length);
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:16px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:8px;';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'padding:14px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;';
        hdr.innerHTML =
          mkDiv('flex:1', mkDiv('font-weight:700;font-size:15px', s.name) + mkDiv('font-size:12px;color:#6B7280', s.email)) +
          mkDiv('font-size:12px;color:#5B5FFF;font-weight:700', s.recs.length + '회 | 평균 ' + avg2 + '점');
        var detail = document.createElement('div');
        detail.style.cssText = 'display:none;padding:12px 16px;border-top:1px solid #F3F4F6;';
        s.recs.forEach(function(r) {
          var rec = document.createElement('div');
          rec.style.cssText = 'border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:8px;';
          var inner = mkDiv('padding:10px 13px;background:#F8F8FF;display:flex;justify-content:space-between',
            mkDiv('', mkDiv('font-size:12px;color:#6B7280', (r.date || '') + ' ' + (r.time || '')) + mkDiv('font-size:14px;font-weight:700', r.topic || '')) +
            mkDiv('font-size:16px;font-weight:800;color:#22C55E', (r.score || 0) + '점'));
          if (r.story) inner += mkDiv('padding:10px 13px;background:#F0FDF4;font-size:13px;color:#14532D;line-height:1.7', r.story);
          if (r.wrapUp) inner += mkDiv('padding:8px 13px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280', r.wrapUp);
          rec.innerHTML = inner;
          detail.appendChild(rec);
        });
        hdr.onclick = (function(d) { return function() { d.style.display = d.style.display === 'none' ? 'block' : 'none'; }; })(detail);
        card.appendChild(hdr);
        card.appendChild(detail);
        listEl.appendChild(card);
      });
    });
  }).catch(function(e) {
    document.getElementById('teacherList').innerHTML = mkDiv('color:#EF4444;padding:16px', '오류: ' + e.message);
  });
}

function generateCode() {
  var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = '';
  for (var i = 0; i < 6; i++) code += ch[Math.floor(Math.random() * ch.length)];
  return code;
}

function addStudent() {
  var name = document.getElementById('newStudentName').value.trim();
  var lev = parseInt(document.getElementById('newStudentLevel').value);
  if (!name) { alert('학생 이름을 입력해주세요!'); return; }
  var code = generateCode();
  var ln = { 1: 'Level 1 입문', 2: 'Level 2 기초', 3: 'Level 3 중급', 4: 'Level 4 고급' };
  db.collection('students').add({
    name: name, level: lev, code: code, levelName: ln[lev],
    teacherUid: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    totalSessions: 0
  }).then(function() {
    document.getElementById('newStudentName').value = '';
    alert(name + ' 등록 완료! 코드: ' + code);
    loadStudentMgmt();
  }).catch(function(e) { alert('오류: ' + e.message); });
}

function loadStudentMgmt() {
  var list = document.getElementById('studentMgmtList');
  list.innerHTML = mkDiv('text-align:center;padding:20px;color:#6B7280', '불러오는 중...');
  var lc = { 1: '#F59E0B', 2: '#22C55E', 3: '#3B82F6', 4: '#8B5CF6' };
  db.collection('students').where('teacherUid', '==', currentUser.uid).get().then(function(snap) {
    if (snap.empty) { list.innerHTML = mkDiv('text-align:center;padding:30px;color:#6B7280', '등록된 학생이 없어요!'); return; }
    list.innerHTML = '';
    snap.docs.forEach(function(doc) {
      var s = doc.data(), sid = doc.id;
      var card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:14px;padding:15px;border:1.5px solid #E5E7EB;margin-bottom:8px;';
      card.innerHTML =
        mkDiv('display:flex;align-items:center;gap:10px',
          mkDiv('flex:1',
            mkDiv('font-weight:700;font-size:15px', s.name) +
            mkDiv('font-size:12px;color:' + lc[s.level] + ';font-weight:600', s.levelName)
          ) +
          mkDiv('text-align:right',
            mkDiv('font-size:18px;font-weight:800;letter-spacing:2px', s.code) +
            mkDiv('font-size:11px;color:#9CA3AF', '학생 코드')
          )
        ) +
        mkDiv('margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;display:flex;gap:8px;justify-content:flex-end',
          '<button id="chg_' + sid + '" style="padding:6px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;cursor:pointer;background:#fff;color:#6B7280;">레벨변경</button>' +
          '<button id="del_' + sid + '" style="padding:6px 12px;border:1.5px solid #FCA5A5;border-radius:8px;font-size:12px;cursor:pointer;background:#FEF2F2;color:#EF4444;">삭제</button>'
        );
      list.appendChild(card);
      document.getElementById('chg_' + sid).onclick = (function(id, nm, cur) {
        return function() { changeLevel(id, nm, cur); };
      })(sid, s.name, s.level);
      document.getElementById('del_' + sid).onclick = (function(id, nm) {
        return function() { deleteStudent(id, nm); };
      })(sid, s.name);
    });
  }).catch(function(e) { list.innerHTML = mkDiv('color:#EF4444', e.message); });
}

function changeLevel(sid, name, cur) {
  var ln = { 1: 'Level 1 입문', 2: 'Level 2 기초', 3: 'Level 3 중급', 4: 'Level 4 고급' };
  var nv = prompt(name + ' 레벨 변경 (현재: ' + cur + '). 1~4 입력:', cur);
  if (!nv || isNaN(nv) || nv < 1 || nv > 4) return;
  var n = parseInt(nv);
  db.collection('students').doc(sid).update({ level: n, levelName: ln[n] })
    .then(function() { alert(name + ' Level ' + n + '로 변경!'); loadStudentMgmt(); })
    .catch(function(e) { alert('오류: ' + e.message); });
}

function deleteStudent(sid, name) {
  if (!confirm(name + ' 학생을 삭제할까요?')) return;
  db.collection('students').doc(sid).delete().then(function() { loadStudentMgmt(); });
}

// Memory
var memIsRec = false, memRec = null;

function goMemory() {
  showPg('memory'); tabOn('t6');
  document.getElementById('memStoryText').textContent = storyFinal;
  document.getElementById('memAnswerText').textContent = storyFinal;
  document.getElementById('memReadCard').style.display = 'flex';
  document.getElementById('memRecordCard').style.display = 'none';
  document.getElementById('memAnswerCard').style.display = 'none';
  document.getElementById('memRecResult').style.display = 'none';
  document.getElementById('memRetryBtn').style.display = 'none';
  setBtn(true, '학습 완료!', 'green'); state = 'finish';
  setTimeout(function() { speak(removeEmoji(storyFinal)); }, 500);
}
function speakMemory() { speak(removeEmoji(storyFinal)); }
function startMemorize() {
  document.getElementById('memReadCard').style.display = 'none';
  document.getElementById('memRecordCard').style.display = 'flex';
  document.getElementById('memRecStatus').textContent = '녹음 버튼을 눌러요!';
}
function retryMemory() {
  document.getElementById('memReadCard').style.display = 'flex';
  document.getElementById('memRecordCard').style.display = 'none';
  document.getElementById('memAnswerCard').style.display = 'none';
  document.getElementById('memRecResult').style.display = 'none';
  document.getElementById('memRetryBtn').style.display = 'none';
}
function toggleMemRec() {
  if (memIsRec) { if (memRec) memRec.stop(); return; }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    var r = document.getElementById('memRecResult');
    r.style.background = '#FEF2F2'; r.style.color = '#991B1B';
    r.textContent = 'Chrome에서만 가능해요!'; r.style.display = 'block';
    document.getElementById('memAnswerCard').style.display = 'flex'; return;
  }
  memRec = new SR(); memRec.lang = 'en-US'; memRec.interimResults = false;
  var btn = document.getElementById('memRecBtn');
  memRec.onstart = function() { memIsRec = true; btn.textContent = '멈추기'; btn.style.background = '#E53935'; document.getElementById('memRecStatus').textContent = '말하고 있어요...'; };
  memRec.onresult = function(e) {
    var said = e.results[0][0].transcript.trim();
    var orig = removeEmoji(storyFinal).toLowerCase().replace(/[.!?,]/g, '').trim();
    var sc = said.toLowerCase().replace(/[.!?,]/g, '').trim();
    var ow = orig.split(' ').filter(function(w) { return w.length > 2; });
    var mc = ow.filter(function(w) { return sc.includes(w); }).length;
    var pct = ow.length ? Math.round(mc / ow.length * 100) : 0;
    var res = document.getElementById('memRecResult'); res.style.display = 'block';
    if (pct >= 70) { res.style.background = 'var(--gl)'; res.style.color = '#14532D'; res.innerHTML = '<b>' + pct + '% 일치! 대단해요!</b><br>"' + said + '"'; addScore(30); }
    else if (pct >= 40) { res.style.background = 'var(--yl)'; res.style.color = '#92400E'; res.innerHTML = '<b>' + pct + '% 일치!</b><br>"' + said + '"'; document.getElementById('memRetryBtn').style.display = 'block'; addScore(15); }
    else { res.style.background = '#FEF2F2'; res.style.color = '#7F1D1D'; res.innerHTML = '<b>' + pct + '% 다시 연습!</b><br>"' + said + '"'; document.getElementById('memRetryBtn').style.display = 'block'; }
    document.getElementById('memAnswerCard').style.display = 'flex';
    document.getElementById('memRecStatus').textContent = '완료!';
  };
  memRec.onend = function() { memIsRec = false; btn.textContent = '다시 녹음'; btn.style.background = '#FF6B35'; };
  memRec.onerror = function() { memIsRec = false; btn.textContent = '녹음 시작'; btn.style.background = '#FF6B35'; };
  memRec.start();
}

// Progress (disabled)
function saveProgress(){}
function clearProgress(){}
function checkAndRestoreProgress(){return false;}
