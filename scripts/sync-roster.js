const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [필터 없이 전체 수집 후 선별 저장] ---");
  
  const targetLeagueIds = [293, 294, 4198, 4197, 4201]; 

  try {
    let totalSaved = 0;

    for (const page of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      console.log(`📡 ${page}페이지 팀 목록 탐색 중...`);
      
      const response = await axios.get('https://api.pandascore.co/lol/teams', {
        params: { 'per_page': 100, 'page': page },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const allTeams = response.data;

      for (const team of allTeams) {
        const leagueId = team.league_id || (team.current_league && team.current_league.id);

        if (targetLeagueIds.includes(leagueId)) {
          console.log(`✅ 타겟 리그 팀 발견: [${team.name}] (League ID: ${leagueId})`);
          
          if (team.players && team.players.length > 0) {
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
    }
    
    console.log(`\n🎉 완료: 총 ${totalSaved}명의 리그 선수가 저장되었습니다.`);

  } catch (err) {
    console.error("❌ 오류 발생:", err.response?.data || err.message);
  }
}

sync();
