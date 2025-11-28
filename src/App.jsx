import React, { useState, useEffect } from 'react';
import './App.css';
import Timer from './components/Timer';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import StatsPage from './components/StatsPage';
import RankingPage from './components/RankingPage';

function App() {
  // 로그인한 유저 정보 (null이면 비로그인)
  const [currentUser, setCurrentUser] = useState(null);
  
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentView, setCurrentView] = useState('home');
  
  const [settings, setSettings] = useState({
    focusTime: 40 * 60,   
    shortBreak: 10 * 60,  
    longBreak: 20 * 60,   
    sessionCycle: 4,      
  });
  
  const [currentFocusTask, setCurrentFocusTask] = useState(null);

  // ---------------------------------------------------------
  // 1. [초기화] 세션 확인 + 데이터 로딩 + 자정 초기화
  // ---------------------------------------------------------
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // A. [초기화 로직 수정] 현재 시간에서 4시간을 뺀 날짜를 구함
        const now = new Date();
        now.setHours(now.getHours() - 4); // 4시간 뒤로 감기
        
        const today = now.toLocaleDateString(); // 예: "2025. 11. 23." (새벽 3시면 어제 날짜가 됨)
        const lastRunDate = localStorage.getItem('lastRunDate');

        if (lastRunDate !== today) {
            console.log(`🌙 새벽 4시 기준 날짜 변경! (${lastRunDate} -> ${today}) 완료 목록을 비웁니다.`);
            Object.keys(localStorage).forEach(key => { // 돌면서 모든 데이터 삭제 4시 기준으로 
                if (key.startsWith('completedTasks_')) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('lastRunDate', today);
        }

        // B. [세션 체크] 새로고침 해도 로그인 유지
        const sessionRes = await fetch('http://localhost:8080/api/auth/check-session', {
            method: 'GET',
            credentials: 'include' // 세션 쿠키 전송 필수
        });

        let activeUser = null;
        if (sessionRes.ok) {
            const userData = await sessionRes.json();
            setCurrentUser(userData); // { username: "...", nickname: "..." }
            activeUser = userData.username;
            console.log(`환영합니다, ${userData.nickname}님!`);
        }

        // C. [데이터 로딩] 로그인 상태라면 DB 데이터 가져오기
        if (activeUser) {
            // 1. DB에서 '진행 중인 할 일' 가져오기
            const taskRes = await fetch(`http://localhost:8080/api/tasks/${activeUser}`, {
                credentials: 'include'
            });
            
            if (taskRes.ok) {
                const dbTasks = await taskRes.json();
                // DB 데이터에 UI용 필드 병합
                const activeTasks = dbTasks.map(t => ({
                    ...t,
                    isFocusing: false,
                    focusSessions: t.focusSessions || 0 
                }));
                
                const userKey = `completedTasks_${activeUser}`; // 데이터 가져 올 때도 해당 계정 데이터만 가져오도록 변경
                // 2. 로컬 스토리지에서 '완료된 할 일' 가져오기
                const localCompletedTasks = JSON.parse(localStorage.getItem(userKey) || '[]');

                // 3. 병합
                setTasks([...activeTasks, ...localCompletedTasks]);
            }
        }

      } catch (error) {
        console.error("초기화 중 에러:", error);
      }
    };

    initializeApp();
  }, []); // 마운트 시 1회 실행

  // ---------------------------------------------------------
  // 2. [로그아웃]
  // ---------------------------------------------------------
  const handleLogout = async () => {
    try {
        await fetch('http://localhost:8080/api/auth/logout', { 
            method: 'POST', credentials: 'include' 
        });
        setCurrentUser(null);
        setTasks([]); 
        setCurrentFocusTask(null);
        setCurrentView('login');
    } catch (e) { console.error(e); }
  };

  // ---------------------------------------------------------
  // ✨ [목록 초기화] DB + 로컬 + 화면 싹 비우기
  // ---------------------------------------------------------
  const handleResetList = async () => {
    if (!currentUser) return;

    // 실수 방지를 위한 확인 창
    if (!window.confirm("정말 모든 할 일 목록을 초기화하시겠습니까?\n(통계 기록은 유지됩니다)")) {
        return;
    }

    try {
        // 1. DB 데이터 삭제 요청
        await fetch(`http://localhost:8080/api/tasks/user/${currentUser.username}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        // 2. 로컬 스토리지 삭제
        localStorage.removeItem(`completedTasks_${currentUser.username}`);

        // 3. 화면 비우기
        setTasks([]);
        setCurrentFocusTask(null); // 타이머에 걸린 작업도 해제

        alert("모든 목록이 초기화되었습니다! ✨");

    } catch (error) {
        console.error("초기화 실패:", error);
        alert("초기화 중 오류가 발생했습니다.");
    }
  };

  // ---------------------------------------------------------
  // [헬퍼] 로컬 스토리지 저장 (UI 유지용)
  // ---------------------------------------------------------
  const saveToLocal = (task, username) => {
    const key = `completedTasks_${username}`; // 계정별로 구분 하기 위함 

    const completedTask = { ...task, completed: true, isFocusing: false };
    const currentSaved = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (!currentSaved.find(t => t.id === task.id)) {
        const newSaved = [...currentSaved, completedTask];
        localStorage.setItem(key, JSON.stringify(newSaved));
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    if (parseInt(value) <= 0) return;
    setSettings(prev => ({ ...prev, [name]: parseInt(value) * 60 }));
  };

  // ---------------------------------------------------------
  // 3. [할 일 추가] DB 저장
  // ---------------------------------------------------------
  const addTaskHandler = async () => {
    if (newTaskTitle.trim() === '' || !currentUser) return;

    console.log("버튼 눌림!");
    console.log("입력값:", newTaskTitle);
    console.log("유저정보:", currentUser);

    try {
      const response = await fetch('http://localhost:8080/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            userId: currentUser.username, // 실제 로그인 ID
            title: newTaskTitle 
        })
      });
      
      if (response.ok) {
        const savedTask = await response.json();
        const newTask = {
          id: savedTask.id, // MongoDB ObjectId
          title: savedTask.title,
          completed: false,
          isFocusing: false,
          focusSessions: 0,
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskTitle('');
      }
    } catch (error) {
      console.error("할 일 추가 실패:", error);
    }
  };
  
  const handleStartFocusing = (taskId) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.completed) return task;
      const isNewFocus = task.id === taskId;
      if (isNewFocus) setCurrentFocusTask({ ...task, isFocusing: true });
      return { ...task, isFocusing: isNewFocus };
    }));
  };

  // ---------------------------------------------------------
  // 4. [세션 완료] 통계 저장 + 사이클 달성 시 DB 삭제
  // ---------------------------------------------------------
  const handleSessionComplete = async (taskId) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentSessions = (task.focusSessions || 0) + 1;
    const isCycleFinished = currentSessions % settings.sessionCycle === 0; 

    // A. 일별 통계 저장
    try {
        await fetch(`http://localhost:8080/api/stats/${currentUser.username}/daily`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                addSeconds: settings.focusTime, 
                isSessionComplete: true 
            }) 
        });
    } catch (error) { console.error("통계 저장 실패:", error); }

    // B. 사이클 종료 여부 분기
    if (isCycleFinished) {
        // 목표 달성 -> DB 삭제 + 로컬 저장
        try {
            await fetch(`http://localhost:8080/api/tasks/${taskId}`, { 
                method: 'DELETE', credentials: 'include' 
            });
        } catch (e) { console.error(e); }

        saveToLocal({ ...task, focusSessions: currentSessions }, currentUser.username);

        setTasks(prev => prev.map(t => 
            t.id === taskId 
                ? { ...t, focusSessions: currentSessions, completed: true, isFocusing: false } 
                : t
        ));
        setCurrentFocusTask(null);

    } else {
        // 계속 진행 -> 세션 수만 증가
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, focusSessions: currentSessions } : t
        ));
        setCurrentFocusTask(prev => ({ ...prev, focusSessions: currentSessions }));

        // ✨ 2. [추가] DB에도 세션 횟수 업데이트 요청 (새로고침 유지용)
        try {
            await fetch(`http://localhost:8080/api/tasks/${taskId}/session`, {
                method: 'PATCH',
                credentials: 'include'
            });
        } catch (e) { console.error("세션 카운트 저장 실패", e); }
    }
  };

  // ---------------------------------------------------------
  // 5. [수동 완료] 통계 저장 + DB 삭제 + 로컬 저장
  // ---------------------------------------------------------
  const handleManualTaskCompletion = async (totalSeconds) => {
    if (!currentFocusTask || !currentUser) return;
    const taskId = currentFocusTask.id;
    const currentTaskObj = tasks.find(t => t.id === taskId);

    // A. 통계 저장
    if (totalSeconds > 0) {
        try {
            await fetch(`http://localhost:8080/api/stats/${currentUser.username}/daily`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    addSeconds: totalSeconds, 
                    isSessionComplete: false 
                }) 
            });
        } catch (e) { console.error(e); }
    }

    // B. DB 삭제
    try {
        await fetch(`http://localhost:8080/api/tasks/${taskId}`, { 
            method: 'DELETE', credentials: 'include'
        });
    } catch (error) { console.error("삭제 실패:", error); }

    // C. 로컬 저장 & UI 업데이트
    if (currentTaskObj) saveToLocal(currentTaskObj, currentUser.username);

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: true, isFocusing: false } : t
    ));
    setCurrentFocusTask(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginPage 
            onBack={() => setCurrentView('home')} 
            onGoSignup={() => setCurrentView('signup')}
            onLoginSuccess={(user) => {
                setCurrentUser(user);
                setCurrentView('home');
                window.location.reload(); // 데이터 로딩을 위해 새로고침
            }}
          />
        );
      case 'signup':
        return <SignupPage onBack={() => setCurrentView('login')} />;
      case 'stats':
        return (
          <StatsPage 
            currentUser={currentUser} 
            onBack={() => setCurrentView('home')} // 뒤로가기 누르면 홈으로
          />
        );
      case 'ranking': //랭킹 서비스
        return <RankingPage onBack={() => setCurrentView('home')} />;
      case 'home':
      default:
        return (
          <>
           <div className="settings-input-container">
             <label>집중 (분): <input type="number" name="focusTime" value={settings.focusTime / 60} onChange={handleSettingsChange} min="1"/></label>
             <label>휴식 (분): <input type="number" name="shortBreak" value={settings.shortBreak / 60} onChange={handleSettingsChange} min="1"/></label>
             <label>주기 (회): <input type="number" name="sessionCycle" value={settings.sessionCycle} onChange={(e) => setSettings(prev => ({ ...prev, sessionCycle: parseInt(e.target.value) }))} min="1"/></label>
           </div>

          <div className="task-input-section">
            <input type="text" placeholder="새로운 할 일 입력..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            <button onClick={addTaskHandler}>추가</button>
          </div>

          <div className="main-content-area">
            <div className="task-list-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px' }}>
                  <h2 style={{ margin: 0 }}>할 일 목록</h2>
                  {/* ✨ 초기화 버튼 추가 */}
                      <button 
                        onClick={handleResetList}
                        style={{
                            padding: '6px 12px',
                            fontSize: '13px',
                            color: '#e74c3c', // 빨간색 (경고 느낌)
                            border: '1px solid #e74c3c',
                            borderRadius: '20px',
                            background: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#e74c3c'; }}
                      >
                        🗑️ 목록 초기화
                      </button>
              </div>
              <div className="task-list">
                {tasks.map(task => (
                    <div key={task.id} className={`task-item ${task.isFocusing ? 'focusing' : ''} ${task.completed ? 'completed-task' : ''}`} style={{ opacity: task.completed ? 0.6 : 1 }}>
                        <span className="task-title" style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                        <span className="task-sessions">🔥 {task.focusSessions || 0}</span>
                        {!task.completed && <button onClick={() => handleStartFocusing(task.id)}>{task.isFocusing ? '포커스 중' : '시작'}</button>}
                        {task.completed && <span>✅</span>}
                    </div>
                ))}
              </div>
            </div>

            <div className="timer-section">
              <Timer 
                  currentFocusTask={currentFocusTask} 
                  onSessionComplete={handleSessionComplete} 
                  settings={settings}
                  onManualComplete={handleManualTaskCompletion} 
              />
            </div>
          </div>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 onClick={() => setCurrentView('home')} style={{ margin: 0, cursor: 'pointer' }}>FocusFlow 🚀</h1>
        
        {currentUser ? (
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                {/* 통계 버튼 (홈 화면일 때만 표시) */}
                {currentView === 'home' && (
                  <>
                    <button onClick={() => setCurrentView('ranking')} style={{ padding: '8px 12px', background: '#64afedff', color: 'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold' }}>
                            🏆 랭킹
                        </button>
                    <button 
                        onClick={() => setCurrentView('stats')}
                        style={{ padding: '8px 12px', background: '#f1c40f', color: 'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold' }}
                    >
                        📊 통계
                    </button>
                  </>
                )}
                
                <span style={{color: '#555'}}><b>{currentUser.nickname}</b>님</span>
                <button onClick={handleLogout} style={{padding: '5px 10px', fontSize: '0.8em', background: '#e74c3c', color: 'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>로그아웃</button>
            </div>
        ) : (
             null
        )}
      </header>
      
      {/* 로그인 상태가 아닐 때 홈 화면 접근 제한 (선택적) */}
      {!currentUser && currentView === 'home' ? (
          <div style={{textAlign:'center', padding:'50px'}}>
              <h2>로그인이 필요합니다 🔒</h2>
              <p style={{color:'#666', marginBottom:'20px'}}>로그인하여 나만의 집중 기록을 관리해보세요!</p>
              <button onClick={()=>setCurrentView('login')} style={{padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'16px'}}>로그인 하러가기</button>
          </div>
      ) : renderContent()}
    </div>
  );
}

export default App;