// ── FIREBASE CONFIG ──
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

// ── AUTH STATE ──
auth.getRedirectResult().catch(function(e){ console.warn('redirect:', e.message); });

auth.onAuthStateChanged(function(user) {
  // 학생 코드 로그인 중이면 무시
  if (currentUser && currentUser.isStudent) return;
  if (user) {
    currentUser = user;
    document.getElementById('loginScreen').style.display = 'none';
    if (TEACHER_EMAILS.includes(user.email)) {
      showTeacherDashboard();
    }
  } else {
    if (currentUser && currentUser.isStudent) return;
    currentUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.flexDirection = 'column';
    document.getElementById('levelScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
    var ts = document.getElementById('teacherScreen');
    if (ts) ts.style.display = 'none';
  }
});

// ── GOOGLE LOGIN ──
function signInWithGoogle() {
  var e = document.getElementById('loginError');
  e.textContent = '구글 로그인 창 열리는 중...';
  e.style.display = 'block';
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function() {
    e.style.display = 'none';
  }).catch(function(err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    } else {
      e.textContent = '로그인 실패: ' + err.message;
    }
  });
}

function signOut() { auth.signOut(); }

// ── STUDENT CODE LOGIN ──
function loginWithCode() {
  var code = document.getElementById('studentCodeInput').value.trim().toUpperCase();
  var e = document.getElementById('codeError');
  if (!code) { e.textContent = '코드를 입력해주세요!'; e.style.display = 'block'; return; }
  e.textContent = '확인 중...'; e.style.display = 'block';
  db.collection('students').where('code', '==', code).limit(1).get().then(function(snap) {
    if (snap.empty) { e.textContent = '코드를 찾을 수 없어요. 선생님께 확인해주세요!'; return; }
    var doc = snap.docs[0];
    var data = doc.data();
    currentUser = {
      uid: doc.id,
      displayName: data.name,
      email: data.code + '@student',
      photoURL: '',
      isStudent: true,
      studentData: data
    };
    lv = data.level || 1;
    // 로그인 화면 숨기기
    document.getElementById('loginScreen').style.display = 'none';
    // 레벨 화면 보이기
    var ls = document.getElementById('levelScreen');
    ls.style.display = 'flex';
    ls.style.flexDirection = 'column';
    ls.style.alignItems = 'center';
    // 레벨 버튼 활성화
    selLv(lv);
  }).catch(function(err) { e.textContent = '오류: ' + err.message; });
}

// ── SAVE RECORD ──
function saveRecord(wrapUp) {
  if (!currentUser) return;
  var now = new Date();
  var teacherUid = (currentUser.isStudent && currentUser.studentData) ? (currentUser.studentData.teacherUid || '') : currentUser.uid;
  db.collection('records').add({
    uid: currentUser.uid,
    studentId: currentUser.uid,
    teacherUid: teacherUid,
    name: currentUser.displayName || '학생',
    email: currentUser.email,
    photo: currentUser.photoURL || '',
    date: now.toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'}),
    time: now.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'}),
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    level: lv,
    levelName: LVCONF[lv].name,
    topic: topic.ko,
    topicEn: topic.en,
    sentences: sentences.map(function(s){ return {q:s.q, eng:s.eng, corr:s.corr}; }),
    story: storyFinal,
    wrapUp: wrapUp,
    score: score
  }).then(function(){ console.log('Saved!'); }).catch(function(e){ console.warn(e); });
}

