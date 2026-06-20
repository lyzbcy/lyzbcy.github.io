// site-dev/ar/shared/tryon-props.js
// 程序生成 3D 配饰（试戴间用）。12 款：6 眼镜 + 3 帽子 + 3 耳环，PBR 材质。
// 每款 make() 返回 { group: THREE.Group, anchor: {leftEye,rightEye,top,leftEar,rightEar,scale} }
// anchor 指明该配饰贴合用的 face mesh landmark 索引（FaceLandmarker 468 点）
import * as THREE from 'three';

const METAL = ()=>new THREE.MeshStandardMaterial({color:0xd4a017, metalness:0.9, roughness:0.2});
const DARKMETAL = ()=>new THREE.MeshStandardMaterial({color:0x3a3a3a, metalness:0.7, roughness:0.3});
const LENS = (c)=>new THREE.MeshPhysicalMaterial({color:c, transparent:true, opacity:0.35, metalness:0, roughness:0.1, transmission:0.6});

// 通用：两个镜框 + 鼻梁
function makeTwoLens(radius, frameMat, lensMat, sep){
  const g=new THREE.Group();
  for(const sx of [-1,1]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,0.006,12,28), frameMat);
    ring.position.x=sx*sep; g.add(ring);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(radius,28), lensMat);
    lens.position.x=sx*sep; lens.position.z=0.001; g.add(lens);
  }
  const bridge=new THREE.Mesh(new THREE.TorusGeometry(0.012,0.0035,8,16,Math.PI), frameMat);
  bridge.rotation.x=Math.PI/2; g.add(bridge);
  return g;
}

function glassesRound(){
  return { group: makeTwoLens(0.05, METAL(), LENS(0x111111), 0.06), anchor:{leftEye:33,rightEye:133,scale:1} };
}
function glassesSquare(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0x2c2c2c, roughness:0.4});
  const lensMat=LENS(0x223344);
  for(const sx of [-1,1]){
    const frame=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.07,0.012), mat); frame.position.x=sx*0.065; g.add(frame);
    const lens=new THREE.Mesh(new THREE.PlaneGeometry(0.09,0.06), lensMat); lens.position.x=sx*0.065; lens.position.z=0.007; g.add(lens);
  }
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.03,0.01), mat); g.add(bridge);
  return { group:g, anchor:{leftEye:33,rightEye:133,scale:1} };
}
function glassesSun(){
  const g=new THREE.Group(); const mat=DARKMETAL();
  for(const sx of [-1,1]){
    const lens=new THREE.Mesh(new THREE.CircleGeometry(0.06,28), mat); lens.position.x=sx*0.065; g.add(lens);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.06,0.005,10,24), METAL()); ring.position.x=sx*0.065; g.add(ring);
  }
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.008,0.01), METAL()); g.add(bridge);
  return { group:g, anchor:{leftEye:33,rightEye:133,scale:1} };
}
function glassesHalf(){
  const g=new THREE.Group(); const mat=METAL(); const lensMat=LENS(0x111111);
  for(const sx of [-1,1]){
    const half=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.005,10,24,Math.PI), mat);
    half.position.x=sx*0.06; half.rotation.z=Math.PI; g.add(half);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(0.05,24,0,Math.PI), lensMat);
    lens.position.x=sx*0.06; lens.position.z=0.001; lens.rotation.z=Math.PI; g.add(lens);
  }
  return { group:g, anchor:{leftEye:33,rightEye:133,scale:1} };
}
function glassesCat(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xe74c3c, roughness:0.3});
  const lensMat=LENS(0x111111);
  for(const sx of [-1,1]){
    const frame=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.006,10,24), mat);
    frame.scale.set(1.1,0.85,1); frame.position.x=sx*0.06; frame.rotation.z=sx*-0.3; g.add(frame);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(0.045,24), lensMat);
    lens.scale.set(1.1,0.85,1); lens.position.x=sx*0.06; lens.position.z=0.001; lens.rotation.z=sx*-0.3; g.add(lens);
  }
  return { group:g, anchor:{leftEye:33,rightEye:133,scale:1} };
}
function glassesAviator(){
  const g=new THREE.Group(); const mat=METAL(); const lensMat=new THREE.MeshPhysicalMaterial({color:0x665533,transparent:true,opacity:0.5,metalness:0.3,roughness:0.2,transmission:0.5});
  for(const sx of [-1,1]){
    const lens=new THREE.Mesh(new THREE.SphereGeometry(0.05,20,16,0,Math.PI*2,0,Math.PI/1.6), lensMat);
    lens.scale.set(1,1.3,0.3); lens.position.x=sx*0.065; g.add(lens);
    const frame=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.004,10,24,Math.PI*1.2), mat);
    frame.scale.set(1,1.3,1); frame.position.x=sx*0.065; g.add(frame);
  }
  const bridge=new THREE.Mesh(new THREE.TorusGeometry(0.012,0.003,8,16,Math.PI), mat); bridge.rotation.x=Math.PI/2; g.add(bridge);
  return { group:g, anchor:{leftEye:33,rightEye:133,scale:1} };
}

