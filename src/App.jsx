import React, { useState, useEffect } from 'react';
import './App.css';
import Timer from './components/Timer';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import StatsPage from './components/StatsPage';
import RankingPage from './components/RankingPage';
import API_BASE_URL from './config';

function App() {
  // 로그인한 유저 정보 (null이면 비로그인)
  const [currentUser, setCurrentUser] = useState(null);
  
  // ✨ [추가] 로딩 상태 (앱 켜질 때 깜빡임 방지)
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [currentFocusTask, setCurrentFocusTask] = useState(null);
  
  // 기본 설정값 (상수로 분리)
  const defaultSettings = {
    focusTime: 40 * 60,   
    shortBreak: 10 * 60,  
    longBreak: 20 * 60,   
    sessionCycle: 4,      
  };

  const [settings, setSettings] = useState(defaultSettings);

  // ✨ [추가] 오늘 날짜 포맷팅 (예: 2025년 11월 26일 수요일)
  const todayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  // ---------------------------------------------------------
  // 1. [초기화] 세션 확인 + 로컬 우선 로딩 + DB 병합 (속도 최적화)
  // ---------------------------------------------------------
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // A. [자정/새벽4시 초기화]
        const now = new Date();
        now.setHours(now.getHours() - 4); // 새벽 4시 기준
        const today = now.toLocaleDateString();
        const lastRunDate = localStorage.getItem('lastRunDate');

        if (lastRunDate !== today) {
            console.log(`🌙 날짜 변경! (${lastRunDate} -> ${today}) 완료 목록 초기화`);
            // 모든 유저의 완료 기록 삭제
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('completedTasks_')) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('lastRunDate', today);
        }

        // B. [세션 체크] (백엔드 통신)
        const sessionRes = await fetch(`${API_BASE_URL}/api/auth/check-session`, {
            method: 'GET',
            credentials: 'include'
        });

        let activeUser = null;
        if (sessionRes.ok) {
            const userData = await sessionRes.json();
            setCurrentUser(userData);
            activeUser = userData.username;
            console.log(`환영합니다, ${userData.nickname}님!`);
            
            // [설정 로딩] 로그인 확인 즉시 적용
            const key = `settings_${userData.username}`;
            const savedSettings = localStorage.getItem(key);
            if (savedSettings) setSettings(JSON.parse(savedSettings));
        }

        // C. ✨ [핵심] 로컬 데이터부터 '먼저' 보여주기 (기다리지 않음!)
        if (activeUser) {
            const taskKey = `completedTasks_${activeUser}`;
            const localCompletedTasks = JSON.parse(localStorage.getItem(taskKey) || '[]');
            setTasks(localCompletedTasks); // 일단 화면에 뿌림
        }

        // D. ✨ [로딩 해제] 사용자는 이제 화면을 볼 수 있음
        setIsLoading(false);

        // E. [DB 데이터 로딩] (백그라운드에서 실행 후 병합)
        if (activeUser) {
            const taskRes = await fetch(`${API_BASE_URL}/api/tasks/${activeUser}`, {
                credentials: 'include'
            });
            
            if (taskRes.ok) {
                const dbTasks = await taskRes.json();
                const activeTasks = dbTasks.map(t => ({
                    ...t,
                    isFocusing: false,
                    focusSessions: t.focusSessions || 0 
                }));
                
                // 기존 로컬 데이터와 합치기 (함수형 업데이트로 최신 상태 유지)
                setTasks(prev => {
                    const localIds = new Set(prev.map(t => t.id));
                    // DB에서 온 것 중 로컬에 없는 것만 추가
                    const newTasks = activeTasks.filter(t => !localIds.has(t.id));
                    return [...newTasks, ...prev]; 
                });
            }
        }

      } catch (error) {
        console.error("초기화 중 에러:", error);
        setIsLoading(false); // 에러 나도 로딩은 꺼야 함
      }
    };

    initializeApp();
  }, []);


  // ---------------------------------------------------------
  // 3. [로그아웃]
  // ---------------------------------------------------------
  const handleLogout = async () => {
    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, { 
            method: 'POST', credentials: 'include' 
        });

        // 설정 삭제 (로그아웃 시 초기화 원할 경우)
        if (currentUser) {
            localStorage.removeItem(`settings_${currentUser.username}`);
        }

        setCurrentUser(null);
        setTasks([]); 
        setCurrentFocusTask(null);
        setSettings(defaultSettings);

        setCurrentView('login');
    } catch (e) { console.error(e); }
  };

  // ---------------------------------------------------------
  // 4. [목록 초기화]
  // ---------------------------------------------------------
  const handleResetList = async () => {
    if (!currentUser) return;

    if (!window.confirm("정말 모든 할 일 목록을 초기화하시겠습니까?\n(통계 기록은 유지됩니다)")) {
        return;
    }

    try {
        await fetch(`${API_BASE_URL}/api/tasks/user/${currentUser.username}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        localStorage.removeItem(`completedTasks_${currentUser.username}`);

        setTasks([]);
        setCurrentFocusTask(null);

        alert("모든 목록이 초기화되었습니다! ✨");

    } catch (error) {
        console.error("초기화 실패:", error);
        alert("오류가 발생했습니다.");
    }
  };

  // ---------------------------------------------------------
  // 5. [헬퍼] 로컬 스토리지 저장
  // ---------------------------------------------------------
  const saveToLocal = (task, username) => {
    const key = `completedTasks_${username}`;
    const completedTask = { ...task, completed: true, isFocusing: false };
    const currentSaved = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (!currentSaved.find(t => t.id === task.id)) {
        const newSaved = [...currentSaved, completedTask];
        localStorage.setItem(key, JSON.stringify(newSaved));
    }
  };

  // ---------------------------------------------------------
  // 6. [설정 핸들러]
  // ---------------------------------------------------------
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    if (parseInt(value) <= 0) return;
    
    setSettings(prev => {
        const newSettings = { ...prev, [name]: parseInt(value) * 60 };
        if (currentUser) {
            localStorage.setItem(`settings_${currentUser.username}`, JSON.stringify(newSettings));
        }
        return newSettings;
    });
  };

  const handleCycleChange = (e) => {
    const val = parseInt(e.target.value);
    if (val <= 0) return;
    
    setSettings(prev => {
        const newSettings = { ...prev, sessionCycle: val };
        if (currentUser) {
            localStorage.setItem(`settings_${currentUser.username}`, JSON.stringify(newSettings));
        }
        return newSettings;
    });
  };

  // ---------------------------------------------------------
  // 7. [할 일 추가]
  // ---------------------------------------------------------
  const addTaskHandler = async () => {
    if (newTaskTitle.trim() === '') {
        alert("할 일을 입력해주세요.");
        return;
    }
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            userId: currentUser.username, 
            title: newTaskTitle 
        })
      });
      
      if (response.ok) {
        const savedTask = await response.json();
        const newTask = {
          id: savedTask.id,
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
  // 8. [세션 완료]
  // ---------------------------------------------------------
  const handleSessionComplete = async (taskId) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentSessions = (task.focusSessions || 0) + 1;
    const isCycleFinished = currentSessions % settings.sessionCycle === 0; 

    // A. 통계 저장
    try {
        await fetch(`${API_BASE_URL}/api/stats/${currentUser.username}/daily`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                addSeconds: settings.focusTime, 
                isSessionComplete: true 
            }) 
        });
    } catch (error) { console.error("통계 저장 실패:", error); }

    // B. 사이클 종료 여부
    if (isCycleFinished) {
        // DB 삭제 + 로컬 저장
        try {
            await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { 
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
        // 중간 저장 (화면 + DB)
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, focusSessions: currentSessions } : t
        ));
        setCurrentFocusTask(prev => ({ ...prev, focusSessions: currentSessions }));

        try {
            await fetch(`${API_BASE_URL}/api/tasks/${taskId}/session`, {
                method: 'PATCH', credentials: 'include'
            });
        } catch (e) { console.error("세션 카운트 저장 실패", e); }
    }
  };

  // ---------------------------------------------------------
  // 9. [수동 완료]
  // ---------------------------------------------------------
  const handleManualTaskCompletion = async (totalSeconds) => {
    if (!currentFocusTask || !currentUser) return;
    const taskId = currentFocusTask.id;
    const currentTaskObj = tasks.find(t => t.id === taskId);

    // A. 통계 저장
    if (totalSeconds > 0) {
        try {
            await fetch(`${API_BASE_URL}/api/stats/${currentUser.username}/daily`, {
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
        await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { 
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

  // ---------------------------------------------------------
  // ✨ [화면 렌더링] 로딩 상태 처리
  // ---------------------------------------------------------
  
  // 1. 로딩 중일 때 (깜빡임 방지용 스피너)
  if (isLoading) {
    return (
      <div className="app-container" style={{
        /* ✨ [핵심] 카드 크기 강제 지정 (찌그러짐 방지) */
        width: '350px',
        minHeight: '300px', 
        
        /* 내용물 중앙 정렬 */
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        
        /* 화면 정중앙에 오도록 여백 자동 조절 */
        margin: '20vh auto' 
      }}>
        
        {/* 텍스트 */}
        <div style={{ 
            color: '#2c3e50', 
            fontWeight: '800', 
            fontSize: '18px' 
        }}>
            FocusFlow 로딩 중...
            최초 접속시에는 많은 시간이 소요될 수도 있습니다.
        </div>
      </div>
    );
  }

  // 2. 로딩 완료 후 실제 화면
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
                window.location.reload(); // 데이터 로딩 위해 새로고침
            }}
          />
        );
      case 'signup':
        return <SignupPage onBack={() => setCurrentView('login')} />;
      case 'stats':
        return <StatsPage currentUser={currentUser} onBack={() => setCurrentView('home')} />;
      case 'ranking':
        return <RankingPage onBack={() => setCurrentView('home')} />;
      case 'home':
      default:
        return (
          <>
           <div className="settings-input-container">
             <label>집중 (분): <input type="number" name="focusTime" value={settings.focusTime / 60} onChange={handleSettingsChange} min="1"/></label>
             <label>휴식 (분): <input type="number" name="shortBreak" value={settings.shortBreak / 60} onChange={handleSettingsChange} min="1"/></label>
             <label>주기 (회): <input type="number" name="sessionCycle" value={settings.sessionCycle} onChange={handleCycleChange} min="1"/></label>
           </div>

          <div className="task-input-section">
            <input type="text" placeholder="새로운 할 일 입력..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            <button onClick={addTaskHandler}>추가</button>
          </div>

          <div className="main-content-area">
            <div className="task-list-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px' }}>
                  <h2 style={{ margin: 0 }}>할 일 목록</h2>
                  <button 
                    onClick={handleResetList}
                    style={{
                        padding: '6px 12px', fontSize: '13px', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '20px', background: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#e74c3c'; }}
                  >
                    🗑️ 목록 초기화
                  </button>
              </div>
              <div className="task-list">
                {[...tasks]
                    .sort((a, b) => Number(a.completed) - Number(b.completed)) // 미완료(0) -> 완료(1) 순서 정렬
                    .map(task => (
                    
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

  const isHomePage = currentView === 'home';

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: isHomePage ? 'row' : 'column', alignItems: isHomePage ? 'baseline' : 'flex-start', gap: isHomePage ? '15px' : '5px'}}>
            <h1 
                onClick={() => setCurrentView('home')} 
                style={{ margin: 0, cursor: 'pointer' }}
            >
                FocusFlow
            </h1>
            {/* 날짜 표시 */}
            <span style={{ 
                fontSize: '16px', 
                color: '#636e72', // 부드러운 회색 (App.css 변수와 어울림)
                fontWeight: '500',
                letterSpacing: '-0.5px'
            }}>
                {todayDate}
            </span>
        </div>
        
        {currentUser ? (
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
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