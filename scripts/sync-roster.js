const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [리그 로스터 동기화] ---");
  
  const targetLeagueIds = [293, 294, 4198, 4197, 4201];

  try {
    let totalSaved = 0;

    for (const leagueId of targetLeagueIds) {
      console.log(`📡 리그 ID [${leagueId}] 데이터 요청 중...`);
      
      const response = await axios.get('https://api.pandascore.co/lol/teams', {
        params: { 
          'filter[league_id]': leagueId,
          'per_page': 100 
        },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const teams = response.data;
      console.log(`🔎 ID [${leagueId}]에서 ${teams.length}개의 팀을 발견했습니다.`);

      for (const team of teams) {
        const players = team.players;

        if (players && players.length > 0) {
          console.log(`✅ [${team.name}] 선수 ${players.length}명 저장 중...`);
          for (const p of players) {
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
