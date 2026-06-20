// site-dev/world/src/npc/npc-3d-builder.js
// 12 个 NPC 的 3D 低多边独特体型（程序生成）。每个 NPC 不同几何体组合+主题色+道具。
// 保留星星布丁/周三涵（在 npc-sprites 处理），这里覆盖其余 12 个。
// 每个 build 函数返回 THREE.Group，含 userData.head（头部，供 idle 转头）和 userData.idlePhase。
import * as THREE from 'three';

function mat(color, opts={}){
  return new THREE.MeshStandardMaterial({color, flatShading:true, roughness:0.7, ...opts});
}
// 通用：身体+头部框架，返回 {g, body, head}
function baseHuman(bodyGeom, color, headColor=0xffe0c0){
  const g=new THREE.Group();
  const body=new THREE.Mesh(bodyGeom, mat(color)); body.position.y=0.5; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.28,14,12), mat(headColor)); head.position.y=1.25; g.add(head);
  return {g, body, head};
}
function addLimbs(g, color, armScale=[0.1,0.55], legScale=[0.1,0.4]){
  const m=mat(color);
  for(const sx of[-1,1]){
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(armScale[0],armScale[0],armScale[1],8),m);
    arm.position.set(sx*0.32,0.55,0); g.add(arm);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(legScale[0],legScale[0],legScale[1],8),m);
    leg.position.set(sx*0.14,0.2,0); g.add(leg);
  }
}

// 铁人教练：肌肉方块人（宽肩）+ 哑铃
function buildCoach(c){
  const {g,body,head}=baseHuman(new THREE.BoxGeometry(0.95,1.0,0.55), c);
  addLimbs(g, c, [0.14,0.7], [0.13,0.45]);
  const dmat=mat(0x444444,{metalness:0.7,roughness:0.3});
  const dumbbell=new THREE.Group();
  for(const sx of[-1,1]){const w=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),dmat);w.position.x=sx*0.12;dumbbell.add(w);}
  dumbbell.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,8),dmat));
  dumbbell.position.set(0.55,0.25,0.3); dumbbell.rotation.z=Math.PI/2; g.add(dumbbell);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 码农小周：瘦高人 + 眼镜
function buildCoder(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.22,0.7,6,12), c);
  body.scale.set(0.85,1,0.85);
  addLimbs(g, c, [0.08,0.6], [0.09,0.45]);
  head.scale.set(1.1,1.1,1.1);
  const gmat=mat(0x222222);
  for(const sx of[-1,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(0.08,0.012,8,16),gmat);ring.position.set(sx*0.1,1.27,0.22);g.add(ring);}
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.01,0.01),gmat);bridge.position.set(0,1.27,0.24);g.add(bridge);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 美食猎人：胖圆人 + 厨师帽
function buildFoodie(c){
  const {g,body,head}=baseHuman(new THREE.SphereGeometry(0.42,16,14), c);
  body.scale.set(1,1.1,1); body.position.y=0.45;
  addLimbs(g, c, [0.13,0.5], [0.14,0.4]);
  head.scale.set(1.1,1,1.05);
  const hatMat=mat(0xffffff);
  const puff=new THREE.Mesh(new THREE.SphereGeometry(0.22,14,12),hatMat);puff.position.y=1.55;g.add(puff);
  const band=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.08,14),hatMat);band.position.y=1.42;g.add(band);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 旅行背包客：瘦长人 + 背包
function buildTraveler(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.2,0.8,6,12), c);
  body.scale.set(0.8,1,0.8);
  addLimbs(g, c, [0.07,0.65], [0.08,0.5]);
  const pack=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.55,0.25), mat(0x8b4513));
  pack.position.set(0,0.55,-0.28); g.add(pack);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.9,0.05), mat(0x5a3010));
  strap.position.set(0.18,0.55,0); strap.rotation.z=0.3; g.add(strap);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 社会观察员：普通 + 笔记本
function buildObserver(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.24,0.6,6,12), c);
  addLimbs(g, c, [0.09,0.55], [0.1,0.42]);
  const book=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.04,0.2), mat(0x2c5016,{roughness:0.5}));
  book.position.set(0.3,0.45,0.2); book.rotation.x=-0.3; g.add(book);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 学霸笔记：瘦人 + 翻开的书
function buildStudent(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.21,0.65,6,12), c);
  body.scale.set(0.9,1,0.9);
  addLimbs(g, c, [0.08,0.55], [0.09,0.43]);
  const book=new THREE.Group(); const cover=mat(0x4a2c5a);
  const b1=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.02,0.22),cover);book.add(b1);
  const b2=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.02,0.22),cover);b2.rotation.y=0.4;b2.position.x=0.15;book.add(b2);
  book.position.set(0.32,0.4,0.25); book.rotation.x=-0.4; g.add(book);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 职场新人：西装人 + 领带
