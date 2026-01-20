const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// 1. 환경 변수 설정 확인
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PSK = process.env.PSK;

console.log("--- [시스템 진단] 환경 변수 수신 상태 ---");
console.log("SUPABASE_URL:", SUPABASE_URL ? "✅ 수신됨" : "❌ 누락");
console.log("SUPABASE_KEY:", SUPABASE_KEY ? "✅ 수신됨" : "❌ 누락");
console.log("PSK:", PSK ? `✅ 수신됨 (길이: ${PSK.length})` : "❌ 누락 (여전히 비어있음)");
console.log("---------------------------------------");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncWithPandaScore() {
  // 토큰이 없으면 실행 중단
  if (!PSK) {
    console.error("오류: PSK가 설정되지 않아 API를 호출할 수 없습니다.");
    return;
  }
  console.log(`API 키 확인됨: ${PSK.substring(0, 4)}****`);

  try {
    console.log("PandaScore API로부터 LCK 로스터를 호출합니다...");
    
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: {
        'filter[league_id]': 293,
        'per_page': 100,
        'sort': 'name'
      },
      headers: { 
        'Authorization': `Bearer ${PSK}`,
        'Accept': 'application/json'
      }
    });

    const players = response.data;
    console.log(`분석 완료: 총 ${players.length}명의 선수를 PandaScore에서 발견했습니다.`);

    for (const p of players) {
      if (!p.current_team) continue;

      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.name,
          position: p.role || 'Unknown',
          team_name: p.current_team.name,
          image_url: p.image_url
        }, { onConflict: 'name' });

      if (error) console.error(`DB 저장 에러 (${p.name}):`, error.message);
    }

    console.log("🎉 PandaScore 기반 LCK 로스터 동기화가 성공적으로 끝났습니다!");
  } catch (err) {
    if (err.response) {
      console.error(`API 오류 (${err.response.status}):`, err.response.data.error || err.message);
    } else {
      console.error("네트워크 오류:", err.message);
    }
  }
}

syncWithPandaScore();
