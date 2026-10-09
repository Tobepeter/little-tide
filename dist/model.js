import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const PALETTE=['#ea7b83','#f0d57f','#a2b894','#87abc1','#b19dc1','#e5a27c'];
export const CELL=1.8, BASE=.58, FLOOR=1.23, MAX_HEIGHT=6, LIMIT=10;
export const key=(x,z)=>`${x},${z}`;
const materials=new Map(),geometries=new Map(),cellTemplates=new Map();
const seed=(a,b,c=1)=>{let v=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return v-Math.floor(v)};
function material(color,emissive=false){const k=color+emissive;if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,emissive:emissive?color:0,emissiveIntensity:emissive?.08:0}));return materials.get(k)}
// One rounded segment keeps smooth normals without 300 triangles per tiny brick.
function geometry(w,h,d,r=0){const k=[w,h,d,r].join('/');if(!geometries.has(k))geometries.set(k,r?new RoundedBoxGeometry(w,h,d,1,r):new THREE.BoxGeometry(w,h,d));return geometries.get(k)}
function box(parent,w,h,d,x,y,z,color,r=0){const mesh=new THREE.Mesh(geometry(w,h,d,r),material(color));mesh.position.set(x,y,z);mesh.castShadow=Math.min(w,h,d)>.1;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function line(parent,a,b,color='#455b65',radius=.015){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),len=start.distanceTo(end),k=`cyl/${radius}/${len.toFixed(4)}`;if(!geometries.has(k))geometries.set(k,new THREE.CylinderGeometry(radius,radius,len,5));const m=new THREE.Mesh(geometries.get(k),material(color));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());parent.add(m);return m}
// Tile joints belong to the roof surface, not intersecting subpixel cylinders.
// Screen-space derivatives soften their edges and fade unresolved rows at distance.
function roofMaterial(color,seam,depth,columns=true){const k=`roof/${color}/${seam}/${depth}/${columns}`;if(!materials.has(k)){
 const m=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0});
 m.userData.roofPattern=true;
 m.onBeforeCompile=shader=>{
  shader.uniforms.roofSeam={value:new THREE.Color(seam)};
  shader.uniforms.roofGrid={value:new THREE.Vector2(1/.31,8/depth)};
  shader.uniforms.roofColumns={value:columns?1:0};
  shader.vertexShader='varying vec2 vRoofPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoofPosition = position.xz;');
  shader.fragmentShader=`varying vec2 vRoofPosition;
uniform vec3 roofSeam;
uniform vec2 roofGrid;
uniform float roofColumns;
float roofJoint(float coord) {
 float footprint = max(fwidth(coord), 0.0001);
 float edge = abs(fract(coord + 0.5) - 0.5);
 float coverage = 1.0 - smoothstep(0.035 - footprint * 0.5, 0.035 + footprint * 0.5, edge);
 return coverage * (1.0 - smoothstep(0.3, 0.75, footprint));
}
`+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec2 tile = vRoofPosition * roofGrid;
float joint = max(roofJoint(tile.x) * roofColumns, roofJoint(tile.y));
diffuseColor.rgb = mix(diffuseColor.rgb, roofSeam, joint * 0.85);`);
 };
 m.customProgramCacheKey=()=> 'roof-joints-v1';materials.set(k,m);
}return materials.get(k)}
function tint(hex,v){return '#'+new THREE.Color(hex).offsetHSL(0,0,v).getHexString()}
const wallY=h=>BASE+h*FLOOR;
export const styleOf=b=>Number.isInteger(b.v)?b.v:Math.floor(seed(b.x,b.z,19)*4);
export function chooseColor(selected,building,mode,rng=Math.random){return selected>=0?selected:building&&mode==='build'?building.c:Math.min(PALETTE.length-1,Math.floor(rng()*PALETTE.length))}
export function roofRuns(town){const used=new Set(),runs=[];for(const b of Object.values(town).sort((a,b)=>a.z-b.z||a.x-b.x)){if(!b.h||used.has(key(b.x,b.z)))continue;const length=(dx,dz)=>{let n=1;while(true){const k=key(b.x+n*dx,b.z+n*dz),b2=town[k];if(!b2||used.has(k)||b2.h!==b.h||b2.c!==b.c||styleOf(b2)!==styleOf(b))break;n++}return n};let nx=length(1,0),nz=length(0,1),axis=nz>nx?'z':'x',n=Math.max(nx,nz);for(let i=0;i<n;i++)used.add(key(b.x+(axis==='x'?i:0),b.z+(axis==='z'?i:0)));runs.push({x:b.x,z:b.z,n,h:b.h,c:b.c,axis,v:styleOf(b)})}return runs}
export function defaultTown(){const town={};[[-2,-1,3,0],[-1,-1,2,1],[0,-1,2,1],[1,-1,0,0],[2,-1,2,0],[-2,0,0,0],[-1,0,1,1],[0,0,1,1],[1,0,0,0],[2,0,2,0],[-2,1,1,0],[-1,1,0,0],[0,1,0,0],[1,1,2,0],[2,1,1,1],[-2,2,0,0],[0,2,1,2],[1,2,0,0]].forEach(([x,z,h,c])=>town[key(x,z)]={x,z,h,c,v:x===-2?3:x===2&&z<1?1:x===1&&z===1?2:x===0&&z===2?1:0});return town}
export function validateTown(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>441)return false;return Object.entries(value).every(([k,b])=>b&&Number.isInteger(b.x)&&Number.isInteger(b.z)&&Math.abs(b.x)<=LIMIT&&Math.abs(b.z)<=LIMIT&&Number.isInteger(b.h)&&b.h>=0&&b.h<=MAX_HEIGHT&&Number.isInteger(b.c)&&b.c>=0&&b.c<PALETTE.length&&(b.v===undefined||(Number.isInteger(b.v)&&b.v>=0&&b.v<4))&&k===key(b.x,b.z))}
export function editTown(town,k,mode,color,variant=-1,rng=Math.random){let b=town[k];if(mode==='eraseAll'){if(!b)return false;delete town[k];return true}if(mode==='erase'){if(!b)return false;if(b.h===0)delete town[k];else b.h--;return true}if(mode==='paint'){if(!b)return false;const styleChange=variant>=0&&styleOf(b)!==variant;if(b.c===color&&!styleChange)return false;b.c=color;if(variant>=0)b.v=variant;return true}if(b){if(mode==='platform'||b.h>=MAX_HEIGHT)return false;b.h++;b.c=color}else{let[x,z]=k.split(',').map(Number);if(!Number.isInteger(x)||!Number.isInteger(z)||Math.abs(x)>LIMIT||Math.abs(z)>LIMIT)return false;town[k]={x,z,h:mode==='platform'?0:1,c:color,v:variant>=0?variant:Math.min(3,Math.floor(rng()*4))}}return true}

function facade(group,b,town,side){const dx=[0,1,0,-1][side],dz=[1,0,-1,0][side],neighbor=town[key(b.x+dx,b.z+dz)];const f=new THREE.Group();f.rotation.y=side*Math.PI/2;group.add(f);const c=PALETTE[b.c],variant=styleOf(b);
for(let floor=0;floor<b.h;floor++){if(neighbor&&neighbor.h>floor)continue;const y=BASE+floor*FLOOR;
// Slight plaster variation and real window recesses, frames, crossbars and sills.
for(let j=0;j<5;j++){const xx=(seed(b.x+side,b.z+floor,j)-.5)*1.3,yy=y+.15+seed(b.z,b.x,j+floor)*.8;box(f,.18+seed(j,side)*.27,.14,.007,xx,yy,.851,tint(c,(j%2?.035:-.025)))}
box(f,.50,.57,.065,0,y+.64,.87,'#bfaa95',.025);const glass=box(f,.37,.43,.035,0,y+.65,.91,'#42677a');glass.material=material('#ffd98a',true);glass.userData.window=true;
box(f,.43,.043,.045,0,y+.65,.94,'#fff3d6');box(f,.043,.46,.045,0,y+.65,.94,'#fff3d6');box(f,.59,.075,.18,0,y+.335,.93,'#f2e8d4',.015);
if(variant===3){for(const xx of[-.78,.78])box(f,.072,FLOOR,.045,xx,y+FLOOR/2,.88,'#8e705e');box(f,1.65,.072,.045,0,y+.055,.89,'#8e705e');line(f,[-.75,y+.09,.884],[-.32,y+.39,.884],'#8e705e',.026);line(f,[.75,y+.09,.884],[.32,y+.39,.884],'#8e705e',.026)}
if(variant===1||variant===3){const shutter=variant===1?'#567d7b':'#aa8666';for(const xx of[-.34,.34]){box(f,.14,.49,.06,xx,y+.65,.91,shutter,.012);for(let i=0;i<3;i++)box(f,.115,.018,.015,xx,y+.52+i*.12,.951,tint(shutter,.07))}}
if(variant===2&&floor===b.h-1){box(f,.96,.07,.34,0,y+.3,1,'#ecdbc0',.025);for(let i=0;i<=4;i++)line(f,[-.43+i*.215,y+.34,1.14],[-.43+i*.215,y+.67,1.14],'#566f74',.012);line(f,[-.44,y+.67,1.14],[.44,y+.67,1.14],'#566f74',.013)}
if(floor===0&&seed(b.x,b.z,side)>.72){box(f,.26,.17,.17,-.56,y+.14,.94,'#bd7862',.025);box(f,.32,.16,.19,-.56,y+.28,.94,'#849d75',.06)}
}
if(!neighbor){for(let row=0;row<3;row++)for(let col=0;col<4;col++){let xx=-.675+col*.45+(row%2?.12:0);if(xx>.81)continue;box(f,.40,.14,.017,xx,.07+row*.17,.903,['#91a1a4','#83969e','#758a97'][(row+col+side)%3],.02)}
if(b.h>0&&side===0&&seed(b.x,b.z)>.58){box(f,.39,.67,.055,-.5,BASE+.335,.88,'#526c75',.09);box(f,.06,.05,.03,-.40,BASE+.35,.92,'#e6c488')}
if(b.h===0){for(let i=0;i<=4;i++)line(f,[-.86+i*.43,BASE+.05,.83],[-.86+i*.43,BASE+.48,.83]);line(f,[-.86,BASE+.48,.83],[.86,BASE+.48,.83]);line(f,[-.86,BASE+.21,.83],[.86,BASE+.21,.83])}
if(side===0&&seed(b.x,b.z,7)>.68){line(f,[-.29,-.25,.96],[-.29,BASE+.15,.96]);line(f,[.05,-.25,.96],[.05,BASE+.15,.96]);for(let y=-.15;y<BASE+.1;y+=.17)line(f,[-.29,y,.97],[.05,y,.97], '#455b65',.012)}
}}
function roof(parent,run){const group=new THREE.Group();group.position.set(run.x*CELL,0,run.z*CELL);if(run.axis==='z')group.rotation.y=-Math.PI/2;group.userData.roofRun=run;parent.add(group);return run.v===1?hipRoof(group,{...run,x:0,z:0}):run.v===2?terraceRoof(group,{...run,x:0,z:0}):roofGeometry(group,{...run,x:0,z:0})}
function roofGeometry(group,run){const width=run.n*CELL+.13,depth=CELL+.12,rise=run.v===3?.88:.65,y=wallY(run.h),x=(run.x+(run.n-1)/2)*CELL,z=run.z*CELL;
// Extruded triangular prism: both slopes and both gables have real thickness.
const shape=new THREE.Shape();shape.moveTo(-depth/2,0);shape.lineTo(0,rise);shape.lineTo(depth/2,0);shape.closePath();let geoKey='roof/'+run.n+'/'+run.v;if(!geometries.has(geoKey)){let g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025});g.rotateY(-Math.PI/2);g.translate(width/2,0,0);geometries.set(geoKey,g)}
const tileColor=run.v===3?'#db9f81':run.c===1?'#f2bd98':'#f5e3aa';
const mesh=new THREE.Mesh(geometries.get(geoKey),[material(tint(PALETTE[run.c],.015)),roofMaterial(run.v===3?'#c88971':run.c===1?'#eaae84':'#edda97',tileColor,depth)]);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
// Keep the substantial ridge cap as geometry; the fine tile grid is filtered shading.
line(group,[x-width/2,y+rise+.085,z],[x+width/2,y+rise+.085,z],tileColor,.045);
for(const zz of[-depth/2,depth/2])box(group,width,.055,.045,x,y-.03,z+zz,'#fff0d6');
// One chimney per continuous roof.
const cx=x-width*.28;box(group,.24,.68,.28,cx,y+.54,z-.20,PALETTE[run.c],.025);box(group,.29,.07,.33,cx,y+.89,z-.20,tint(PALETTE[run.c],-.04),.02);box(group,.16,.008,.19,cx,y+.931,z-.20,'#6a5354');
return mesh;
}
function hipRoof(group,run){const w=run.n*CELL+.14,d=CELL+.14,h=.62,y=wallY(run.h),x=(run.n-1)*CELL/2;
const k='hip/'+run.n;if(!geometries.has(k)){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,-w/2+.58,h,0,w/2-.58,h,0],3));g.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2]);const flat=g.toNonIndexed();flat.computeVertexNormals();geometries.set(k,flat)}
const mesh=new THREE.Mesh(geometries.get(k),roofMaterial('#6e9095','#87aaad',d,false));mesh.position.set(x,y,0);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
box(group,w,.08,d,x,y-.03,0,'#f4e8cf',.03);for(const sign of[-1,1]){line(group,[x-w/2,y+.04,sign*d/2],[x-w/2+.58,y+h+.04,0],'#87aaad',.018);line(group,[x+w/2,y+.04,sign*d/2],[x+w/2-.58,y+h+.04,0],'#87aaad',.018)}line(group,[x-w/2+.58,y+h+.04,0],[x+w/2-.58,y+h+.04,0],'#a0bdbc',.032);return mesh}
function terraceRoof(group,run){const w=run.n*CELL,y=wallY(run.h),x=(run.n-1)*CELL/2;const deck=box(group,w,.12,CELL,x,y+.02,0,'#ded2b5',.035);
for(const z of[-.80,.80]){for(let xx=-w/2+.09;xx<=w/2;xx+=.42)line(group,[x+xx,y+.10,z],[x+xx,y+.51,z],'#4e696e',.013);line(group,[x-w/2+.08,y+.51,z],[x+w/2-.08,y+.51,z],'#4e696e',.016)}
for(const xx of[x-w/2+.08,x+w/2-.08]){for(let z=-.8;z<=.81;z+=.4)line(group,[xx,y+.1,z],[xx,y+.51,z],'#4e696e',.013);line(group,[xx,y+.51,-.8],[xx,y+.51,.8],'#4e696e',.016)}
for(const xx of[x-w/2+.32,x+w/2-.32]){box(group,.32,.24,.32,xx,y+.19,-.47,'#c48570',.03);box(group,.39,.30,.38,xx,y+.40,-.47,'#92ad82',.11)}box(group,.7,.08,.26,x,y+.22,.3,'#af8b67',.025);for(const xx of[x-.25,x+.25])box(group,.06,.20,.2,xx,y+.1,.3,'#af8b67');return deck}
export function buildTown(town){const root=new THREE.Group(),pickers=[],windows=[],foam=[],selectionParts=new Map(),motionBindings=[];
// A brush stroke usually changes a handful of cells. Reuse unchanged facade
// templates, invalidating a cell when its height, appearance or neighbours change.
for(const k of cellTemplates.keys())if(!town[k])cellTemplates.delete(k);
for(const[k,b]of Object.entries(town)){
const signature=[b.h,b.c,styleOf(b),...[[0,1],[1,0],[0,-1],[-1,0]].map(([dx,dz])=>town[key(b.x+dx,b.z+dz)]?.h??-1)].join('/');
const cached=cellTemplates.get(k);let group=cached?.signature===signature?cached.group:null;
if(!group){group=new THREE.Group();group.position.set(b.x*CELL,0,b.z*CELL);group.userData.cell=k;
box(group,CELL,.55,CELL,0,.225,0,'#8196a1',.055);box(group,CELL+.025,.105,CELL+.025,0,BASE-.07,0,'#c58075',.04);box(group,CELL-.12,.055,CELL-.12,0,BASE+.005,0,'#e1d4b3',.03);
if(b.h>0){box(group,CELL-.095,b.h*FLOOR,CELL-.095,0,BASE+b.h*FLOOR/2,0,PALETTE[b.c],.065);box(group,CELL-.035,.09,CELL-.035,0,wallY(b.h)-.035,0,'#f1e7cc',.025)}else{for(let i=-1;i<=1;i++){box(group,.015,.004,CELL-.15,i*.48,BASE+.035,0,'#beafa0');box(group,CELL-.15,.004,.015,0,BASE+.035,i*.48,'#beafa0')}}
for(let side=0;side<4;side++)facade(group,b,town,side);
cellTemplates.set(k,{signature,group})}root.add(group);
for(const[dx,dz]of[[0,1],[1,0],[0,-1],[-1,0]])if(!town[key(b.x+dx,b.z+dz)])foam.push({x:b.x*CELL+dx*.97,z:b.z*CELL+dz*.97,angle:dx?Math.PI/2:0});
const proxy=new THREE.Mesh(geometry(CELL-.08,Math.max(.55,b.h*FLOOR+.55),CELL-.08),new THREE.MeshBasicMaterial({visible:false}));proxy.position.set(b.x*CELL,BASE+(b.h*FLOOR)/2,b.z*CELL);proxy.userData.cell=k;pickers.push(proxy);root.add(proxy);
}
for(const run of roofRuns(town)){const roofMesh=roof(root,run);roofMesh.userData.roofRun=run;pickers.push(roofMesh)}
root.updateMatrixWorld(true);
// Batch matching meshes into GPU instances. Keep detached colliders with their
// world matrices for precise ray picking of each cell and continuous roof.
const batches=new Map();root.traverse(o=>{if(!o.isMesh||o.material?.visible===false)return;
let owner=o;while(owner&&!owner.userData.cell&&!owner.userData.roofRun)owner=owner.parent;const run=owner?.userData.roofRun;const cells=owner?.userData.cell?[owner.userData.cell]:run?Array.from({length:run.n},(_,i)=>key(run.x+(run.axis==='x'?i:0),run.z+(run.axis==='z'?i:0))):[];
for(const k of cells){if(!selectionParts.has(k))selectionParts.set(k,[]);selectionParts.get(k).push({geometry:o.geometry,matrix:o.matrixWorld.clone(),clip:!!run,material:o.material})}
o.userData.motionOwners=cells;const id=o.geometry.uuid+'/'+(Array.isArray(o.material)?o.material.map(m=>m.uuid).join(','):o.material.uuid)+'/'+o.castShadow+'/'+o.receiveShadow;if(!batches.has(id))batches.set(id,[]);batches.get(id).push(o)});
root.clear();for(const objects of batches.values()){const first=objects[0],mesh=new THREE.InstancedMesh(first.geometry,first.material,objects.length);objects.forEach((o,i)=>{mesh.setMatrixAt(i,o.matrixWorld);const owners=o.userData.motionOwners,center=owners.reduce((v,k)=>{const[x,z]=k.split(',').map(Number);return v.add(new THREE.Vector3(x*CELL,0,z*CELL))},new THREE.Vector3()).divideScalar(Math.max(1,owners.length));motionBindings.push({mesh,index:i,base:o.matrixWorld.clone(),owners,center,group:owners.join('|')})});mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh)}
root.updateMatrixWorld(true);return{root,pickers,windows,foam,selectionParts,motionBindings};
}
export function createSelection(built,k,color='#ff706b',opacity=.34){const group=new THREE.Group(),[x,z]=k.split(',').map(Number);const base=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});const clipped=base.clone();clipped.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),-x*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(-1,0,0),x*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(0,0,1),-z*CELL+CELL/2+.035),new THREE.Plane(new THREE.Vector3(0,0,-1),z*CELL+CELL/2+.035)];
for(const part of built.selectionParts.get(k)||[]){const m=new THREE.Mesh(part.geometry,part.clip?clipped:base);m.matrixAutoUpdate=false;m.matrix.copy(part.matrix);m.renderOrder=3;group.add(m)}group.userData.materials=[base,clipped];return group}
export function setWindowLight(isNight){const m=material('#ffd98a',true);m.color.set(isNight?'#f9d88a':'#456a79');m.emissive.set(isNight?'#ffbf61':'#000000');m.emissiveIntensity=isNight?.75:0}
export function createBoat(){let g=new THREE.Group();const hull=new THREE.Mesh(new THREE.SphereGeometry(.38,12,6),material('#e4c8a0'));hull.scale.set(.62,.25,1.6);g.add(hull);box(g,.30,.055,.64,0,.07,0,'#8f7160',.03);line(g,[0,.05,0],[0,1.25,0],'#6a746c',.022);let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,.27,0,0,1.22,0,.58,.28,0],3));geo.computeVertexNormals();let m=new THREE.MeshStandardMaterial({color:'#fff1cc',side:THREE.DoubleSide,roughness:.9});g.add(new THREE.Mesh(geo,m));return g}
