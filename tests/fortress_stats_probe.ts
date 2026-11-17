/// <reference path="../src/core.ts" />
/// <reference path="../src/engine.ts" />
declare const require:any; declare const __dirname:string;
const fsFS=require('fs'), pathFS=require('path');
const docFS=JSON.parse(fsFS.readFileSync(pathFS.join(__dirname,'../public/gauntlet_lab_config.default.json'),'utf8')) as Gauntlet.ConfigDocument;
const stateFS=docFS.defaults;
const profilesFS=stateFS.party.map(s=>stateFS.profiles[s.profile_name]);
const rolesFS=stateFS.party.map(s=>s.manual_role);

const runA=Gauntlet.simulateOne(profilesFS,rolesFS,0,stateFS.game,12345);
const runB=Gauntlet.simulateOne(profilesFS,rolesFS,0,stateFS.game,13354);
for(const [name,run] of [['A',runA],['B',runB]] as const){
  if(run.final_current_hp<0 || run.final_current_hp>run.final_max_hp) throw new Error(`Run ${name} final current HP is outside 0..max HP`);
  for(const [label,value] of Object.entries({max_hp:run.final_max_hp,melee:run.final_melee,ranged:run.final_ranged,magic:run.final_magic,defense:run.final_defense})){
    if(!Number.isFinite(value) || value<stateFS.game.starting_stat) throw new Error(`Run ${name} final ${label} is invalid: ${value}`);
  }
}

const aggFS=Gauntlet.emptyAggregate();
Gauntlet.addRun(aggFS,runA);Gauntlet.addRun(aggFS,runB);
const metricsFS=Gauntlet.aggregateToMetrics(aggFS,stateFS.optimizer.target_wave);
const checks:[string,number,number][]=[
  ['current HP',metricsFS.mean_final_current_hp,(runA.final_current_hp+runB.final_current_hp)/2],
  ['max HP',metricsFS.mean_final_max_hp,(runA.final_max_hp+runB.final_max_hp)/2],
  ['melee',metricsFS.mean_final_melee,(runA.final_melee+runB.final_melee)/2],
  ['ranged',metricsFS.mean_final_ranged,(runA.final_ranged+runB.final_ranged)/2],
  ['magic',metricsFS.mean_final_magic,(runA.final_magic+runB.final_magic)/2],
  ['defense',metricsFS.mean_final_defense,(runA.final_defense+runB.final_defense)/2],
];
for(const [label,actual,expected] of checks){if(Math.abs(actual-expected)>1e-9) throw new Error(`Mean final ${label}: expected ${expected}, got ${actual}`);}
console.log(JSON.stringify({runA:{hp:[runA.final_current_hp,runA.final_max_hp],melee:runA.final_melee,ranged:runA.final_ranged,magic:runA.final_magic,defense:runA.final_defense},means:{hp:[metricsFS.mean_final_current_hp,metricsFS.mean_final_max_hp],melee:metricsFS.mean_final_melee,ranged:metricsFS.mean_final_ranged,magic:metricsFS.mean_final_magic,defense:metricsFS.mean_final_defense}}));
