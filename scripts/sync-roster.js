const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [실시간 리그 선수 수집] ---");
  
  const tierKeywords = [
    "LCK", "LPL", "LEC", "LCS", "CHALLENGERS", "ACADEMY", 
    "T1", "GEN", "DK", "HLE", "KT", "DNS", "BFX", "DRX", "NS", "BRO"
  ];

  try {
    let totalSaved = 0;

    for (const page of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      console.log(`📡 ${page}페이지 분석 중...`);
      
      const response = await axios.get('https://api.pandascore.co/lol/teams', {
        params: { 'per_page': 50, 'page': page },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const teams = response.data;

      for (const team of teams) {
        const teamNameUpper = team.name.toUpperCase();
        
        const isTargetTier = tierKeywords.some(kw => teamNameUpper.includes(kw));

        if (isTargetTier && team.players && team.players.length > 0) {
          console.log(`🎯 타겟 팀 발견: [${team.name}] - 선수 ${team.players.length}명 저장 시작`);
          
          for (const p of team.players) {
            const { error } = await supabase.from('players').upsert({
              name: p.name,
              position: p.role || 'Unknown',
              team_name: team.name,
              image_url: p.image_url,
              team_id: team.id
            }, { onConflict: 'name' });

            if (!error) totalSaved++;
            else console.error(`❌ 저장 실패 (${p.name}):`, error.message);
          }
        }
      }
    }
    
    console.log(`\n🎉 최종 완료: 총 ${totalSaved}명의 선수가 저장되었습니다!`);

  } catch (err) {
    console.error("❌ 실행 중 오류:", err.response?.data || err.message);
  }
}

sync();
