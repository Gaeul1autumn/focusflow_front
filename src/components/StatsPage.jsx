import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../config';

function StatsPage({ currentUser, onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchStats = async () => {
      try { //FIXME: 로컬 호스트 수정
        const response = await fetch(`${API_BASE_URL}/api/stats/${currentUser.username}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          throw new Error("데이터를 불러오지 못했습니다.");
        }
      } catch (err) {
        console.error("통계 로딩 실패:", err);
        setError("통계 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  // ✨ [수정됨] 시간을 "00시간 00분 00초" 형태로 변환하는 함수
  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return "0초";

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60; // 남은 초 계산

    // 1시간 이상일 때
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    
    // 1분 이상일 때
    if (m > 0) return `${m}분 ${s}초`;
    
    // 1분 미만일 때 (예: 14초)
    return `${s}초`;
  };

  if (loading) return <div style={{textAlign:'center', padding:'50px', color:'#666'}}>데이터 분석 중... ⏳</div>;
  if (error) return <div style={{textAlign:'center', padding:'50px', color:'red'}}>{error}</div>;
  if (!stats) return <div style={{textAlign:'center', padding:'50px'}}>데이터가 없습니다.</div>;

  const { today, weekly } = stats;

  return (
    <div className="stats-page" style={{ maxWidth: '700px', minWidth: 'min(90vw, 400px)', margin: '0 auto', padding: '20px', paddingBottom: '80px' }}>
      
      <header style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={onBack} style={{ position: 'absolute', left: 0, background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>←</button>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>나의 집중 리포트 📊</h2>
      </header>

      {/* 1. 오늘 통계 카드 */}
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', marginBottom: '40px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#7f8c8d', fontSize: '16px', fontWeight: 'normal' }}>
            오늘 총 집중 시간
        </h3>
        {/* ✨ 초 단위까지 표시됨 */}
        <div style={{ fontSize: '42px', fontWeight: '800', color: '#3498db', marginBottom: '10px' }}>
          {formatDuration(today.totalFocusTime)}
        </div>
        <div style={{ color: '#555', fontSize: '15px' }}>
          총 <span style={{color:'#e74c3c', fontWeight:'bold', fontSize:'18px'}}>{today.focusSessions}</span>회 집중 성공! 🔥
        </div>
      </div>

      {/* 2. 주간 통계 (막대 그래프) */}
      <h3 style={{ color: '#2c3e50', marginBottom: '20px', paddingLeft: '10px' }}>최근 7일 기록</h3>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
        {weekly.length === 0 ? (
           <p style={{textAlign:'center', color:'#999', padding:'20px'}}>최근 기록이 없습니다.</p>
        ) : (
          weekly.map((day, index) => {
            const maxTime = Math.max(...weekly.map(d => d.totalFocusTime), 1);
            const barWidth = (day.totalFocusTime / maxTime) * 100;
            const isToday = day.date === today.date;
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ width: '90px', fontSize: '14px', color: '#666', fontWeight: isToday ? 'bold' : 'normal' }}>
                    {day.date}
                </div>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '24px', borderRadius: '12px', overflow: 'hidden', marginRight: '15px' }}>
                  <div style={{ 
                      width: `${Math.max(barWidth, 2)}%`, 
                      height: '100%', 
                      backgroundColor: isToday ? '#3498db' : '#bdc3c7',
                      borderRadius: '12px',
                      transition: 'width 1s ease-in-out'
                  }}></div>
                </div>
                
                {/* ✨ 그래프 옆 숫자도 1분 미만이면 초 단위로 표시 */}
                <div style={{ width: '80px', fontSize: '13px', textAlign: 'right', color: '#555', fontWeight: '600' }}>
                  {day.totalFocusTime < 60 
                    ? `${day.totalFocusTime}초` 
                    : `${Math.round(day.totalFocusTime / 60)}분`}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: '50px', textAlign: 'center' }}>
        <button 
            onClick={onBack}
            style={{
                padding: '15px 40px', fontSize: '16px', fontWeight: 'bold', color: 'white',
                backgroundColor: '#2c3e50', border: 'none', borderRadius: '30px', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(44, 62, 80, 0.3)', transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            🏠 메인으로 돌아가기
        </button>
      </div>

    </div>
  );
}

export default StatsPage;