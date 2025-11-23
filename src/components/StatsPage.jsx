import React, { useEffect, useState } from 'react';

function StatsPage({ currentUser, onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchStats = async () => {
      try {                             //FIXME: 로컬호스트 수정
        const response = await fetch(`http://localhost:8080/api/stats/${currentUser.username}`);
        if (response.ok) {
          setStats(await response.json());
        }
      } catch (error) {
        console.error("통계 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  // 시간을 "00시간 00분" 형태로 변환
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  };

  if (loading) return <div style={{textAlign:'center', padding:'50px'}}>데이터 불러오는 중...</div>;
  if (!stats) return <div style={{textAlign:'center', padding:'50px'}}>통계 데이터가 없습니다.</div>;

  const { today, weekly } = stats;

  return (
    <div className="stats-page" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '15px' }}>←</button>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>나의 집중 리포트 📊</h2>
      </header>

      {/* 1. 오늘 통계 카드 */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#7f8c8d', fontSize: '16px' }}>오늘 총 집중 시간</h3>
        <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#3498db' }}>
          {formatDuration(today.totalFocusTime)}
        </div>
        <div style={{ marginTop: '10px', color: '#555' }}>
          총 <b>{today.focusSessions}</b>회 집중 성공! 🔥
        </div>
      </div>

      {/* 2. 주간 통계 (간단한 막대 그래프) */}
      <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>최근 7일 기록</h3>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        {weekly.length === 0 ? (
           <p style={{textAlign:'center', color:'#999'}}>최근 기록이 없습니다.</p>
        ) : (
          weekly.map((day, index) => {
            // 최대값 기준으로 그래프 길이 계산 (단순화)
            const maxTime = Math.max(...weekly.map(d => d.totalFocusTime));
            const barWidth = maxTime > 0 ? (day.totalFocusTime / maxTime) * 100 : 0;
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '80px', fontSize: '14px', color: '#666' }}>{day.date}</div>
                <div style={{ flex: 1, backgroundColor: '#f0f0f0', height: '20px', borderRadius: '10px', overflow: 'hidden', marginRight: '10px' }}>
                  <div style={{ 
                      width: `${barWidth}%`, 
                      height: '100%', 
                      backgroundColor: day.date === today.date ? '#3498db' : '#95a5a6', // 오늘은 파란색
                      transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div style={{ width: '60px', fontSize: '12px', textAlign: 'right', color: '#555' }}>
                  {Math.round(day.totalFocusTime / 60)}분
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StatsPage;