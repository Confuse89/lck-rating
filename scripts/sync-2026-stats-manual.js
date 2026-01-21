const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const PSK = process.env.PSK;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncLckStats() {
  if (!PSK) {
    console.error("❌ 오류: PSK(API 토큰)가 설정되지 않았습니다. GitHub Secrets를 확인하세요.");
    return;
  }

  console.log("--- [상세 지표 수집 시작] ---");

  try {
    const response = await axios.get('https://api.pandascore.co/lol/matches', {
      params: {
        'filter[league_id]': 293,
        'filter[status]': 'finished',
        'range[begin_at]': '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z',
        'per_page': 100
      },
      headers: { 
        'Authorization': `Bearer ${PSK.trim()}`,
        'Accept': 'application/json'
      }
    });

    const matches = response.data;
    console.log(`🔎 분석할 총 매치 수: ${matches.length}개`);
    
    // ... (이후 로직 동일)
    console.log("🎉 성공적으로 데이터를 가져왔습니다.");

  } catch (err) {
    if (err.response) {
      console.error("❌ API 오류:", err.response.status, err.response.data);
    } else {
      console.error("❌ 실행 오류:", err.message);
    }
  }
}

syncLckStats();
