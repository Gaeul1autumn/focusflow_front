// LoginPage.jsx
import React, { useState } from 'react'; // ✨ useState import 필수!
import API_BASE_URL from '../config';

function LoginPage({ onBack, onGoSignup, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // 유효성 검사 (빈 값 방지)
    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {//FIXME: 로컬호스트 수정
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ⭐️ 세션 쿠키 필수 설정
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json(); 
            // 성공 시 부모 컴포넌트에 알림
            onLoginSuccess({ username: username, nickname: data.nickname });
        } else {
            alert('로그인 실패: 아이디나 비밀번호를 확인하세요.');
        }
    } catch (error) {
        console.error(error);
        alert('서버 연결 오류');
    }
  };

  // 엔터키 입력 시 로그인 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-page" style={{ textAlign: 'center', padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ color: '#2c3e50' }}>로그인</h2>
      
      <div style={{ margin: '30px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
            type="text" 
            placeholder="아이디" 
            value={username} // ✨ 상태 연결
            onChange={(e) => setUsername(e.target.value)} // ✨ 입력값 업데이트
            style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
        <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} // ✨ 상태 연결
            onChange={(e) => setPassword(e.target.value)} // ✨ 입력값 업데이트
            onKeyDown={handleKeyDown} // ✨ 엔터키 지원
            style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
      </div>
      
      <button 
        onClick={handleLogin} // ✨ 클릭 이벤트 연결
        style={{ 
            width: '100%', padding: '12px', backgroundColor: '#3498db', 
            color: 'white', border: 'none', borderRadius: '8px', 
            fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' 
        }}
      >
        로그인 하기
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        계정이 없으신가요? {' '}
        <button 
          onClick={onGoSignup}
          style={{ 
            background: 'none', border: 'none', color: '#3498db', 
            fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' 
          }}
        >
          회원가입
        </button>
      </div>

      <br /><br />
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>
        ← 메인으로 돌아가기
      </button>
    </div>
  );
}

export default LoginPage;