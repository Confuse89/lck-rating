const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PANDA_TOKEN = process.env.PANDASCORE_API_KEY;

async function syncWithPandaScore() {
  if (!PANDA_TOKEN) {
    console.error("오류: PANDASCORE_API_KEY가 설정되지 않았습니다.");
    return;
  }

  console.log("PandaScore를 통해 LCK 로스터 동기화 시작...");
  
  try {
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: {
        'filter[league_id]': 293,
        'per_page': 100
      },
      headers: { 
        'Authorization': `Bearer ${PANDA_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const players = response.data;
    console.log(`PandaScore에서 ${players.length}명의 선수를 불러왔습니다.`);

    for (const p of players) {
      if (!p.current_team) continue;

      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.name,
          position: p.role,
          team_name: p.current_team.name,
          image_url: p.image_url
        }, { onConflict: 'name' });

      if (error) console.error(`DB 저장 에러 (${p.name}):`, error.message);
    }

    console.log("🎉 동기화 완료!");
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.error("오류 401: API 키가 유효하지 않습니다. PandaScore 대시보드에서 키를 다시 확인하세요.");
    } else {
      console.error("동기화 중 오류:", err.message);
    }
  }
}

syncWithPandaScore();
