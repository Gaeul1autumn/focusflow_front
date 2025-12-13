import React, { useState } from 'react';
import API_BASE_URL from '../config';

function SignupPage({ onBack }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // 1. 간단한 유효성 검사
    if (!formData.username || !formData.password || !formData.nickname) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 2. ✨ 백엔드 API 호출 (회원가입 요청) //FIXME: 로컬 호스트 수정
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                username: formData.username,
                password: formData.password,
                nickname: formData.nickname
            })
        });

        if (response.ok) {
            // 성공 시
            alert(`환영합니다, ${formData.nickname}님! 회원가입이 완료되었습니다.\n로그인 페이지로 이동합니다.`);
            onBack(); // 로그인 화면으로 전환
        } else {
            // 실패 시 (예: 중복된 아이디 등)
            const errorMsg = await response.text();
            alert(`회원가입 실패: ${errorMsg}`);
        }

    } catch (error) {
        console.error("회원가입 에러:", error);
        alert('서버 연결에 실패했습니다. 백엔드가 실행 중인지 확인해주세요.');
    }
  };

  return (
    <div className="login-page" style={{ textAlign: 'center', padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '30px' }}>회원가입</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" 
          name="username"
          placeholder="아이디" 
          value={formData.username}
          onChange={handleChange}
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
        <input 
          type="text" 
          name="nickname"
          placeholder="닉네임 (화면에 표시될 이름)" 
          value={formData.nickname}
          onChange={handleChange}
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
        <input 
          type="password" 
          name="password"
          placeholder="비밀번호" 
          value={formData.password}
          onChange={handleChange}
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
        <input 
          type="password" 
          name="confirmPassword"
          placeholder="비밀번호 확인" 
          value={formData.confirmPassword}
          onChange={handleChange}
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} 
        />
      </div>

      <button 
        onClick={handleSubmit}
        style={{ 
          marginTop: '30px', 
          width: '100%', 
          padding: '12px', 
          backgroundColor: '#2ecc71', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        가입하기
      </button>
      
      <button 
        onClick={onBack} 
        style={{ 
          marginTop: '15px', 
          background: 'none', 
          border: 'none', 
          color: '#7f8c8d',
          textDecoration: 'underline', 
          cursor: 'pointer' 
        }}
      >
        ← 로그인 화면으로 돌아가기
      </button>
    </div>
  );
}

export default SignupPage;