import React, { useState } from 'react';
import './App.css';
import Timer from './components/Timer';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';

// To-Do 데이터 모델 예시 (백엔드 연동 전 Mock Data)
const initialTasks = [
  { id: 1, title: 'Spring Boot API 설계 및 구현', completed: false, isFocusing: false, focusSessions: 0 },
  { id: 2, title: 'React 디자인 디테일 개선', completed: false, isFocusing: true, focusSessions: 1 },
  { id: 3, title: 'DB 모델링 완료', completed: true, isFocusing: false, focusSessions: 2 },
];

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentView, setCurrentView] = useState('home');
  
  // 사용자가 설정할 시간 상태 (초 단위로 관리)
  const [settings, setSettings] = useState({
    focusTime: 40 * 60,   // 40분 기본값
    shortBreak: 10 * 60,  // 10분 기본값
    longBreak: 20 * 60,   // 20분 기본값
    sessionCycle: 4,      // 4세션 주기
  });
  
  const [currentFocusTask, setCurrentFocusTask] = useState(
      initialTasks.find(task => task.isFocusing) || null
  );

  // 설정 UI 핸들러
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    if (parseInt(value) <= 0) return;
    
    // 입력된 분(minute)을 초(second)로 변환하여 저장
    setSettings(prev => ({ ...prev, [name]: parseInt(value) * 60 }));
  };

  // 할 일 추가 함수
  const addTaskHandler = () => {
    if (newTaskTitle.trim() === '') return;

    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    
    const newTask = {
      id: newId,
      title: newTaskTitle.trim(),
      completed: false,
      isFocusing: false,
      focusSessions: 0,
    };

    setTasks(prevTasks => [...prevTasks, newTask]);
    setNewTaskTitle('');
  };
  
  // Task에 포커스를 시작/전환하는 핸들러
  const handleStartFocusing = (taskId) => {
    setTasks(prevTasks => prevTasks.map(task => {
      const isNewFocus = task.id === taskId;
      if (isNewFocus) {
        setCurrentFocusTask({ ...task, isFocusing: true });
      }
      return { ...task, isFocusing: isNewFocus };
    }));
  };

  // 타이머 세션이 완료되었을 때 호출되는 핸들러 (FocusSessions 증가)
  const handleSessionComplete = (taskId) => {
    // 💡 나중에 이 부분이 Spring Boot API 호출(POST /api/tasks/{id}/focus/complete)로 대체됩니다.
    
    setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
            const updatedTask = { ...task, focusSessions: task.focusSessions + 1 };
            setCurrentFocusTask(updatedTask); 
            return updatedTask;
        }
        return task;
    }));
    // alert(`🎉 ${currentFocusTask.title} 작업에 대한 집중 세션이 1회 완료되었습니다!`);
  };

  // (Timer 컴포넌트의 onManualComplete prop으로 전달됨)
  const handleManualTaskCompletion = (totalSeconds) => {
    if (!currentFocusTask) return;

    const taskId = currentFocusTask.id;
    const minutes = Math.floor(totalSeconds / 60);
    console.log(`DB 저장 요청: [${currentFocusTask.title}] 총 ${minutes}분 (${totalSeconds}초)`);

    // 1. 태스크 상태 업데이트 (완료 처리)
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: true, isFocusing: false } // 완료됨 표시, 포커스 해제
        : task
    ));

    // 2. 현재 포커스 작업 해제 (타이머 화면 닫기)
    setCurrentFocusTask(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginPage 
            onBack={() => setCurrentView('home')} 
            onGoSignup={() => setCurrentView('signup')} // ✨ 회원가입 화면으로 이동
          />
        );
      case 'signup':
        return (
          <SignupPage 
            onBack={() => setCurrentView('login')} // ✨ 가입 취소/완료 시 로그인 화면으로 복귀
          />
        );
      case 'home':
      default:
        return (
          <>
           {/* 기존 메인 대시보드 내용 */}
           <div className="settings-input-container">
             <label>집중 (분): 
                <input type="number" name="focusTime" value={settings.focusTime / 60} onChange={handleSettingsChange} min="1"/>
            </label>
            <label>휴식 (분): 
                <input type="number" name="shortBreak" value={settings.shortBreak / 60} onChange={handleSettingsChange} min="1"/>
            </label>
             <label>주기 (회): 
                <input type="number" name="sessionCycle" value={settings.sessionCycle} onChange={(e) => setSettings(prev => ({ ...prev, sessionCycle: parseInt(e.target.value) }))} min="1"/>
            </label>
           </div>
           {/* ... Task Input, Main Content Area 등등 ... */}

          <div className="task-input-section">
            <input
              type="text"
              placeholder="새로운 할 일 입력..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button onClick={addTaskHandler}>추가</button>
          </div>

          <div className="main-content-area">
            <div className="task-list-section">
              <h2>할 일 목록</h2>
              <div className="task-list">
                {tasks.map(task => (
                    <div 
                        key={task.id} 
                        className={`task-item ${task.isFocusing ? 'focusing' : ''} ${task.completed ? 'completed-task' : ''}`}
                        style={{ opacity: task.completed ? 0.6 : 1 }} // 완료된 태스크 흐리게 처리
                    >
                        <span 
                            className="task-title"
                            style={{ textDecoration: task.completed ? 'line-through' : 'none' }} // 완료 시 취소선
                        >
                            {task.title}
                        </span>
                        <span className="task-sessions">🔥 {task.focusSessions}</span>
                        
                        {!task.completed && (
                            <button onClick={() => handleStartFocusing(task.id)}>
                                {task.isFocusing ? '포커스 중' : '시작'}
                            </button>
                        )}
                        {task.completed && <span>✅</span>}
                    </div>
                ))}
              </div>
            </div>

            <div className="timer-section">
              {/* Timer에 onManualComplete prop 전달 */}
              <Timer 
                  currentFocusTask={currentFocusTask} 
                  onSessionComplete={handleSessionComplete} 
                  settings={settings}
                  onManualComplete={handleManualTaskCompletion} // ✨ 추가됨
              />
            </div>

          </div>

          </>
        );
    }
  };


  return (
    <div className="app-container">
      {/* ⭐️ 헤더 영역 수정: Flexbox 적용 및 로그인 버튼 추가 */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 
            onClick={() => setCurrentView('home')} 
            style={{ margin: 0, cursor: 'pointer' }}
        >
            FocusFlow 🚀
        </h1>
        
        {/* 로그인 화면이 아닐 때만 버튼 표시 */}
        {currentView !== 'login' && (
            <button 
                onClick={() => setCurrentView('login')}
                style={{ 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    border: 'none', 
                    background: '#3498db', 
                    color: 'white', 
                    cursor: 'pointer' 
                }}
            >
                로그인
            </button>
        )}
      </header>
      
      {/* ⭐️ 조건부 렌더링 실행 */}
      {renderContent()}

    </div>
  );
}

export default App;
