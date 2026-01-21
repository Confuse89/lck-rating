const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [로스터 수집 시작] ---");
  
  try {
    let totalSaved = 0;

    for (const page of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      console.log(`📡 ${page}페이지 팀 목록 탐색 중...`);
      
      const response = await axios.get('https://api.pandascore.co/lol/teams', {
        params: { 'per_page': 50, 'page': page },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const allTeams = response.data;

      for (const team of allTeams) {
        if (team.players && team.players.length > 0) {
          console.log(`✅ [${team.name}] 소속 선수 ${team.players.length}명 저장 시도...`);
          
          for (const p of team.players) {
            const { error } = await supabase.from('players').upsert({
              name: p.name,
              position: p.role || 'Unknown',
              team_name: team.name,
              image_url: p.image_url,
              team_id: team.id
            }, { onConflict: 'name' });

            if (!error) totalSaved++;
          }
        }
      }
    }
    
    console.log(`\n🎉 완료: 총 ${totalSaved}명의 선수가 저장되었습니다.`);

  } catch (err) {
    console.error("❌ 오류 발생:", err.response?.data || err.message);
  }
}

sync();
