import * as THREE from './vendor/three.module.js';
import {Water} from './vendor/Water.js';

// Reuse r180's four scrolling normal-map samples, reflection camera and sun
// lighting. This calm preset removes fine ocean detail to suit the cartoon town.
export function createTownWater({textureWidth,textureHeight,sunDirection,anisotropy=2,normalMap=null,textureLoader=new THREE.TextureLoader()}={}){
  const fallback=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1);
  fallback.needsUpdate=true;
  const water=new Water(new THREE.PlaneGeometry(220,220),{
    textureWidth,textureHeight,waterNormals:normalMap??fallback,
    sunDirection:sunDirection?.clone().normalize(),sunColor:'#fff0d3',
    waterColor:'#397f9b',distortionScale:.28,clipBias:.003,fog:true,
  });
  water.rotation.x=-Math.PI/2;water.position.y=-.04;water.receiveShadow=true;
  water.material.name='LittleTideWater';
  water.material.uniforms.size.value=2.4;
  // Broad, shallow ripples, filtered normal detail and soft sun highlights.
  // Keep these small, asserted patches separate from the vendored component.
  const replacements=[
    ['vec3( 1.5, 1.0, 1.5 )','vec3( 0.16, 1.0, 0.16 )'],
    ['float rf0 = 0.3;','float rf0 = 0.02;'],
    // Positive mip bias removes the texture's tiny wrinkles at every distance.
    // Keep automatic distance filtering and the existing four texture samples.
    ...[0,1,2,3].map(i=>[
      `texture2D( normalSampler, uv${i} )`,
      `texture2D( normalSampler, uv${i}, 3.0 )`,
    ]),
    ['sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',
     'sunLight( surfaceNormal, eyeDirection, 48.0, 0.8, 0.5, diffuseLight, specularLight );'],
    ['specularColor += pow( direction, shiny ) * sunColor * spec;',
     `float variance = dot( dFdx( surfaceNormal ), dFdx( surfaceNormal ) )
                     + dot( dFdy( surfaceNormal ), dFdy( surfaceNormal ) );
      float filteredShiny = shiny / ( 1.0 + shiny * variance * 2.0 );
      specularColor += pow( direction, filteredShiny ) * ( filteredShiny / shiny ) * sunColor * spec;`],
    ['vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);',
     `float shadow = getShadowMask();
      vec3 body = ( waterColor * 0.45 + scatter * 0.55 ) * mix( 0.72, 1.0, shadow ) + diffuseLight * waterColor * 0.15 * shadow;
      vec3 softReflection = mix( reflectionSample, waterColor, 0.18 );
      vec3 albedo = mix( body, softReflection, min( reflectance, 0.55 ) ) + specularLight * reflectance * shadow;`],
    // Clamp only the sampling coordinate; do not smear the whole reflection
    // with a fixed screen-space sinusoid as the previous water shader did.
    ['mirrorCoord.xy / mirrorCoord.w + distortion',
     'clamp( mirrorCoord.xy / mirrorCoord.w + distortion, vec2( 0.001 ), vec2( 0.999 ) )'],
  ];
  for(const [from,to] of replacements){
    if(!water.material.fragmentShader.includes(from))throw new Error('Three.js Water shader changed; review the town material adapter.');
    water.material.fragmentShader=water.material.fragmentShader.replace(from,to);
  }

  let disposed=false,pending=null;
  const disposeWater=water.dispose.bind(water);
  water.dispose=()=>{
    if(disposed)return;
    disposed=true;
    fallback.dispose();
    // Caller-supplied maps remain owned by the caller.
    pending?.dispose();
    water.geometry.dispose();disposeWater();
  };
  if(!normalMap){
    pending=textureLoader.load(new URL('./textures/waternormals.jpg',import.meta.url).href,texture=>{
      if(disposed){texture.dispose();return;}
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.colorSpace=THREE.NoColorSpace;
      texture.minFilter=THREE.LinearMipmapLinearFilter;
      texture.magFilter=THREE.LinearFilter;
      texture.generateMipmaps=true;
      texture.anisotropy=anisotropy;
      texture.needsUpdate=true;
      water.material.uniforms.normalSampler.value=texture;
      fallback.dispose();
    },undefined,()=>{
      // A missing image must not stop town editing or leave a black water plane.
      if(!disposed)console.warn('Water normal map unavailable; using calm water.');
    });
  }
  return water;
}

export function setWaterLighting(water,night,sun){
  const u=water.material.uniforms;
  u.waterColor.value.set(night?'#102e47':'#397f9b');
  u.sunColor.value.copy(sun.color).multiplyScalar(night?.16:1.8);
  u.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();
}

export function advanceWater(water,elapsed,animated=true){
  const previous=water.userData.lastWaterTime??elapsed;
  water.userData.lastWaterTime=elapsed;
  // Resume without a large jump after a hidden tab or a motion preference change.
  if(animated)water.material.uniforms.time.value+=Math.max(0,Math.min(elapsed-previous,.05))*.04;
}