// ── TEACHER DASHBOARD ──
function showTeacherDashboard() {
  var ts = document.getElementById('teacherScreen');
  if (!ts) {
    // teacherScreen이 없으면 동적으로 생성
    ts = document.createElement('div');
    ts.id = 'teacherScreen';
    ts.style.cssText = 'width:100%;max-width:520px;padding:0 0 80px;display:flex;flex-direction:column;';
    ts.innerHTML =
      '<div style="background:#fff;border-bottom:1px solid #E5E7EB;padding:13px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:99;">' +
        '<div style="font-family:\'Poppins\',sans-serif;font-weight:800;font-size:1.05rem;color:#5B5FFF;">관리자</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="showTeacherTab(\'dashboard\')" id="tabDash" style="padding:7px 13px;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:700;background:#5B5FFF;color:#fff;">현황</button>' +
          '<button onclick="showTeacherTab(\'students\')" id="tabStudents" style="padding:7px 13px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;cursor:pointer;font-weight:700;background:#fff;color:#6B7280;">학생관리</button>' +
          '<button onclick="signOut()" style="padding:7px 13px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;cursor:pointer;color:#6B7280;background:#fff;">로그아웃</button>' +
        '</div>' +
      '</div>' +
      '<div id="tabDashContent" style="padding:16px 18px;display:flex;flex-direction:column;gap:13px;">' +
        '<div id="assignmentOverview"></div>' +
        '<div id="teacherStats" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>' +
        '<div style="font-weight:700;font-size:15px;">학생별 학습 기록</div>' +
        '<div id="teacherList" style="display:flex;flex-direction:column;gap:10px;"></div>' +
      '</div>' +
      '<div id="tabStudentsContent" style="padding:16px 18px;display:none;flex-direction:column;gap:13px;">' +
        '<div style="background:#fff;border-radius:16px;padding:16px;border:1.5px solid #5B5FFF;">' +
          '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">학생 등록</div>' +
          '<input id="newStudentName" placeholder="학생 이름" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 13px;font-size:14px;outline:none;margin-bottom:8px;box-sizing:border-box;">' +
          '<select id="newStudentLevel" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 13px;font-size:14px;outline:none;margin-bottom:8px;">' +
            '<option value="1">Level 1 - 입문 (초등 1~2)</option>' +
            '<option value="2">Level 2 - 기초 (초등 3~4)</option>' +
            '<option value="3">Level 3 - 중급 (초등5~중등)</option>' +
            '<option value="4">Level 4 - 고급 (중3~고등)</option>' +
          '</select>' +
          '<button onclick="addStudent()" style="width:100%;padding:12px;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;background:#5B5FFF;color:#fff;">학생 추가</button>' +
        '</div>' +
        '<div style="font-weight:700;font-size:15px;">등록된 학생 목록</div>' +
        '<div id="studentMgmtList" style="display:flex;flex-direction:column;gap:10px;"></div>' +
      '</div>';
    document.body.appendChild(ts);
  }
  ts.style.display = 'flex';
  ts.style.flexDirection = 'column';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('levelScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  loadDashboard();
}

function showTeacherTab(tab) {
  document.getElementById('tabDashContent').style.display = tab === 'dashboard' ? 'flex' : 'none';
  document.getElementById('tabDashContent').style.flexDirection = 'column';
  document.getElementById('tabStudentsContent').style.display = tab === 'students' ? 'flex' : 'none';
  document.getElementById('tabStudentsContent').style.flexDirection = 'column';
  document.getElementById('tabDash').style.background = tab === 'dashboard' ? '#5B5FFF' : '#fff';
  document.getElementById('tabDash').style.color = tab === 'dashboard' ? '#fff' : '#6B7280';
  document.getElementById('tabDash').style.border = tab === 'dashboard' ? 'none' : '1.5px solid #E5E7EB';
  document.getElementById('tabStudents').style.background = tab === 'students' ? '#5B5FFF' : '#fff';
  document.getElementById('tabStudents').style.color = tab === 'students' ? '#fff' : '#6B7280';
  document.getElementById('tabStudents').style.border = tab === 'students' ? 'none' : '1.5px solid #E5E7EB';
  if (tab === 'students') loadStudentMgmt();
}

function mkDiv(style, content) {
  return '<div style="' + style + '">' + content + '</div>';
}

function loadDashboard() {
  document.getElementById('teacherStats').innerHTML = mkDiv('grid-column:1/-1;text-align:center;padding:20px;color:#6B7280', '불러오는 중...');
  db.collection('records').orderBy('timestamp','desc').limit(200).get().then(function(snap) {
    var recs = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    var today = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
    var studs = new Set(recs.map(function(r){ return r.uid; })).size;
    var avg = recs.length ? Math.round(recs.reduce(function(a,r){ return a+(r.score||0); },0)/recs.length) : 0;
    var tod = recs.filter(function(r){ return r.date===today; }).length;
    document.getElementById('teacherStats').innerHTML =
      mkDiv('background:#EEEFFE;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#5B5FFF',studs)+mkDiv('font-size:13px;color:#6B7280','총 학생')) +
      mkDiv('background:#DCFCE7;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#22C55E',recs.length)+mkDiv('font-size:13px;color:#6B7280','총 학습')) +
      mkDiv('background:#FEF3C7;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#F59E0B',avg)+mkDiv('font-size:13px;color:#6B7280','평균점수')) +
      mkDiv('background:#FFF0EB;border-radius:14px;padding:16px;text-align:center', mkDiv('font-size:28px;font-weight:800;color:#FF6B35',tod)+mkDiv('font-size:13px;color:#6B7280','오늘'));
    db.collection('students').where('teacherUid','==',currentUser.uid).get().then(function(ss) {
      var tot = ss.size;
      var ruids = recs.map(function(r){ return r.studentId||r.uid; });
      var done = ss.docs.filter(function(d){ return ruids.includes(d.id); }).length;
      document.getElementById('assignmentOverview').innerHTML = tot > 0 ?
        mkDiv('background:#fff;border-radius:14px;padding:16px;border:1.5px solid #E5E7EB;margin-bottom:4px',
          mkDiv('font-weight:700;font-size:14px;margin-bottom:10px','과제 현황') +
          mkDiv('display:flex;gap:10px',
            mkDiv('flex:1;background:#DCFCE7;border-radius:12px;padding:12px;text-align:center',mkDiv('font-size:22px;font-weight:800;color:#22C55E',done)+mkDiv('font-size:12px;color:#166534','완료')) +
            mkDiv('flex:1;background:#FEF2F2;border-radius:12px;padding:12px;text-align:center',mkDiv('font-size:22px;font-weight:800;color:#EF4444',tot-done)+mkDiv('font-size:12px;color:#991B1B','미학습')) +
            mkDiv('flex:1;background:#EEEFFE;border-radius:12px;padding:12px;text-align:center',mkDiv('font-size:22px;font-weight:800;color:#5B5FFF',tot)+mkDiv('font-size:12px;color:#3730A3','전체'))
          )
        ) : '';
      var by = {};
      recs.forEach(function(r){ if(!by[r.uid]) by[r.uid]={name:r.name||'학생',email:r.email||'',recs:[]}; by[r.uid].recs.push(r); });
      var keys = Object.keys(by);
      if (!keys.length) { document.getElementById('teacherList').innerHTML = mkDiv('text-align:center;padding:40px;color:#6B7280','아직 학습 기록이 없어요!'); return; }
      var listEl = document.getElementById('teacherList');
      listEl.innerHTML = '';
      keys.forEach(function(uid, i) {
        var s = by[uid];
        var avg2 = Math.round(s.recs.reduce(function(a,r){ return a+(r.score||0); },0)/s.recs.length);
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:16px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:8px;';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'padding:14px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;';
        hdr.innerHTML = mkDiv('flex:1', mkDiv('font-weight:700;font-size:15px',s.name)+mkDiv('font-size:12px;color:#6B7280',s.email)) + mkDiv('font-size:12px;color:#5B5FFF;font-weight:700',s.recs.length+'회 | 평균 '+avg2+'점');
        var detail = document.createElement('div');
        detail.style.cssText = 'display:none;padding:12px 16px;border-top:1px solid #F3F4F6;';
        s.recs.forEach(function(r) {
          var rec = document.createElement('div');
          rec.style.cssText = 'border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:8px;';
          var inner = mkDiv('padding:10px 13px;background:#F8F8FF;display:flex;justify-content:space-between',
            mkDiv('',mkDiv('font-size:12px;color:#6B7280',(r.date||'')+' '+(r.time||''))+mkDiv('font-size:14px;font-weight:700',r.topic||'')) + mkDiv('font-size:16px;font-weight:800;color:#22C55E',(r.score||0)+'점'));
          if (r.story) inner += mkDiv('padding:10px 13px;background:#F0FDF4;font-size:13px;color:#14532D;line-height:1.7',r.story);
          if (r.wrapUp) inner += mkDiv('padding:8px 13px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280',r.wrapUp);
          rec.innerHTML = inner;
          detail.appendChild(rec);
        });
        hdr.onclick = (function(d){ return function(){ d.style.display = d.style.display==='none'?'block':'none'; }; })(detail);
        card.appendChild(hdr);
        card.appendChild(detail);
        listEl.appendChild(card);
      });
    });
  }).catch(function(e){ document.getElementById('teacherList').innerHTML = mkDiv('color:#EF4444;padding:16px','오류: '+e.message); });
}