function hatCap(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xe74c3c, roughness:0.7, flatShading:true});
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.12,16,8,0,Math.PI*2,0,Math.PI/2), mat); g.add(cap);
  const brim=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.02,0.09), mat); brim.position.set(0,-0.005,0.1); g.add(brim);
  return { group:g, anchor:{top:10,scale:1.3} };
}
function hatBeret(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0x2c3e50, roughness:0.6, flatShading:true});
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.13,16,10,0,Math.PI*2,0,Math.PI*0.55), mat);
  cap.rotation.x=-0.15; cap.position.y=0.02; g.add(cap);
  const band=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.015,8,20), mat); band.rotation.x=Math.PI/2; g.add(band);
  return { group:g, anchor:{top:10,scale:1.3} };
}
function hatTop(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.4, flatShading:true});
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.02,24), mat); g.add(brim);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.09,0.16,24), mat); top.position.y=0.09; g.add(top);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(0.091,0.091,0.02,24), new THREE.MeshStandardMaterial({color:0x8b0000})); band.position.y=0.01; g.add(band);
  return { group:g, anchor:{top:10,scale:1.2} };
}

function earringStud(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xffdf8c, metalness:0.9, roughness:0.15, emissive:0x553300, emissiveIntensity:0.3});
  for(const sx of [-1,1]){
    const s=new THREE.Mesh(new THREE.SphereGeometry(0.013,12,12), mat); s.position.set(sx*0.115,-0.02,0); g.add(s);
  }
  return { group:g, anchor:{leftEar:234,rightEar:454,scale:1} };
}
function earringDrop(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xc0392b, metalness:0.6, roughness:0.3});
  for(const sx of [-1,1]){
    const stud=new THREE.Mesh(new THREE.SphereGeometry(0.008,10,10), mat); stud.position.set(sx*0.115,-0.02,0); g.add(stud);
    const drop=new THREE.Mesh(new THREE.ConeGeometry(0.012,0.04,10), mat); drop.position.set(sx*0.115,-0.06,0); g.add(drop);
  }
  return { group:g, anchor:{leftEar:234,rightEar:454,scale:1} };
}
function earringHoop(){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0xd4a017, metalness:0.9, roughness:0.2});
  for(const sx of [-1,1]){
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(0.025,0.004,10,24), mat); hoop.position.set(sx*0.115,-0.05,0); g.add(hoop);
  }
  return { group:g, anchor:{leftEar:234,rightEar:454,scale:1} };
}

export const TRYON_PROPS=[
  {name:'圆框眼镜', make:glassesRound, part:'glasses'},
  {name:'方框眼镜', make:glassesSquare, part:'glasses'},
  {name:'墨镜',     make:glassesSun,   part:'glasses'},
  {name:'半框眼镜', make:glassesHalf,  part:'glasses'},
  {name:'猫眼眼镜', make:glassesCat,   part:'glasses'},
  {name:'飞行员镜', make:glassesAviator, part:'glasses'},
  {name:'棒球帽',   make:hatCap,  part:'hat'},
  {name:'贝雷帽',   make:hatBeret, part:'hat'},
  {name:'礼帽',     make:hatTop,  part:'hat'},
  {name:'金耳钉',   make:earringStud, part:'earring'},
  {name:'红坠耳环', make:earringDrop, part:'earring'},
  {name:'金圈耳环', make:earringHoop, part:'earring'},
];
