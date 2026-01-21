const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const PSK = process.env.PSK;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncLckStats() {
  if (!PSK) {
    console.error("❌ 오류: PSK(API 토큰)가 설정되지 않았습니다.");
    return;
  }

  console.log("--- [상세 지표 수집 및 DB 동기화 시작] ---");

  try {
    const response = await axios.get('https://api.pandascore.co/lol/matches', {
      params: {
        'filter[league_id]': 293,
        'filter[status]': 'finished',
        'range[begin_at]': '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z',
        'per_page': 100
      },
      headers: { 
        'Authorization': `Bearer ${PSK.trim()}`,
        'Accept': 'application/json'
      }
    });

    const matches = response.data;
    console.log(`🔎 분석할 총 매치 수: ${matches.length}개`);

    if (matches.length === 0) {
      console.log("⚠️ 분석할 데이터가 없습니다.");
      return;
    }

    const playerStats = {};

    for (const match of matches) {
      console.log(`📊 매치 분석 중: ${match.name}`);
      for (const game of match.games) {
        try {
          const gameDetail = await axios.get(`https://api.pandascore.co/lol/games/${game.id}`, {
            headers: { 'Authorization': `Bearer ${PSK.trim()}` }
          });

          const gameLengthMinutes = (gameDetail.data.length || 0) / 60;
          
          if (gameDetail.data.players) {
            gameDetail.data.players.forEach(p => {
              const name = p.player.name;
              if (!playerStats[name]) {
                playerStats[name] = { 
                  wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0,
                  total_cs: 0, total_vision: 0, total_damage: 0, 
                  total_game_minutes: 0, game_count: 0 
                };
              }

              const stats = p.stats;
              const isWin = p.opponent && gameDetail.data.winner && (p.opponent.id === gameDetail.data.winner.id);
              
              playerStats[name].game_count += 1;
              if (isWin) playerStats[name].wins += 1;
              else playerStats[name].losses += 1;

              playerStats[name].kills += (stats.kills || 0);
              playerStats[name].deaths += (stats.deaths || 0);
              playerStats[name].assists += (stats.assists || 0);
              playerStats[name].total_cs += (stats.minions_killed || 0) + (stats.neutral_minions_killed || 0);
              playerStats[name].total_vision += (stats.vision_score || 0);
              playerStats[name].total_damage += (stats.total_damage_to_champions || 0);
              playerStats[name].total_game_minutes += gameLengthMinutes;
            });
          }
          await sleep(250);
        } catch (e) {
          console.error(`게임(${game.id}) 분석 실패:`, e.message);
        }
      }
    }

    console.log("\n💾 DB 반영 시작...");
    for (const [name, s] of Object.entries(playerStats)) {
      const kda = s.deaths === 0 ? (s.kills + s.assists).toFixed(2) : ((s.kills + s.assists) / s.deaths).toFixed(2);
      const dpm = s.total_game_minutes > 0 ? (s.total_damage / s.total_game_minutes).toFixed(0) : 0;
      const cspm = s.total_game_minutes > 0 ? (s.total_cs / s.total_game_minutes).toFixed(1) : 0;
      const avgVision = s.game_count > 0 ? (s.total_vision / s.game_count).toFixed(1) : 0;

      const { data, error } = await supabase
        .from('players')
        .upsert({
          name: name,
          wins: s.wins,
          losses: s.losses,
          kills: s.kills,
          deaths: s.deaths,
          assists: s.assists,
          kda: parseFloat(kda),
          total_cs: s.total_cs,
          avg_cs_per_min: parseFloat(cspm),
          total_vision_score: s.total_vision,
          avg_vision_score: parseFloat(avgVision),
          total_damage: s.total_damage,
          avg_dpm: parseFloat(dpm),
          last_updated: new Date()
        }, { onConflict: 'name' })
        .select();

      if (error) {
        console.error(`❌ [${name}] 업데이트 오류:`, error.message);
      } else {
        console.log(`✅ [${name}] 동기화 완료: ${s.game_count}경기 분석됨 (DPM: ${dpm})`);
      }
    }
    console.log("\n🎉 모든 데이터 동기화 프로세스 종료!");

  } catch (err) {
    console.error("❌ 치명적 오류:", err.message);
  }
}

syncLckStats();
