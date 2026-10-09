import * as THREE from './vendor/three.module.js';
import {CELL,BASE,FLOOR,PALETTE} from './model.js';
const smooth=t=>t*t*(3-2*t);
function keyframes(frames,t){if(t<=0)return frames[0].slice(1);if(t>=1)return frames.at(-1).slice(1);let i=1;while(frames[i][0]<t)i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u)}
export function motionPose(kind,t,fromY=.8){const curves={
 new:[[0,.64,.015,0],[.43,.95,1.12,.07],[.63,1.055,.925,0],[.83,.985,1.035,0],[1,1,1,0]],
 intro:[[0,.001,.001,-.08],[.45,.96,1.1,.045],[.66,1.045,.94,0],[.85,.989,1.025,0],[1,1,1,0]],
 grow:[[0,1,fromY,0],[.45,.98,1.075,.025],[.67,1.035,.96,0],[1,1,1,0]],
 paint:[[0,1,1,0],[.28,1.025,.965,0],[.58,.985,1.035,.025],[1,1,1,0]],
 tap:[[0,1,1,0],[.22,1.012,.976,0],[.50,.99,1.035,.018],[1,1,1,0]],
 remove:[[0,1,1,0],[.17,1.02,1.025,0],[.76,.84,.06,0],[1,.75,.001,-.04]]};const[sx,sy,lift]=keyframes(curves[kind]||curves.tap,Math.max(0,Math.min(1,t)));return{sx,sy,lift}}