function buildWorker(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.26,0.65,6,12), c);
  addLimbs(g, c, [0.1,0.55], [0.11,0.42]);
  const tie=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.3,4), mat(0x8b0000));
  tie.position.set(0,0.7,0.28); tie.rotation.x=Math.PI; g.add(tie);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 工具达人：壮实 + 扳手
function buildToolman(c){
  const {g,body,head}=baseHuman(new THREE.BoxGeometry(0.7,0.85,0.5), c);
  addLimbs(g, c, [0.12,0.6], [0.12,0.42]);
  const wrench=new THREE.Group(); const wmat=mat(0x666666,{metalness:0.6,roughness:0.4});
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.4,8),wmat);wrench.add(handle);
  const head2=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.06,0.06),wmat);head2.position.y=0.2;head2.position.x=0.05;wrench.add(head2);
  wrench.position.set(0.4,0.4,0.25); wrench.rotation.z=0.5; g.add(wrench);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 生活家：优雅细长 + 茶杯
function buildLifestyler(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.2,0.7,6,12), c);
  body.scale.set(0.85,1,0.85);
  addLimbs(g, c, [0.08,0.6], [0.09,0.45]);
  const cup=new THREE.Group(); const cmat=mat(0xfff7e8);
  const body2=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.06,0.12,12),cmat);cup.add(body2);
  const chandle=new THREE.Mesh(new THREE.TorusGeometry(0.04,0.012,8,16,Math.PI),cmat);chandle.position.x=0.08;chandle.rotation.y=Math.PI/2;cup.add(chandle);
  cup.position.set(0.32,0.45,0.22); g.add(cup);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 笔者：文艺瘦 + 羽毛笔
function buildWriter(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.19,0.72,6,12), c);
  body.scale.set(0.8,1,0.8);
  addLimbs(g, c, [0.07,0.62], [0.08,0.46]);
  const pen=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.004,0.35,6),mat(0xddccaa));pen.add(shaft);
  const feather=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.2,6),mat(0xeeeeee));feather.position.y=0.18;pen.add(feather);
  pen.position.set(0.28,0.5,0.2); pen.rotation.z=0.3; g.add(pen);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 泰拉冒险家：结实 + 剑
function buildAdventurer(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.27,0.6,6,12), c);
  addLimbs(g, c, [0.11,0.55], [0.12,0.42]);
  const sword=new THREE.Group(); const smat=mat(0xcccccc,{metalness:0.8,roughness:0.2});
  const blade=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.5,0.1),smat);blade.position.y=0.25;sword.add(blade);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.03,0.06),mat(0xd4a017,{metalness:0.7}));sword.add(guard);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.12,8),mat(0x4a2c10));grip.position.y=-0.07;sword.add(grip);
  sword.position.set(0.4,0.45,0.2); sword.rotation.x=0.2; g.add(sword);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 小游戏开发者：现代青年 + 发光手机
function buildGamedev(c){
  const {g,body,head}=baseHuman(new THREE.CapsuleGeometry(0.24,0.62,6,12), c);
  addLimbs(g, c, [0.09,0.55], [0.1,0.42]);
  const phone=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.26,0.015),
    new THREE.MeshStandardMaterial({color:0x111111,emissive:0x4488ff,emissiveIntensity:0.4,roughness:0.3}));
  phone.position.set(0.28,0.5,0.22); phone.rotation.x=-0.4; g.add(phone);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}

const BUILDER_MAP={
  dumbbell:buildCoach, glasses:buildCoder, hat:buildFoodie, backpack:buildTraveler,
  notebook:buildObserver, book:buildStudent, tie:buildWorker, wrench:buildToolman,
  cup:buildLifestyler, pen:buildWriter, sword:buildAdventurer, phone:buildGamedev
};

// 按 config.accessory 路由。config: {color, accessory, name}
export function buildNPC3D(config){
  const fn=BUILDER_MAP[config.accessory];
  const g = fn ? fn(config.color) : buildGeneric(config.color);
  g.scale.setScalar(0.9);
  return g;
}
function buildGeneric(color){
  const {g,head}=baseHuman(new THREE.CapsuleGeometry(0.24,0.62,6,12), color);
  addLimbs(g, color, [0.1,0.55], [0.1,0.42]);
  g.userData.head=head; g.userData.idlePhase=0; return g;
}
// 更新 NPC idle 动画（整体浮动 + 头部轻转）
export function updateNPC3DIdle(g, time, idx=0){
  if(!g||!g.userData) return;
  const ph = g.userData.idlePhase || (idx*0.7);
  g.position.y = (g.userData.baseY||0) + Math.sin(time*1.5 + ph)*0.04;
  if(g.userData.head){ g.userData.head.rotation.y = Math.sin(time*0.8 + ph)*0.15; }
}
