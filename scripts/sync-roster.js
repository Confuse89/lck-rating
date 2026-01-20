const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// GitHub Secrets에서 값을 가져옵니다.
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
      where: "T.League = 'LCK'",
    };

    const response = await axios.get(url, { params });
    const players = response.data.cargoquery;

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
    console.log("동기화 성공!");
  } catch (err) {
    console.error("에러 발생:", err.message);
    process.exit(1);
  }
}

syncRoster();
