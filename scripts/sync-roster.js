const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [LCK 데이터 동기화: 하드코딩 모드] ---");
  
  const lckTeamIds = [126061, 126444, 126161, 390, 125751, 126155, 126021, 1537, 126022, 126636];

  try {
    console.log(`대상 팀 ID: ${lckTeamIds.join(', ')}`);
    
    const response = await axios.get('https://api.pandascore.co/lol/teams', {
      params: { 
        'filter[id]': lckTeamIds.join(','),
        'per_page': 100 
      },
      headers: { 
        'Authorization': `Bearer ${PSK.trim()}`,
        'Accept': 'application/json'
      }
    });

    const teams = response.data;
    console.log(`✅ 데이터 수신 성공: ${teams.length}개 팀 정보를 가져왔습니다.`);

    let totalSaved = 0;

    for (const team of teams) {
      if (team.players && team.players.length > 0) {
        console.log(`[${team.name}] 로스터 저장 중...`);
        
        for (const p of team.players) {
          const { error } = await supabase.from('players').upsert({
            name: p.name,
            position: p.role || 'Unknown',
            team_name: team.name,
            image_url: p.image_url
          }, { onConflict: 'name' });

          if (!error) totalSaved++;
        }
      }
    }
    
    console.log(`\n🎉 최종 완료: 총 ${totalSaved}명의 선수가 Supabase에 업데이트되었습니다.`);

  } catch (err) {
    console.error("❌ 최종 시도 실패:");
    if (err.response) {
      console.error("상태 코드:", err.response.status);
      console.error("서버 메시지:", JSON.stringify(err.response.data));
    } else {
      console.error("에러 내용:", err.message);
    }
  }
}

sync();
