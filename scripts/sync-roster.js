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
      where: "P.CurrentTeam IN ('T1', 'Gen.G', 'Hanwha Life Esports', 'Dplus KIA', 'KT Rolster', 'Nongshim RedForce', 'DN SOOPers', 'DRX', 'BNK FearX', 'BRION')",
      limit: 100
    };

    const response = await axios.get(url, { params });
    const players = response.data?.cargoquery || [];
    
    if (players.length === 0) {
      console.log("데이터를 찾지 못했습니다. 팀 명칭을 재확인합니다.");
      return;
    }

    console.log(`${players.length}명의 데이터를 찾았습니다. DB 업로드 시작...`);

    for (const item of players) {
      const p = item.title;
      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image ? `https://lol.fandom.com/wiki/Special:FilePath/${p.Image}` : null
        }, { onConflict: 'name' });
        
      if (error) console.error(`DB 저장 에러 (${p.ID}):`, error);
    }
    console.log("동기화 완료!");
  } catch (err) {
    console.error("실행 중 에러 발생:", err.message);
    process.exit(1);
  }
}

syncRoster();
