export const XP_LEVELS=[{name:'Spark',xp:0},{name:'Ember',xp:1000},{name:'Flame',xp:5000},{name:'Inferno',xp:12500},{name:'Blaze',xp:25000},{name:'Phoenix',xp:50000},{name:'Eternal',xp:100000}];
export const xpLevel=(xp:number)=>[...XP_LEVELS].reverse().find(level=>xp>=level.xp)||XP_LEVELS[0];
