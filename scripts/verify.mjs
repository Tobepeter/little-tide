import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import { defaultTown,validateTown,roofRuns,buildTown,editTown,key,CELL,MAX_HEIGHT,styleOf,chooseColor,createSelection } from '../dist/model.js';
const town=defaultTown(), built=buildTown(town);assert(validateTown(town));
assert(roofRuns(town).some(r=>r.n>1&&r.axis==='x'));
assert(roofRuns(town).some(r=>r.n>1&&r.axis==='z'));
for(const b of Object.values(town)){
 const ray=new THREE.Raycaster(new THREE.Vector3(b.x*CELL,20,b.z*CELL),new THREE.Vector3(0,-1,0));
 const hit=ray.intersectObjects(built.pickers)[0];assert(hit,'Every cell can be picked');
 const run=hit.object.userData.roofRun;
 let actual=hit.object.userData.cell;
 if(!actual)actual=run.axis==='z'?key(run.x,Math.max(run.z,Math.min(run.z+run.n-1,Math.floor(hit.point.z/CELL+.5)))):key(Math.max(run.x,Math.min(run.x+run.n-1,Math.floor(hit.point.x/CELL+.5))),run.z);
 assert.equal(actual,key(b.x,b.z));
}
let instances=0;built.root.traverse(o=>{if(!o.isInstancedMesh)return;instances+=o.count;for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));for(const n of o.instanceMatrix.array)assert(Number.isFinite(n))});assert(built.root.children.length<200,'GPU batches stay bounded');
const edited={};assert(editTown(edited,'0,0','platform',0));assert.equal(edited['0,0'].h,0);
for(let i=0;i<MAX_HEIGHT;i++)assert(editTown(edited,'0,0','build',1));assert.equal(editTown(edited,'0,0','build',1),false);
assert(editTown(edited,'0,0','paint',2));assert.equal(edited['0,0'].c,2);
for(let i=0;i<=MAX_HEIGHT;i++)editTown(edited,'0,0','erase',2);assert.deepEqual(edited,{});
assert.equal(editTown(edited,'100,0','build',0),false);
assert.equal(validateTown({'0,0':{x:0,z:0,h:Infinity,c:0}}),false);
assert(validateTown(JSON.parse(JSON.stringify(town))));
let pair={'0,0':{x:0,z:0,h:2,c:1,v:0},'1,0':{x:1,z:0,h:2,c:1,v:0}};assert.equal(roofRuns(pair).length,1);editTown(pair,'1,0','paint',0);assert.equal(roofRuns(pair).length,2);
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');for(const match of game.matchAll(/\$\('([^']+)'\)/g))assert(html.includes(`id="${match[1]}"`),`DOM target ${match[1]} exists`);
for(const path of ['three.module.js','three.core.js','OrbitControls.js','Reflector.js','RoundedBoxGeometry.js'])assert(fs.existsSync(new URL('../dist/vendor/'+path,import.meta.url)));
console.log(JSON.stringify({status:'passed',instances,batches:built.root.children.length,checks:['finite 3D model data','roof merging in both directions','ray picking every cell','platform/build/recolor/remove','height and map bounds','save roundtrip','DOM integration','local dependency files']}));

// Random creation stays reproducible in storage and does not recolor on stacking.
assert.equal(chooseColor(-1,null,'build',()=>.99),5);
assert.equal(chooseColor(-1,{c:2},'build',()=>.99),2);
assert.equal(chooseColor(4,{c:2},'build',()=>.01),4);
assert.equal(chooseColor(-1,{c:2},'paint',()=>.01),0);
let randomTown={};editTown(randomTown,'0,0','build',chooseColor(-1,null,'build',()=>.51),-1,()=>.8);assert.equal(randomTown['0,0'].c,3);assert.equal(randomTown['0,0'].v,3);
assert.equal(validateTown({'0,0':{x:0,z:0,h:1,c:0,v:9}}),false);
for(let variant=0;variant<4;variant++){let t={'0,0':{x:0,z:0,h:2,c:1,v:variant}},b=buildTown(t),hi=createSelection(b,'0,0');assert(hi.children.length>20,'Whole house surfaces are highlighted');assert(hi.children.some(o=>o.material.clippingPlanes?.length===4),'Roof highlight clips to selected cell');assert(hi.children.some(o=>!o.material.clippingPlanes),'Walls highlight their exact geometry');assert(new THREE.Raycaster(new THREE.Vector3(0,15,0),new THREE.Vector3(0,-1,0)).intersectObjects(b.pickers).length);for(const p of b.selectionParts.get('0,0'))for(const v of p.geometry.attributes.position.array)assert(Number.isFinite(v));hi.userData.materials.forEach(m=>m.dispose())}
const joined={'0,0':{x:0,z:0,h:1,c:0,v:0},'1,0':{x:1,z:0,h:1,c:0,v:0}};const hi=createSelection(buildTown(joined),'0,0');const planes=hi.userData.materials[1].clippingPlanes;assert(planes.every(p=>p.distanceToPoint(new THREE.Vector3(0,2,0))>=0));assert(planes.some(p=>p.distanceToPoint(new THREE.Vector3(CELL,2,0))<0));
assert(!html.includes('class="intro"'));assert(!game.includes('hoverBox'));assert(html.includes('ui-root'));assert(fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8').includes('随机')); console.log('PASS: four styles, random defaults, stable stacking, legacy save validation, exact whole-house highlight, shared-roof clipping, minimal UI.');
