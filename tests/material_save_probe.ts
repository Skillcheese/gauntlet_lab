/// <reference path="../src/core.ts" />
/// <reference path="../src/engine.ts" />
declare const require:any; declare const __dirname:string;
const fsMS=require('fs'), pathMS=require('path');
const docMS=JSON.parse(fsMS.readFileSync(pathMS.join(__dirname,'../public/gauntlet_lab_config.default.json'),'utf8')) as Gauntlet.ConfigDocument;
const cfgMS=Gauntlet.deepClone(docMS.defaults.game);

class SequenceRandom implements Gauntlet.RandomSource {
  private idx=0;
  constructor(private readonly values:number[]) {}
  random():number {
    if(this.idx>=this.values.length) throw new Error(`SequenceRandom exhausted at draw ${this.idx}`);
    return this.values[this.idx++];
  }
  uniform(a:number,b:number):number { return a+(b-a)*this.random(); }
}
class ConstantRandom implements Gauntlet.RandomSource {
  constructor(private readonly value:number) {}
  random():number { return this.value; }
  uniform(a:number,b:number):number { return a+(b-a)*this.value; }
}


if(Math.abs(Gauntlet.defaultMaterialSaveForTier(7)-0.175)>1e-12) throw new Error('Expected T7 fallback material save to be 17.5%');
if(Math.abs(Gauntlet.defaultMaterialSaveForTier(4)-0.10)>1e-12) throw new Error('Expected T4 fallback material save to be 10%');
if(Math.abs(Gauntlet.defaultMaterialSaveForTier(10)-0.25)>1e-12) throw new Error('Expected T10 fallback material save to be 25%');

const fallbackProfile=Gauntlet.deepClone(docMS.defaults.profiles['Generic T7']);
delete fallbackProfile.role_stats.Health.material_save;
if(Math.abs(Gauntlet.materialSaveChance(fallbackProfile.role_stats.Health)-0.175)>1e-12) throw new Error('Missing T7 material save should fall back to 17.5%');
const explicitFallbackProfile=Gauntlet.deepClone(fallbackProfile);
explicitFallbackProfile.role_stats.Health.material_save=0.175;
if(Gauntlet.profileSignature(fallbackProfile)!==Gauntlet.profileSignature(explicitFallbackProfile)) throw new Error('Missing tier-default material save should deduplicate like the equivalent explicit value');
const namedT11=Gauntlet.deepClone(docMS.defaults.profiles['Generic T11']);
if(Math.abs(Gauntlet.materialSaveChance(namedT11.role_stats.Health)-0.30)>1e-12) throw new Error('Shipped Generic T11 profile should explicitly use 30% material save');
delete namedT11.role_stats.Health.material_save;
if(Math.abs(Gauntlet.materialSaveChance(namedT11.role_stats.Health)-0.25)>1e-12) throw new Error('Missing material save on T11-named profile should fall back from its actual T10 role tier to 25%');

const profile=Gauntlet.deepClone(docMS.defaults.profiles['Generic T7']);
profile.backpack_size=36;
profile.role_stats.Health.gather_success=1;
profile.role_stats.Health.double_gather=0;
profile.role_stats.Health.process_success=1;
profile.role_stats.Health.material_save=0.20;

// 36 gather successes, with 35 failed double-gather checks; then 36 successful
// processing actions, with exactly the first 7 material-save checks succeeding.
const draws:number[]=[];
for(let i=0;i<36;i++){draws.push(0);if(i<35)draws.push(0.9);}
for(let i=0;i<36;i++){draws.push(0);draws.push(i<7?0:0.9);}
const exact=Gauntlet.generateOneLoop(profile,'Health',cfgMS,new SequenceRandom(draws),0,false);
if(exact.deposit.amount!==613) throw new Error(`Expected T7 example deposit 613, got ${exact.deposit.amount}`);
if(Gauntlet.savedRawContribution(7,16,cfgMS)!==37) throw new Error('Expected 7 saved T7 raws to contribute 37');

const failProfile=Gauntlet.deepClone(profile);
failProfile.role_stats.Health.process_success=0;
failProfile.role_stats.Health.material_save=1;
const failed=Gauntlet.generateOneLoop(failProfile,'Health',cfgMS,new ConstantRandom(0.5),0,false);
if(failed.deposit.amount!==0) throw new Error(`Processing failures must not trigger material saving; got deposit ${failed.deposit.amount}`);

console.log(JSON.stringify({exact_example:exact.deposit.amount,failed_processing_example:failed.deposit.amount}));