const matrix=new THREE.Matrix4(),scale=new THREE.Matrix4(),negative=new THREE.Matrix4();
export class TownMotion{
 constructor(scene,{reduced=false}={}){this.scene=scene;this.reduced=reduced;this.built=null;this.animations=new Map();this.ripples=[];this.ghosts=[];this.ringGeometry=new THREE.RingGeometry(.47,.495,48);this.dropGeometry=new THREE.SphereGeometry(.035,5,4)}
 bind(built){
  this.built=built;this.groups=new Map();this.ownerGroups=new Map();this.activeGroups=new Set();
  for(const r of built.motionBindings){
   if(!this.groups.has(r.group))this.groups.set(r.group,[]);this.groups.get(r.group).push(r);
   for(const k of r.owners){if(!this.ownerGroups.has(k))this.ownerGroups.set(k,new Set());this.ownerGroups.get(k).add(r.group)}
  }
 }
 trigger(update,now=performance.now()){if(this.reduced)return;const{key,kind,before,after}=update;if(kind!=='remove'){const fromY=before&&after?(BASE+before.h*FLOOR+.65)/(BASE+after.h*FLOOR+.65):.8;this.animations.set(key,{kind,start:now,duration:kind==='new'?640:kind==='grow'?480:380,fromY})}else if(after)this.animations.set(key,{kind:'tap',start:now,duration:360,fromY:1});this.ripple(key,kind==='paint'?PALETTE[after.c]:'#f8f1cf',now,kind)}
 intro(town,now=performance.now()){if(this.reduced)return;const owners=new Map(Object.keys(town).map(k=>[k,k]));for(const r of this.built.motionBindings)if(r.owners.length>1)for(const k of r.owners)owners.set(k,r.group);const groups=[...new Set(owners.values())].sort((a,b)=>{const distance=k=>{const[x,z]=k.split('|')[0].split(',').map(Number);return Math.hypot(x,z)};return distance(a)-distance(b)});for(const[k,g]of owners){this.animations.set(k,{kind:'intro',start:now+Math.min(1300,groups.indexOf(g)*65),duration:700,fromY:0})}this.update(now)}
 ripple(k,color,now,kind){const[x,z]=k.split(',').map(Number);const group=new THREE.Group();group.position.set(x*CELL,.018,z*CELL);const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}),ring=new THREE.Mesh(this.ringGeometry,mat);ring.rotation.x=-Math.PI/2;group.add(ring);const drops=[];if(kind==='new'||kind==='remove')for(let i=0;i<4;i++){const drop=new THREE.Mesh(this.dropGeometry,mat),angle=i*Math.PI/2+.4;drop.userData.angle=angle;group.add(drop);drops.push(drop)}this.scene.add(group);this.ripples.push({group,ring,mat,drops,start:now,duration:650});while(this.ripples.length>32)this.disposeRipple(this.ripples.shift())}
 disposeRipple(e){this.scene.remove(e.group);e.mat.dispose()}
 removeCell(built,k,after,now=performance.now()){if(this.reduced)return;const parts=built.selectionParts.get(k);if(!parts)return;const[x,z]=k.split(',').map(Number),pivot=after?BASE+after.h*FLOOR:0,root=new THREE.Group(),mats=new Map();root.position.set(x*CELL,pivot,z*CELL);const toLocal=new THREE.Matrix4().makeTranslation(-x*CELL,-pivot,-z*CELL);for(const part of parts){const clips=[];if(part.clip)clips.push(new THREE.Plane(new THREE.Vector3(1,0,0),-x*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(-1,0,0),x*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(0,0,1),-z*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(0,0,-1),z*CELL+CELL/2+.035));if(after)clips.push(new THREE.Plane(new THREE.Vector3(0,1,0),-pivot));const clone=m=>{const id=m.uuid+'/'+part.clip;if(!mats.has(id)){const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;c.transparent=true;c.opacity=.96;c.depthWrite=false;c.clippingPlanes=clips;c.polygonOffset=true;c.polygonOffsetFactor=-1;mats.set(id,c)}return mats.get(id)};const material=Array.isArray(part.material)?part.material.map(clone):clone(part.material);const mesh=new THREE.Mesh(part.geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.multiplyMatrices(toLocal,part.matrix);root.add(mesh)}this.scene.add(root);this.ghosts.push({root,materials:[...mats.values()],start:now,duration:310,pivot});while(this.ghosts.length>16)this.disposeGhost(this.ghosts.shift())}
 disposeGhost(g){this.scene.remove(g.root);g.materials.forEach(m=>m.dispose())}
 reset(){this.animations.clear();this.activeGroups?.clear();if(this.built){for(const r of this.built.motionBindings){r.mesh.setMatrixAt(r.index,r.base);r.mesh.instanceMatrix.needsUpdate=true;r.animated=false}}for(const e of this.ripples)this.disposeRipple(e);for(const g of this.ghosts)this.disposeGhost(g);this.ripples=[];this.ghosts=[]}
 setReduced(value){this.reduced=value;if(value)this.reset()}
 update(now){if((this.animations.size||this.activeGroups?.size)&&this.built){
  const activeGroups=new Set(),dirty=new Set();
  for(const k of this.animations.keys())for(const group of this.ownerGroups.get(k)||[])activeGroups.add(group);
  for(const group of new Set([...activeGroups,...this.activeGroups])){
   const records=this.groups.get(group),owners=records[0].owners,active=owners.map(k=>this.animations.get(k)).filter(Boolean);
   let transform=null;
   if(active.length){
    const a=active.reduce((a,b)=>a.start>b.start?a:b);let kind=a.kind;
    if(owners.length>1&&active.length!==owners.length&&(kind==='new'||kind==='grow'||kind==='intro'))kind='tap';
    const pose=motionPose(kind,(now-a.start)/a.duration,a.fromY),center=records[0].center;
    transform=new THREE.Matrix4().makeTranslation(center.x,pose.lift,center.z);
    scale.makeScale(pose.sx,pose.sy,pose.sx);negative.makeTranslation(-center.x,0,-center.z);transform.multiply(scale).multiply(negative);
   }
   for(const r of records){
    if(transform){matrix.multiplyMatrices(transform,r.base);r.mesh.setMatrixAt(r.index,matrix);r.animated=true;dirty.add(r.mesh)}
    else if(r.animated){r.mesh.setMatrixAt(r.index,r.base);r.animated=false;dirty.add(r.mesh)}
   }
  }
  this.activeGroups=activeGroups;for(const mesh of dirty)mesh.instanceMatrix.needsUpdate=true;
  for(const[k,a]of this.animations)if(now>=a.start+a.duration)this.animations.delete(k);
 }

 for(let i=this.ripples.length-1;i>=0;i--){const e=this.ripples[i],t=(now-e.start)/e.duration;if(t>=1){this.disposeRipple(e);this.ripples.splice(i,1);continue}const radius=.65+2.8*t;e.ring.scale.setScalar(radius);e.mat.opacity=.42*(1-t)**1.4;for(const d of e.drops){const r=.45+t*.65;d.position.set(Math.cos(d.userData.angle)*r,Math.sin(t*Math.PI)*.22,Math.sin(d.userData.angle)*r);d.scale.setScalar(1-t*.65)}}
 for(let i=this.ghosts.length-1;i>=0;i--){const g=this.ghosts[i],t=(now-g.start)/g.duration;if(t>=1){this.disposeGhost(g);this.ghosts.splice(i,1);continue}const p=motionPose('remove',t);g.root.scale.set(p.sx,p.sy,p.sx);g.root.position.y=g.pivot+p.lift;for(const m of g.materials)m.opacity=.95*(1-t)**.65}
 }
}
export class BuildAudio{
 constructor(){this.context=null;this.enabled=true;this.last=-Infinity}
 play(kind='new'){if(!this.enabled||typeof window==='undefined')return;const now=performance.now();if(now-this.last<105)return;this.last=now;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.context??=new Audio();if(this.context.state==='suspended')this.context.resume().catch(()=>{});const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='remove'?95:kind==='paint'?310:165,t);osc.frequency.exponentialRampToValueAtTime(kind==='paint'?190:48,t+.16);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.045,t+.009);gain.gain.exponentialRampToValueAtTime(.0001,t+.18);osc.connect(gain);gain.connect(c.destination);osc.start(t);osc.stop(t+.19)}catch{}}
}
