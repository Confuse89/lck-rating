const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncRoster() {
  console.log("로스터 동기화 시작...");
  try {
    const url = "https://lol.fandom.com/api.php";
    const params = {
      action: "cargoquery",
      format: "json",
      tables: "Players=P, Teams=T",
      join_on: "P.CurrentTeam = T.Team",
      fields: "P.ID, P.CurrentTeam, P.Role, P.Image",
      where: "T.League = 'LCK' AND T.IsDisbanded = 0", // 해체된 팀 제외
      limit: 500
    };

    const response = await axios.get(url, { params });
    
    // 데이터 구조가 비어있을 경우를 대비한 방어 코드
    const players = response.data?.cargoquery || [];
    
    if (players.length === 0) {
      console.log("가져올 데이터가 없습니다. API 파라미터를 확인하세요.");
      return;
    }

    for (const item of players) {
      const p = item.title;
      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image
        }, { onConflict: 'name' });
        
      if (error) console.error(`Error syncing ${p.ID}:`, error);
    }
    console.log(`동기화 완료! 총 ${players.length}명의 선수를 업데이트했습니다.`);
  } catch (err) {
    console.error("에러 발생:", err.message);
    process.exit(1);
  }
}

syncRoster();
