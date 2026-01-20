console.log("--- 환경 변수 이름 목록 점검 ---");
const envKeys = Object.keys(process.env);
console.log("PANDA라는 글자가 포함된 변수들:", envKeys.filter(k => k.includes('PANDA')));
console.log("SUPA라는 글자가 포함된 변수들:", envKeys.filter(k => k.includes('SUPA')));
console.log("-------------------------------");
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PANDA_TOKEN = process.env.PANDASCORE_API_KEY;

async function syncWithPandaScore() {
  if (!PANDA_TOKEN) {
    console.error("오류: PANDASCORE_API_KEY 환경 변수가 전달되지 않았습니다.");
    return;
  }
  console.log(`API 키 확인됨: ${PANDA_TOKEN.substring(0, 4)}****`);

  try {
    console.log("PandaScore API로부터 LCK 로스터를 호출합니다...");
    
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: {
        'filter[league_id]': 293,
        'per_page': 100,
        'sort': 'name'
      },
      headers: { 
        'Authorization': `Bearer ${PANDA_TOKEN}`,
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
