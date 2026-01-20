const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncRoster() {
  console.log("LCK 로스터 동기화 시작...");
  try {
    const url = "https://lol.fandom.com/api.php";
    const params = {
      action: "cargoquery",
      format: "json",
      tables: "Players=P",
      fields: "P.ID, P.CurrentTeam, P.Role, P.Image",
      where: "P.Region = 'Korea'", 
      limit: 200
    };

    const response = await axios.get(url, { params });
    const players = response.data?.cargoquery || [];
    
    if (players.length === 0) {
      console.log("여전히 데이터를 찾지 못했습니다. API 응답 확인:", JSON.stringify(response.data));
      return;
    }

    console.log(`${players.length}명의 데이터를 찾았습니다. DB 업로드 중...`);

    for (const item of players) {
      const p = item.title;
      // 소속 팀이 있는 선수만 저장
      if (!p.CurrentTeam) continue;

      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image ? `https://lol.fandom.com/wiki/Special:FilePath/${p.Image}` : null
        }, { onConflict: 'name' });
        
      if (error) console.error(`저장 실패: ${p.ID}`, error);
    }
    console.log("동기화 작업이 완료되었습니다!");
  } catch (err) {
    console.error("에러 발생:", err.message);
    process.exit(1);
  }
}

syncRoster();
