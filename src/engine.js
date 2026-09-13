export const Action = Object.freeze({ FLIP:'FLIP', MOVE:'MOVE', CHANGE_FLOOR:'CHANGE_FLOOR', FIRE:'FIRE', REFLEX:'REFLEX', HORSE:'HORSE' });
export const Floor = Object.freeze({ INSIDE:'INSIDE', ROOF:'ROOF' });
export const Facing = Object.freeze({ FRONT:'FRONT', REAR:'REAR' });
export const BanditState = Object.freeze({ STANDING:'STANDING', STUNNED:'STUNNED', OFF_TRAIN_PENDING:'OFF_TRAIN_PENDING', ELIMINATED:'ELIMINATED' });
export const Phase = Object.freeze({ PROGRAMMING:'PROGRAMMING', RESOLUTION:'RESOLUTION', ROUND_END:'ROUND_END', GAME_OVER:'GAME_OVER' });
export const ALL_ACTIONS = Object.freeze(Object.values(Action));

const laneKey = floor => floor === Floor.ROOF ? 'roofOccupants' : 'insideOccupants';
const isActive = p => p.state !== BanditState.ELIMINATED;
const onTrain = p => p.state === BanditState.STANDING || p.state === BanditState.STUNNED;

export function createGame({ players, lootValues, firstPlayerId }) {
  if (players.length < 3 || players.length > 7) throw new Error('Total players must be 3–7.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('Player ids must be unique.');
  if (!players.every(p => [Facing.FRONT, Facing.REAR].includes(p.facing))) throw new Error('Each player needs an explicit initial facing.');
  const wagonCount = players.length + 1;
  if (!Array.isArray(lootValues) || lootValues.length !== wagonCount) throw new Error(`Exactly ${wagonCount} loot values are required.`);
  const sections = [{ id:'LOCO', type:'LOCOMOTIVE', lootValue:null, insideOccupants:[], roofOccupants:[] }];
  for (let i=1;i<=wagonCount;i++) sections.push({ id:`W${i}`, type:'WAGON', lootValue:lootValues[i-1], insideOccupants:[], roofOccupants:[] });
  const playerStates = players.map((p, order) => ({ id:p.id, name:p.name, color:p.color, accent:p.accent, characterIndex:p.characterIndex??order%6, isHuman:!!p.isHuman, seat:order, sectionId:null, floor:Floor.INSIDE, facing:p.facing, entrySide:p.facing===Facing.FRONT?Facing.REAR:Facing.FRONT, state:BanditState.STANDING, programmedActions:[], lootCards:[] }));
  const firstIndex=playerStates.findIndex(p=>p.id===firstPlayerId);
  if (firstIndex<0) throw new Error('First player does not exist.');
  const placementOrder=[...playerStates.slice(firstIndex),...playerStates.slice(0,firstIndex)];
  placementOrder.forEach((p, i) => {
    const section = sections[sections.length - 2 - i];
    if (!section || section.type === 'LOCOMOTIVE') throw new Error('Invalid initial placement.');
    p.sectionId = section.id;
    section.insideOccupants.push(p.id);
  });
  const firstPlayer=playerStates[firstIndex];
  return { players:playerStates, trainSections:sections, roundNumber:1, firstPlayerId, currentActionIndex:0, currentTurnOffset:0, phase:Phase.PROGRAMMING, actionLog:[{round:1,type:'SETUP',text:`Draw result: ${firstPlayer.name} starts in the rearmost occupied wagon and acts first.`}], winnerIds:[], unresolved:null };
}

export function cloneGame(game) { return structuredClone(game); }
export function getPlayer(game,id) { const p=game.players.find(x=>x.id===id); if(!p) throw new Error(`Unknown player ${id}`); return p; }
export function getSection(game,id) { const s=game.trainSections.find(x=>x.id===id); if(!s) throw new Error(`Unknown section ${id}`); return s; }

export function setProgram(game, playerId, actions) {
  if (game.phase !== Phase.PROGRAMMING) throw new Error('Programs can only be set during programming.');
  const p=getPlayer(game,playerId);
  if (!isActive(p)) throw new Error('Eliminated players cannot program actions.');
  if (actions.length !== 3 || new Set(actions).size !== 3 || actions.some(a=>!ALL_ACTIONS.includes(a))) throw new Error('Choose exactly 3 different valid actions.');
  p.programmedActions=[...actions];
}

export function beginResolution(game) {
  if (game.phase!==Phase.PROGRAMMING) throw new Error('Not in programming phase.');
  if (game.players.filter(isActive).some(p=>p.programmedActions.length!==3)) throw new Error('Every active player needs a program.');
  game.phase=Phase.RESOLUTION; game.currentActionIndex=0; game.currentTurnOffset=0;
  skipEliminatedTurns(game);
}

export function resolutionOrder(game) {
  const sorted=[...game.players].sort((a,b)=>a.seat-b.seat);
  const start=sorted.findIndex(p=>p.id===game.firstPlayerId);
  return [...sorted.slice(start),...sorted.slice(0,start)].map(p=>p.id);
}

function advanceResolutionCursor(game,order){
  game.currentTurnOffset++;
  if(game.currentTurnOffset>=order.length){game.currentTurnOffset=0;game.currentActionIndex++;}
  if(game.currentActionIndex>=3)game.phase=Phase.ROUND_END;
}

function skipEliminatedTurns(game){
  const order=resolutionOrder(game);let guard=order.length*3;
  while(game.phase===Phase.RESOLUTION&&guard-->0){
    const player=getPlayer(game,order[game.currentTurnOffset]);
    if(player.state!==BanditState.ELIMINATED)break;
    advanceResolutionCursor(game,order);
  }
}

function removeFromLane(game,p) {
  if (!p.sectionId) return;
  const lane=getSection(game,p.sectionId)[laneKey(p.floor)];
  const i=lane.indexOf(p.id); if(i>=0) lane.splice(i,1);
}
function insertAtEntryEdge(game,p,sectionIndex,direction) {
  const section=game.trainSections[sectionIndex], lane=section[laneKey(p.floor)];
  p.sectionId=section.id;
  p.entrySide=direction===Facing.FRONT?Facing.REAR:Facing.FRONT;
  if(p.entrySide===Facing.REAR) lane.push(p.id); else lane.unshift(p.id);
}
function placeForwardmost(game,p,section,floor) {
  removeFromLane(game,p); p.sectionId=section.id; p.floor=floor; p.entrySide=Facing.FRONT; section[laneKey(floor)].unshift(p.id);
}
function leaveTrain(game,p) { removeFromLane(game,p); p.sectionId=null; p.state=BanditState.OFF_TRAIN_PENDING; }
function log(game,text,type='ACTION'){ game.actionLog.push({round:game.roundNumber,type,text}); }

export function moveOne(game,p,direction=p.facing) {
  const from=game.trainSections.findIndex(s=>s.id===p.sectionId), to=from+(direction===Facing.FRONT?-1:1);
  removeFromLane(game,p);
  if(to<0 || to>=game.trainSections.length){ p.sectionId=null; p.state=BanditState.OFF_TRAIN_PENDING; return false; }
  insertAtEntryEdge(game,p,to,direction); return true;
}

export function findFireTarget(game,shooter) {
  const sectionIndex=game.trainSections.findIndex(s=>s.id===shooter.sectionId), direction=shooter.facing, key=laneKey(shooter.floor);
  const here=getSection(game,shooter.sectionId)[key], pos=here.indexOf(shooter.id);
  const local = direction===Facing.FRONT ? [...here.slice(0,pos)].reverse() : here.slice(pos+1);
  for(const id of local){ const p=getPlayer(game,id); if(p.state===BanditState.STANDING) return p; }
  for(let i=sectionIndex+(direction===Facing.FRONT?-1:1); i>=0&&i<game.trainSections.length; i+=(direction===Facing.FRONT?-1:1)){
    const ids=direction===Facing.FRONT ? [...game.trainSections[i][key]].reverse() : game.trainSections[i][key];
    for(const id of ids){ const p=getPlayer(game,id); if(p.state===BanditState.STANDING) return p; }
  }
  return null;
}

export function fire(game,shooter) {
  const target=findFireTarget(game,shooter);
  if(!target){ log(game,`${shooter.name} fired and missed.`); return null; }
  const stayed=moveOne(game,target,shooter.facing);
  if(stayed) target.state=BanditState.STUNNED;
  log(game,`${shooter.name} shot ${target.name}${stayed?' and stunned them':' off the train'}.`);
  return target;
}

function resolveNormal(game,p,action){
  if(action===Action.FLIP){ p.facing=p.facing===Facing.FRONT?Facing.REAR:Facing.FRONT; log(game,`${p.name} turned ${p.facing}.`); }
  else if(action===Action.MOVE){ const stayed=moveOne(game,p); log(game,`${p.name} moved ${stayed?'one section':'off the train'}.`); }
  else if(action===Action.CHANGE_FLOOR){
    const section=getSection(game,p.sectionId); removeFromLane(game,p); p.floor=p.floor===Floor.INSIDE?Floor.ROOF:Floor.INSIDE;
    // Preserve the longitudinal side from which this bandit entered the section.
    // A vertical floor change must not erase front/rear arrival history.
    p.entrySide??=p.facing===Facing.FRONT?Facing.REAR:Facing.FRONT;
    const lane=section[laneKey(p.floor)];
    if(p.entrySide===Facing.FRONT)lane.unshift(p.id);else lane.push(p.id);
    log(game,`${p.name} changed to ${p.floor}.`);
  }
  else if(action===Action.FIRE) fire(game,p);
  else if(action===Action.REFLEX){ p.state=BanditState.STUNNED; log(game,`${p.name}'s Reflex prediction failed.`); }
  else if(action===Action.HORSE){ placeForwardmost(game,p,game.trainSections[0],Floor.INSIDE); p.facing=Facing.FRONT; log(game,`${p.name} rode to the locomotive.`); }
}

export function resolveAction(game,playerId,action){
  const p=getPlayer(game,playerId);
  if(p.state===BanditState.ELIMINATED) return;
  if(p.state===BanditState.OFF_TRAIN_PENDING){
    if(action===Action.HORSE){ p.state=BanditState.STANDING; placeForwardmost(game,p,game.trainSections[0],Floor.INSIDE); p.facing=Facing.FRONT; log(game,`${p.name} was rescued by Horse.`); }
    else { p.state=BanditState.ELIMINATED; log(game,`${p.name} was eliminated before Horse rescue.`,'ELIMINATION'); }
    return;
  }
  if(p.state===BanditState.STUNNED){
    p.state=BanditState.STANDING;
    if(action===Action.REFLEX){ log(game,`${p.name} recovered with Reflex and fired.`); fire(game,p); }
    else if(action===Action.HORSE){ placeForwardmost(game,p,game.trainSections[0],Floor.INSIDE); p.facing=Facing.FRONT; log(game,`${p.name} recovered and rode to the locomotive.`); }
    else log(game,`${p.name} woke up; ${action} was consumed.`);
    return;
  }
  resolveNormal(game,p,action);
}

function checkLastSurvivor(game){
  const aboard=game.players.filter(onTrain);
  const pending=game.players.filter(p=>p.state===BanditState.OFF_TRAIN_PENDING);
  if(aboard.length===1 && pending.length===0){ game.unresolved=null; game.phase=Phase.GAME_OVER; game.winnerIds=[aboard[0].id]; return true; }
  return false;
}

function checkHumanDefeat(game){
  const human=game.players.find(p=>p.isHuman);
  if(human?.state===BanditState.ELIMINATED){game.unresolved=null;game.phase=Phase.GAME_OVER;game.winnerIds=[];game.outcome='HUMAN_DEFEAT';return true;}
  return false;
}

export function step(game){
  if(game.phase!==Phase.RESOLUTION) throw new Error('Resolution has not begun.');
  const order=resolutionOrder(game), id=order[game.currentTurnOffset], p=getPlayer(game,id), action=p.programmedActions[game.currentActionIndex];
  resolveAction(game,id,action);
  if(checkHumanDefeat(game)) return {playerId:id,action,gameOver:true};
  if(checkLastSurvivor(game)) return {playerId:id,action,gameOver:true};
  advanceResolutionCursor(game,order);
  skipEliminatedTurns(game);
  return {playerId:id,action,gameOver:false};
}

export function endRound(game){
  if(game.phase!==Phase.ROUND_END) throw new Error('Round actions are not complete.');
  for(const p of game.players.filter(p=>p.state===BanditState.OFF_TRAIN_PENDING)){ p.state=BanditState.ELIMINATED; log(game,`${p.name} had no remaining Horse action.`,'ELIMINATION'); }
  if(checkHumanDefeat(game)) return;
  const caboose=game.trainSections.at(-1);
  for(const id of [...caboose.insideOccupants,...caboose.roofOccupants]){ const p=getPlayer(game,id); p.state=BanditState.ELIMINATED; p.sectionId=null; log(game,`${p.name} was eliminated with the caboose.`,'ELIMINATION'); }
  caboose.insideOccupants=[]; caboose.roofOccupants=[]; game.trainSections.pop();
  if(checkHumanDefeat(game)) return;
  const survivors=game.players.filter(onTrain);
  if(survivors.length===0){ game.phase=Phase.GAME_OVER; game.winnerIds=[]; game.unresolved={type:'NO_SURVIVOR'}; return; }
  if(survivors.length){
    const maxIndex=Math.max(...survivors.map(p=>game.trainSections.findIndex(s=>s.id===p.sectionId)));
    let candidates=survivors.filter(p=>game.trainSections.findIndex(s=>s.id===p.sectionId)===maxIndex);
    if(candidates.some(p=>p.floor===Floor.ROOF)) candidates=candidates.filter(p=>p.floor===Floor.ROOF);
    if(candidates.length===1){ candidates[0].lootCards.push({sectionId:caboose.id,value:caboose.lootValue}); log(game,`${candidates[0].name} claimed ${caboose.id}.`,'LOOT'); }
    else if(candidates.length>1){ game.unresolved={type:'LOOT_TIE_SAME_POSITION',playerIds:candidates.map(p=>p.id),wagon:caboose}; game.phase=Phase.ROUND_END; log(game,`Loot unresolved: ${candidates.map(p=>p.name).join(', ')} are tied in the same lane.`,'AMBIGUITY'); return; }
  }
  finishEndRound(game);
}

function finishEndRound(game){
  const survivors=game.players.filter(onTrain);
  if(survivors.length===1){ game.phase=Phase.GAME_OVER; game.winnerIds=[survivors[0].id]; return; }
  if(game.trainSections.length===1){
    const maxCards=Math.max(...survivors.map(p=>p.lootCards.length)); let tied=survivors.filter(p=>p.lootCards.length===maxCards);
    const highest=p=>Math.max(-Infinity,...p.lootCards.map(c=>c.value)); const maxValue=Math.max(...tied.map(highest)); tied=tied.filter(p=>highest(p)===maxValue);
    game.phase=Phase.GAME_OVER; game.winnerIds=tied.map(p=>p.id); return;
  }
  const seats=[...game.players].sort((a,b)=>a.seat-b.seat); let i=seats.findIndex(p=>p.id===game.firstPlayerId);
  do{i=(i+1)%seats.length;}while(!isActive(seats[i])); game.firstPlayerId=seats[i].id;
  game.roundNumber++; game.players.forEach(p=>p.programmedActions=[]); game.currentActionIndex=0; game.currentTurnOffset=0; game.phase=Phase.PROGRAMMING;
}

export function resolveLootAmbiguity(game,playerId){
  if(game.unresolved?.type!=='LOOT_TIE_SAME_POSITION' || !game.unresolved.playerIds.includes(playerId)) throw new Error('Invalid loot tie choice.');
  getPlayer(game,playerId).lootCards.push({sectionId:game.unresolved.wagon.id,value:game.unresolved.wagon.lootValue}); game.unresolved=null; finishEndRound(game);
}
