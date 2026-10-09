import * as THREE from './vendor/three.module.js';
import {CELL,BASE,FLOOR} from './model.js';

export function renderProfile(coarse,dpr=1){
 return {pixelRatio:Math.min(dpr,coarse?1.5:1.7),reflectionEdge:coarse?512:1024,shadowSize:coarse?1024:2048};
}
export function reflectionSize(width,height,maxEdge){
 const scale=Math.min(1,maxEdge/Math.max(width,height));
 return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];
}
export class ReflectionBudget{
 constructor(){this.dirty=true;this.last=-Infinity}
 invalidate(){this.dirty=true}
 take(now){
  // Camera / building changes render immediately. Idle water keeps its full-rate
  // ripples while the small moving boat's reflection only needs 15 updates/s.
  if(!this.dirty&&now-this.last<1000/15)return false;
  this.dirty=false;this.last=now;return true;
 }
}

export function fitTownShadow(light,town){
 const camera=light.shadow.camera,point=new THREE.Vector3(),bounds=new THREE.Box3();
 camera.position.copy(light.position);camera.lookAt(light.target.position);camera.updateMatrixWorld();
 const cells=Object.values(town);
 for(const b of cells.length?cells:[{x:0,z:0,h:0}]){
  // Includes the roof and the maximum squash-and-stretch overshoot.
  for(const x of [-1,1])for(const z of [-1,1])for(const y of [-.2,(BASE+b.h*FLOOR+1.4)*1.15]){
   point.set(b.x*CELL+x*CELL*.65,y,b.z*CELL+z*CELL*.65).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(point);
  }
 }
 // World-aligned, quantized bounds do not swim when orbiting the camera.
 Object.assign(camera,{left:Math.floor(bounds.min.x-1),right:Math.ceil(bounds.max.x+1),bottom:Math.floor(bounds.min.y-1),top:Math.ceil(bounds.max.y+1),near:Math.max(.5,Math.floor(-bounds.max.z-2)),far:Math.ceil(-bounds.min.z+2)});
 camera.updateProjectionMatrix();
}
