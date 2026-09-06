import {Facing} from './engine.js';

// The train is rendered with the locomotive/front at the left edge.
export const facingArrow=facing=>facing===Facing.FRONT?'←':'→';

export function shotEndX(facing,{targetX=null,trainWidth}){
  if(targetX!==null)return targetX;
  return facing===Facing.FRONT?-100:trainWidth+100;
}

export function constrainShotDirection(facing,startX,endX){
  return facing===Facing.FRONT?Math.min(endX,startX-24):Math.max(endX,startX+24);
}
