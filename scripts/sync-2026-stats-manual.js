const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncLckStats() {
  console.log("--- [매치 수집 시작] ---");

  try {
    const response = await axios.get('https://api.pandascore.co/lol/matches', {
      params: {
        'filter[league_id]': 293,
        'filter[status]': 'finished',
        'range[begin_at]': '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z',
        'per_page': 100,
        'token': PSK.trim()
      }
    });

    const matches = response.data;
    console.log(`🔎 분석할 총 매치 수: ${matches.length}개`);

    if (matches.length === 0) {
      console.log("⚠️ 종료된 경기가 없거나 토큰 권한을 확인하세요.");
      return;
    }

    const playerStats = {};

    for (const match of matches) {
      console.log(`📊 매치 분석 중: ${match.name}`);
      for (const game of match.games) {
        try {
          const gameDetail = await axios.get(`https://api.pandascore.co/lol/games/${game.id}`, {
            params: { 
              'token': PSK.trim() 
            }
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
          await sleep(200); 
        } catch (gameErr) {
          console.error(`세트(${game.id}) 분석 건너뜀:`, gameErr.message);
        }
      }
    }

    console.log("\n💾 DB 반영 시작...");
    for (const [name, s] of Object.entries(playerStats)) {
      const kda = s.deaths === 0 ? (s.kills + s.assists).toFixed(2) : ((s.kills + s.assists) / s.deaths).toFixed(2);
      const dpm = s.total_game_minutes > 0 ? (s.total_damage / s.total_game_minutes).toFixed(0) : 0;
      const cspm = s.total_game_minutes > 0 ? (s.total_cs / s.total_game_minutes).toFixed(1) : 0;
      const avgVision = s.game_count > 0 ? (s.total_vision / s.game_count).toFixed(1) : 0;

      await supabase.from('players').update({
        wins: s.wins, losses: s.losses, kills: s.kills, deaths: s.deaths, assists: s.assists,
        kda: parseFloat(kda), total_cs: s.total_cs, avg_cs_per_min: parseFloat(cspm),
        total_vision_score: s.total_vision, avg_vision_score: parseFloat(avgVision),
        total_damage: s.total_damage, avg_dpm: parseFloat(dpm),
        last_updated: new Date()
      }).eq('name', name);
    }
    console.log("🎉 모든 전적 업데이트 완료!");
  } catch (err) {
    if (err.response && err.response.data) {
      console.error("❌ API 오류:", err.response.data);
    } else {
      console.error("❌ 실행 오류:", err.message);
    }
  }
}

syncLckStats();