function generateCode() {
  var ch='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code='';
  for(var i=0;i<6;i++) code+=ch[Math.floor(Math.random()*ch.length)];
  return code;
}

function addStudent() {
  var name = document.getElementById('newStudentName').value.trim();
  var lev = parseInt(document.getElementById('newStudentLevel').value);
  if (!name) { alert('학생 이름을 입력해주세요!'); return; }
  var code = generateCode();
  var ln = {1:'Level 1 입문',2:'Level 2 기초',3:'Level 3 중급',4:'Level 4 고급'};
  db.collection('students').add({
    name:name, level:lev, code:code, levelName:ln[lev],
    teacherUid:currentUser.uid,
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    totalSessions:0
  }).then(function(){
    document.getElementById('newStudentName').value='';
    alert(name+' 등록 완료! 코드: '+code);
    loadStudentMgmt();
  }).catch(function(e){ alert('오류: '+e.message); });
}

function loadStudentMgmt() {
  var list = document.getElementById('studentMgmtList');
  list.innerHTML = mkDiv('text-align:center;padding:20px;color:#6B7280','불러오는 중...');
  var lc = {1:'#F59E0B',2:'#22C55E',3:'#3B82F6',4:'#8B5CF6'};
  db.collection('students').where('teacherUid','==',currentUser.uid).get().then(function(snap) {
    if (snap.empty) { list.innerHTML = mkDiv('text-align:center;padding:30px;color:#6B7280','등록된 학생이 없어요!'); return; }
    list.innerHTML = '';
    snap.docs.forEach(function(doc) {
      var s = doc.data(), sid = doc.id;
      var card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:14px;padding:15px;border:1.5px solid #E5E7EB;margin-bottom:8px;';
      card.innerHTML =
        mkDiv('display:flex;align-items:center;gap:10px',
          mkDiv('flex:1', mkDiv('font-weight:700;font-size:15px',s.name)+mkDiv('font-size:12px;color:'+lc[s.level]+';font-weight:600',s.levelName)) +
          mkDiv('text-align:right', mkDiv('font-size:18px;font-weight:800;letter-spacing:2px',s.code)+mkDiv('font-size:11px;color:#9CA3AF','학생 코드'))
        ) +
        mkDiv('margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;display:flex;gap:8px;justify-content:flex-end',
          '<button id="chg_'+sid+'" style="padding:6px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;cursor:pointer;background:#fff;color:#6B7280;">레벨변경</button>' +
          '<button id="del_'+sid+'" style="padding:6px 12px;border:1.5px solid #FCA5A5;border-radius:8px;font-size:12px;cursor:pointer;background:#FEF2F2;color:#EF4444;">삭제</button>'
        );
      list.appendChild(card);
      document.getElementById('chg_'+sid).onclick = (function(id,nm,cur){ return function(){ changeLevel(id,nm,cur); }; })(sid,s.name,s.level);
      document.getElementById('del_'+sid).onclick = (function(id,nm){ return function(){ deleteStudent(id,nm); }; })(sid,s.name);
    });
  }).catch(function(e){ list.innerHTML = mkDiv('color:#EF4444',e.message); });
}

function changeLevel(sid, name, cur) {
  var ln = {1:'Level 1 입문',2:'Level 2 기초',3:'Level 3 중급',4:'Level 4 고급'};
  var nv = prompt(name+' 레벨 변경 (현재: '+cur+'). 1~4 입력:', cur);
  if (!nv||isNaN(nv)||nv<1||nv>4) return;
  var n = parseInt(nv);
  db.collection('students').doc(sid).update({level:n, levelName:ln[n]})
    .then(function(){ alert(name+' Level '+n+'로 변경!'); loadStudentMgmt(); })
    .catch(function(e){ alert('오류: '+e.message); });
}

function deleteStudent(sid, name) {
  if (!confirm(name+' 학생을 삭제할까요?')) return;
  db.collection('students').doc(sid).delete().then(function(){ loadStudentMgmt(); });
}
