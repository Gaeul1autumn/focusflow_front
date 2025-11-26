import React, { useState, useEffect, useRef, useCallback } from 'react';

// ----------------------------------------------------
// ⭐️ SVG 부채꼴(Sector) 렌더링 헬퍼 함수
// ----------------------------------------------------
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (-angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeSector = (x, y, radius, startAngle, endAngle) => {
  if (endAngle <= startAngle) return `M ${x} ${y}`;
  const startPoint = polarToCartesian(x, y, radius, startAngle);
  const endPoint = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${x} ${y}`,
    `L ${startPoint.x} ${startPoint.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`,
    `Z`
  ].join(' ');
};

const showAutoDismissMessage = (message) => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#333';
  toast.style.color = '#fff';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '9999';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease';
  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = '1'), 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

// 세션 완료시 화면 깜빡임을 위한 function
const triggerScreenFlash = () => { 
  const overlay = document.createElement('div');
  overlay.className = 'flash-overlay';
  document.body.appendChild(overlay);

  // 애니메이션 시간(1.5s) 후 제거
  setTimeout(() => {
    document.body.removeChild(overlay);
  }, 2000);
};

// ----------------------------------------------------

function Timer({ currentFocusTask, onSessionComplete, settings, onManualComplete }) {
  const { focusTime, shortBreak, longBreak, sessionCycle } = settings;
  
  const [secondsLeft, setSecondsLeft] = useState(focusTime);
  const [isActive, setIsActive] = useState(false);
  const [isFocusing, setIsFocusing] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [hideTimeDisplay, setHideTimeDisplay] = useState(false);
  const initialTimeRef = useRef(focusTime);

  const [isMuted, setIsMuted] = useState(false);
  const isProcessingRef = useRef(false);

  // 종료시 효과음 재생 함수
  const playSound = useCallback(() => {
    if (isMuted) return; // 음소거면 실행 안 함

    // (예시: 맑은 알림음 URL)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5; // 볼륨 조절 (0.0 ~ 1.0)
    audio.play().catch(e => console.log("오디오 재생 오류(브라우저 정책):", e));
  }, [isMuted]);

  // 작업 또는 설정 변경 시 리셋
  useEffect(() => {
    setIsActive(false);
    setIsFocusing(true);
    setSecondsLeft(focusTime);
    initialTimeRef.current = focusTime;
    setSessionCount(0);
    isProcessingRef.current = false;
  }, [currentFocusTask?.id, focusTime, shortBreak, longBreak, sessionCycle]);

// ✨ useCallback 적용
  const formatTime = useCallback((totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, []); // 의존성 없음
  
  // 타이머 동작
  useEffect(() => {
    if (!isActive) return;
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);
  
  const handleReset = useCallback(() => {
    setIsActive(false);
    setIsFocusing(true);
    setSecondsLeft(focusTime);
    initialTimeRef.current = focusTime;
    isProcessingRef.current = false;
    setSessionCount(0);
  }, [focusTime]);

  // 시간 종료 시 처리 (휴식/집중 전환)
  // ✨ useCallback 적용
  const handleTimeUp = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const wasFocusing = isFocusing;
    const newCount = wasFocusing ? sessionCount + 1 : sessionCount;

    triggerScreenFlash(); // 함수 호출해서 깜빡임 효과 주기
    playSound();// 효과음 재생하기
    
    if (wasFocusing) {

      setSessionCount(newCount);
      onSessionComplete(currentFocusTask.id);

      if (newCount % sessionCycle === 0) {
        showAutoDismissMessage(`🎉 ${sessionCycle}회 전체 주기 완료! 수고하셨습니다!`);
        handleReset();
        return; 
      } else {
        showAutoDismissMessage(`🔥 집중 세션 ${newCount}회 완료! 짧은 휴식(${shortBreak / 60}분) 시작!`);
        setSecondsLeft(shortBreak);
        initialTimeRef.current = shortBreak;
      }
    } else {
      showAutoDismissMessage('⏰ 휴식 종료! 다시 집중을 시작합니다!');
      setSecondsLeft(focusTime);
      initialTimeRef.current = focusTime;
    }

    setIsFocusing(!wasFocusing);
    setTimeout(() => {
        setIsActive(true);
        isProcessingRef.current = false; 
    }, 150);
  }, [
    isFocusing, 
    sessionCount, 
    currentFocusTask?.id, 
    onSessionComplete, 
    sessionCycle, 
    handleReset, 
    shortBreak, 
    focusTime,
    // longBreak는 마지막 세션 종료 로직으로 인해 의존성에서 빠짐
  ]);

  // secondsLeft가 0이 될 때 handleTimeUp 호출
  useEffect(() => {
    if (secondsLeft === 0) {
      handleTimeUp();
    }
  }, [secondsLeft, handleTimeUp]);


  const handleMiddleCompletion = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    let secondsToAdd = 0;
    let totalCompletedSeconds = sessionCount * focusTime;

    // 현재 '집중' 세션 진행 중이었다면, 현재까지 진행한 시간도 더함
    if (isFocusing) {
      const currentFocusProgress = focusTime - secondsLeft;
      totalCompletedSeconds += currentFocusProgress;
      secondsToAdd = focusTime - secondsLeft;
    }

    // 1. (중요) 부모 컴포넌트로 총 완료 시간(초)을 전달
    if (onManualComplete) {
      onManualComplete(secondsToAdd); 
    }

    // 2. 사용자에게 알림
    const totalCompletedMinutes = Math.floor(totalCompletedSeconds / 60);
    const totalCompletedSecs = totalCompletedSeconds % 60;
    
    showAutoDismissMessage(`✅ 완료! 총 ${totalCompletedMinutes}분 ${totalCompletedSecs}초의 집중 시간이 저장되었습니다.`);

    // 3. 타이머 초기화 및 정지
    handleReset();
  }, [sessionCount, focusTime, isFocusing, secondsLeft, onManualComplete, handleReset]);

  if (!currentFocusTask) {
    return (
      <div className="timer-box no-task">
        <h2>작업을 선택하세요!</h2>
        <p>할 일 목록에서 집중할 작업을 선택 후 시작 버튼을 누르세요。</p>
      </div>
    );
  }

  // SVG 부채꼴 계산
  const radius = 90; 
  const centerX = 100;
  const centerY = 100;

  // ✨ 안전장치 추가: 0으로 나누기 방지
  const setMinutes = initialTimeRef.current > 0 ? initialTimeRef.current / 60 : 0; 
  const maxSessionAngle = (setMinutes / 60) * 360;
  const remainingRatio = initialTimeRef.current > 0 ? secondsLeft / initialTimeRef.current : 0;
  
  const currentEndAngle = maxSessionAngle * remainingRatio;
  const arcPathData = describeSector(centerX, centerY, radius, 0, currentEndAngle);

  // 눈금과 숫자
  const TOTAL_TICKS = 60;
  const ticks = [];
  for (let m = 0; m < TOTAL_TICKS; m++) {
    const angle = -(m * 6);
    const isFiveMinuteMark = m % 5 === 0;
    const tickLength = isFiveMinuteMark ? 10 : 5;
    const tickWidth = isFiveMinuteMark ? 2 : 1;
    const tickColor = isFiveMinuteMark ? '#555' : '#888';
    const tickStart = polarToCartesian(centerX, centerY, radius + 2, angle);
    const tickEnd = polarToCartesian(centerX, centerY, radius + 2 + tickLength, angle);
    ticks.push(
      <line
        key={`tick-${m}`}
        x1={tickStart.x}
        y1={tickStart.y}
        x2={tickEnd.x}
        y2={tickEnd.y}
        stroke={tickColor}
        strokeWidth={tickWidth}
        strokeLinecap="round"
      />
    );
    if (isFiveMinuteMark) {
      const textRadius = radius + 15;
      const textPosition = polarToCartesian(centerX, centerY, textRadius, angle);
      const x = centerX;
      const y = centerY;
      const transformStr = `
        translate(${x} ${y})
        scale(-1 1)
        translate(${-x} ${-y})
      `;
      ticks.push(
        <text
          key={`text-${m}`}
          x={textPosition.x}
          y={textPosition.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#555"
          transform={transformStr.trim()}
        >
          {m}
        </text>
      );
    }
  }

  return (
    <div className="timer-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2>{currentFocusTask.title}</h2>
        {/* ✨ [수정] 버튼들을 세로로 쌓기 위한 컨테이너 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {/* 시간 표시/숨김 버튼 */}
            <button 
              onClick={() => setHideTimeDisplay(prev => !prev)}
              style={{ 
                background: 'none', border: '1px solid #ccc', borderRadius: '5px', padding: '5px 10px', 
                cursor: 'pointer', fontSize: '12px', color: '#555', width: '80px'
              }}
            >
              {hideTimeDisplay ? '시간 표시' : '시간 숨김'}
            </button>

            {/* ✨ [추가] 소리 켜기/끄기 버튼 */}
            <button 
              onClick={() => setIsMuted(prev => !prev)}
              style={{ 
                background: 'none', border: '1px solid #ccc', borderRadius: '5px', padding: '5px 10px', 
                cursor: 'pointer', fontSize: '12px', color: isMuted ? '#e74c3c' : '#2ecc71', width: '80px',
                fontWeight: 'bold'
              }}
            >
              {isMuted ? '🔇 소리 끔' : '🔊 소리 켬'}
            </button>
        </div>
      </div>
      <p className="session-info">세션: {sessionCount} / {sessionCycle} 회</p>

      <p className="timer-mode">
        {isFocusing 
          ? '집중 시간' 
          : (sessionCount % sessionCycle === 0 && sessionCount !== 0) 
            ? '긴 휴식' // 이 경우는 이제 발생하지 않음 (바로 종료되므로)
            : '짧은 휴식'}
      </p>

      <div className="timer-display-flex">
        {/* ✨ hideTimeDisplay 상태에 따라 visibility 변경 */}
        <div 
          className="digital-time-display"
          style={{ visibility: hideTimeDisplay ? 'hidden' : 'visible' }} // ✨ 스타일 추가
        >
          {formatTime(secondsLeft)}
          <p className="current-mode-label">남은 시간</p>
        </div>

        <div className="circular-timer-container">
          <svg className="circular-timer" viewBox="-20 -20 240 240">
            <circle
              cx="100" cy="100" r={radius}
              fill="transparent"
              stroke="#e0e0e0"
              strokeWidth="1"
            />
            <path
              d={arcPathData}
              fill={isFocusing ? '#e74c3c' : '#2ecc71'}
              className="progress-arc"
            />
            {ticks}
          </svg>
        </div>
      </div>

      <div className="timer-controls">
        <button onClick={() => setIsActive(!isActive)}>
          {isActive ? '일시정지' : (secondsLeft === initialTimeRef.current && !isActive) ? '시작' : '계속'}
        </button>
        <button onClick={handleReset} disabled={!isActive && secondsLeft === initialTimeRef.current && sessionCount === 0}>
          주기 초기화
        </button>
        <button onClick={handleMiddleCompletion}>
          완료
        </button>
      </div>
    </div>
  );
}

export default Timer;
