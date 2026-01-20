import React from 'react';

export default function Home() {
  // 나중에 DB에서 가져올 임시 데이터입니다.
  const matches = [
    { id: 1, team1: "T1", team2: "GEN", score1: "9.2", score2: "8.5", status: "LIVE" },
    { id: 2, team1: "DK", team2: "HLE", score1: "7.8", score2: "8.1", status: "준비중" },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      {/* 상단 헤더 */}
      <header className="max-w-md mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-900">LCK 평점</h1>
        <button className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm">로그인</button>
      </header>

      {/* 경기 리스트 (후푸 스타일 카드) */}
      <div className="max-w-md mx-auto space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{match.status}</span>
              <span className="text-xs text-gray-400">2026.01.20</span>
            </div>
            
            <div className="flex justify-around items-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-2 mx-auto flex items-center justify-center font-bold">{match.team1}</div>
                <div className="text-2xl font-black text-gray-800">{match.score1}</div>
              </div>
              
              <div className="text-xl font-bold text-gray-300">VS</div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-2 mx-auto flex items-center justify-center font-bold">{match.team2}</div>
                <div className="text-2xl font-black text-gray-800">{match.score2}</div>
              </div>
            </div>
            
            <button className="w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition">
              평점 매기기 참여
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}