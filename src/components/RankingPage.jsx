// src/components/RankingPage.jsx
import React, { useEffect, useState } from 'react';

function RankingPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'weekly'
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      try {
        // 탭에 따라 API 주소 변경
        const endpoint = activeTab === 'daily' ? 'daily' : 'weekly';
        const response = await fetch(`${API_BASE_URL}/api/ranks/${endpoint}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
          setRankings(await response.json());
        }
      } catch (error) {
        console.error("랭킹 로딩 실패", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [activeTab]); // 탭이 바뀔 때마다 재요청

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "0초";
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    // 1시간 이상
    if (h > 0) return `${h}시간 ${m}분`;
    
    // 1분 이상
    if (m > 0) return `${m}분 ${s}초`;
    
    // 1분 미만 (여기 때문에 0분으로 나왔던 것!)
    return `${s}초`;
  };

  // 메달 이모지
  const getRankBadge = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  return (
    <div className="ranking-page" style={{ maxWidth: '600px', minWidth: 'min(90vw, 400px)', margin: '0 auto', padding: '20px' }}>
      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '20px',justifyContent: 'center'}}>
        <button onClick={onBack} style={{ position: 'absolute', left: 0, background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}>←</button>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>명예의 전당 🏆</h2>
      </header>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #eee' }}>
        <button 
            onClick={() => setActiveTab('daily')}
            style={{ 
                flex: 1, padding: '15px', border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                borderBottom: activeTab === 'daily' ? '3px solid #3498db' : 'none',
                color: activeTab === 'daily' ? '#3498db' : '#95a5a6'
            }}
        >
            일간 랭킹
        </button>
        <button 
            onClick={() => setActiveTab('weekly')}
            style={{ 
                flex: 1, padding: '15px', border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                borderBottom: activeTab === 'weekly' ? '3px solid #3498db' : 'none',
                color: activeTab === 'weekly' ? '#3498db' : '#95a5a6'
            }}
        >
            주간 랭킹
        </button>
      </div>

      {/* 랭킹 리스트 */}
      {loading ? (
        <div style={{textAlign:'center', padding:'40px'}}>로딩 중... 🏃‍♂️</div>
      ) : rankings.length === 0 ? (
        <div style={{textAlign:'center', padding:'40px', color:'#999'}}>아직 랭킹 데이터가 없습니다.<br/>1등의 주인공이 되어보세요!</div>
      ) : (
        <div className="ranking-list">
            {rankings.map((item) => (
                <div key={item.rank} style={{ 
                    display: 'flex', alignItems: 'center', padding: '15px', marginBottom: '10px', 
                    backgroundColor: item.rank <= 3 ? '#fff' : '#f9f9f9', // 상위권은 흰 배경
                    borderRadius: '10px',
                    boxShadow: item.rank <= 3 ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                    border: item.rank <= 3 ? '1px solid #eee' : 'none'
                }}>
                    <div style={{ width: '40px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
                        {getRankBadge(item.rank)}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '15px', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        {item.nickname}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#3498db' }}>
                        {formatTime(item.totalTime)}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default RankingPage;