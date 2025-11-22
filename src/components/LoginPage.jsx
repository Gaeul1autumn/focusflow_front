// LoginPage.jsx
import React from 'react';

// ✨ onGoSignup prop 추가
function LoginPage({ onBack, onGoSignup }) {
  return (
    <div className="login-page" style={{ textAlign: 'center', padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ color: '#2c3e50' }}>로그인</h2>
      
      <div style={{ margin: '30px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="text" placeholder="아이디" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
        <input type="password" placeholder="비밀번호" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
      </div>
      
      <button style={{ 
        width: '100%', padding: '12px', backgroundColor: '#3498db', 
        color: 'white', border: 'none', borderRadius: '8px', 
        fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' 
      }}>
        로그인 하기
      </button>
      
      {/* ⭐️ 회원가입 버튼 추가 */}
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