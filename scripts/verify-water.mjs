// Exercise the real Three.js Water reflection pass and asset lifecycle without
// a browser. Shader compilation / visual QA are separate from these checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/vendor/three.module.js';
import {createTownWater,setWaterLighting,advanceWater} from '../dist/water.js';
import {ReflectionBudget,reflectionSize} from '../dist/render-budget.js';

function loader(){
  return {texture:new T.Texture(),load(url,ready,progress,fail){
    this.url=url;this.ready=()=>ready(this.texture);this.fail=fail;return this.texture;
  }};
}
const assetLoader=loader();
const water=createTownWater({textureWidth:268,textureHeight:512,anisotropy:2,textureLoader:assetLoader});
assert.equal(water.geometry.index.count,6,'Water stays a two-triangle surface');
assert.equal(water.getRenderTarget().samples,0,'No extra multisampling cost on the reflection');
assert.equal(water.receiveShadow,true);
assert(fs.statSync(new URL(assetLoader.url)).size>0,'Normal map is served from a real local file');
assert.deepEqual(Array.from(water.material.uniforms.normalSampler.value.image.data),[128,128,255,255]);
assetLoader.ready();
assert.equal(water.material.uniforms.normalSampler.value,assetLoader.texture);
assert.equal(assetLoader.texture.colorSpace,T.NoColorSpace,'Normal vectors are linear data');
assert.equal(assetLoader.texture.minFilter,T.LinearMipmapLinearFilter);
assert.equal(assetLoader.texture.wrapS,T.RepeatWrapping);
assert.equal(assetLoader.texture.wrapT,T.RepeatWrapping);
assert.equal(assetLoader.texture.anisotropy,2);

// The upstream implementation must issue exactly one reflection render, restore
// renderer state and keep its original target across phone orientation changes.
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,430/820,.5,140);
camera.position.set(13,13,18);camera.lookAt(0,1.3,0);scene.add(water);
scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
let currentTarget=null,renders=0;
const renderer={xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
  getRenderTarget:()=>currentTarget,setRenderTarget:target=>currentTarget=target,
  state:{buffers:{depth:{setMask(){}}}},
  render(reflectedScene,reflectedCamera){
    renders++;assert.equal(reflectedScene,scene);assert.notEqual(reflectedCamera,camera);
    assert.equal(water.visible,false);assert.equal(currentTarget,water.getRenderTarget());
    assert(reflectedCamera.projectionMatrix.elements.every(Number.isFinite));
  }};
const budget=new ReflectionBudget();
for(const now of [0,16,32,70])if(budget.take(now))water.onBeforeRender(renderer,scene,camera);
assert.equal(renders,2,'Idle reflection updates are throttled while the shader can animate');
budget.invalidate();if(budget.take(71))water.onBeforeRender(renderer,scene,camera);
assert.equal(renders,3,'Camera and building changes render the reflection immediately');
assert.equal(currentTarget,null);assert.equal(water.visible,true);
assert.equal(renderer.xr.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
const target=water.getRenderTarget();target.setSize(...reflectionSize(820,430,512));
assert.equal(water.getRenderTarget(),target);assert.equal(target.width,512);assert.equal(target.height,268);

const light=new T.DirectionalLight('#fff0d3');light.position.set(-30,60,27);
setWaterLighting(water,false,light);const daylight=water.material.uniforms.sunColor.value.r;
setWaterLighting(water,true,light);assert(water.material.uniforms.sunColor.value.r<daylight*.1);
assert(Math.abs(water.material.uniforms.sunDirection.value.length()-1)<1e-9);
advanceWater(water,0);advanceWater(water,1/60);const flowing=water.material.uniforms.time.value;
assert(flowing>0);advanceWater(water,10,false);assert.equal(water.material.uniforms.time.value,flowing);
advanceWater(water,100);assert(water.material.uniforms.time.value-flowing<=.01101,'Resume does not jump');

let targetDisposed=0,mapDisposed=0;
target.addEventListener('dispose',()=>targetDisposed++);
assetLoader.texture.addEventListener('dispose',()=>mapDisposed++);
water.dispose();water.dispose();assert.equal(targetDisposed,1);assert.equal(mapDisposed,1);
const late=loader(),lateWater=createTownWater({textureLoader:late});
lateWater.dispose();late.ready();assert.notEqual(lateWater.material.uniforms.normalSampler.value,late.texture,'Late image loads cannot revive disposed water');
const failed=loader(),failedWater=createTownWater({textureLoader:failed});
const warn=console.warn;console.warn=()=>{};try{failed.fail();}finally{console.warn=warn;}
assert(failedWater.material.uniforms.normalSampler.value.isDataTexture,'Failed downloads retain valid water normals');failedWater.dispose();
console.log('PASS: official Water reflection pass, mobile target reuse, mipmapped linear normal map, shadow support, day/night lighting, reduced motion, asset failure and disposal.');
