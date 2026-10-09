// Structural/render scheduling checks; these do not measure a phone GPU or FPS.
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {buildTown,defaultTown,CELL,BASE,FLOOR,LIMIT,MAX_HEIGHT} from '../dist/model.js';
import {TownMotion} from '../dist/motion.js';
import {renderProfile,reflectionSize,ReflectionBudget,fitTownShadow} from '../dist/render-budget.js';

const phone=renderProfile(true,3),desktop=renderProfile(false,2);
assert.equal(phone.pixelRatio,1.5);assert.equal(renderProfile(true,1).pixelRatio,1);
for(const profile of [phone,desktop])for(const [w,h] of [[430,820],[820,430],[2560,1440],[320,600]]){
 const [x,y]=reflectionSize(w,h,profile.reflectionEdge);
 assert(Math.max(x,y)<=profile.reflectionEdge);assert(Math.abs(x/y-w/h)<.01);
}
const budget=new ReflectionBudget();assert(budget.take(0));assert(!budget.take(16));assert(!budget.take(32));assert(budget.take(70));
budget.invalidate();assert(budget.take(71),'Camera or building changes bypass idle throttling');assert(!budget.take(72));

const built=buildTown(defaultTown());let triangles=0,shadowTriangles=0;
for(const mesh of built.root.children){
 const count=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
 triangles+=count;if(mesh.castShadow)shadowTriangles+=count;
 if(mesh.geometry.type==='CylinderGeometry')assert(!mesh.castShadow,'Subpixel detail cannot shimmer in the shadow map');
}
assert(triangles<75000);assert(shadowTriangles<12000);
// Exercise shader injection against the exact vendored Three.js standard shader.
const roofMaterials=new Set();for(const mesh of built.root.children)for(const m of [mesh.material].flat())if(m.userData.roofPattern)roofMaterials.add(m);
assert(roofMaterials.size>=3);
for(const material of roofMaterials){
 const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
 material.onBeforeCompile(shader);
 assert(shader.vertexShader.includes('vRoofPosition = position.xz;'));
 assert(shader.fragmentShader.includes('diffuseColor.rgb = mix'));
 assert(shader.fragmentShader.includes('fwidth(coord)'));
 assert.equal((shader.fragmentShader.match(/float joint =/g)||[]).length,1);
 for(const u of ['roofSeam','roofGrid','roofColumns'])assert(shader.uniforms[u]);
}
// Ridge geometry sits clear of the bevel rather than intersecting its peak.
for(const v of [0,3]){
 const one=buildTown({'0,0':{x:0,z:0,h:1,c:1,v}}),roof=one.pickers.at(-1);
 roof.geometry.computeBoundingBox();const peak=roof.geometry.boundingBox.max.y+BASE+FLOOR;
 const cap=one.selectionParts.get('0,0').find(p=>p.geometry.type==='CylinderGeometry'&&p.geometry.parameters.radiusTop===.045);
 assert(cap);const bounds=new T.Box3().setFromBufferAttribute(cap.geometry.attributes.position).applyMatrix4(cap.matrix);
 assert(bounds.min.y>peak,'Ridge clears the expanded bevel for both roof pitches');
}

// Cache reuse must not hide newly exposed walls or leak colour/style changes.
const snapshot=(built,k)=>built.selectionParts.get(k).map(p=>({g:p.geometry.uuid,m:[p.material].flat().map(m=>m.uuid),matrix:p.matrix.elements}));
const town={'0,0':{x:0,z:0,h:2,c:1,v:0},'1,0':{x:1,z:0,h:2,c:1,v:0}};
for(const mutate of [()=>{},()=>town['0,0'].h++,()=>town['0,0'].c=4,()=>town['0,0'].v=3,()=>delete town['1,0'],()=>town['1,0']={x:1,z:0,h:3,c:4,v:3}]){
 mutate();const cached=buildTown(town),before=snapshot(cached,'0,0');buildTown({});const fresh=buildTown(town);
 assert.deepEqual(before,snapshot(fresh,'0,0'));assert.deepEqual(snapshot(cached,'0,0'),before,'Later builds cannot mutate an existing town');
}

// Tight shadow cameras cover edge cells, maximum roofs and animation overshoot.
for(const town of [defaultTown(),{},Object.fromEntries([-LIMIT,LIMIT].flatMap(x=>[-LIMIT,LIMIT].map(z=>[`${x},${z}`,{x,z,h:MAX_HEIGHT}])))]){
 const light=new T.DirectionalLight();light.position.set(-30,60,27);fitTownShadow(light,town);
 const camera=light.shadow.camera;assert(camera.near>0&&camera.far>camera.near);
 for(const b of Object.values(town))for(const x of [-1,1])for(const z of [-1,1])for(const y of [0,(BASE+b.h*FLOOR+1.4)*1.15]){
  const p=new T.Vector3(b.x*CELL+x*CELL*.65,y,b.z*CELL+z*CELL*.65).project(camera);
  assert(p.toArray().every(v=>Math.abs(v)<=1),'Every animated corner lies inside the shadow camera');
 }
}

const animBuilt=buildTown(defaultTown()),motion=new TownMotion(new T.Scene());motion.bind(animBuilt);
const written=[];for(const mesh of animBuilt.root.children){const set=mesh.setMatrixAt.bind(mesh);mesh.setMatrixAt=(index,matrix)=>{written.push([mesh,index]);set(index,matrix)}}
motion.trigger({key:'-2,-1',kind:'tap',after:{h:3,c:0}},0);motion.update(100);
assert(written.length>0&&written.length<animBuilt.motionBindings.length/3,'A single house animation only touches its own instances');
for(const [mesh,index] of written)assert(animBuilt.motionBindings.find(r=>r.mesh===mesh&&r.index===index).owners.includes('-2,-1'));
motion.update(1000);motion.update(1016);written.length=0;motion.update(1032);assert.equal(written.length,0,'Idle animations upload no matrices');
console.log(JSON.stringify({status:'passed',triangles,shadowTriangles,batches:built.root.children.length,checks:['mobile render budgets','reflection invalidation','roof shader integration','ridge/bevel clearance','facade cache invalidation','shadow coverage','localized animations','idle uploads']}));
