// site-dev/world/src/arcade/arcade-visitors.js
// 游戏厅里的访客 NPC：喜欢玩 AR 的小人会自由进出游戏厅，
// 走到街机前"玩"一会儿，心理变化反映在头顶心声气泡上（初心要求）。
// 全部程序生成（胶囊+球 Q 弹小人），不依赖外部模型。
import * as THREE from 'three';

// 心声池：进场/玩/离开不同心境
const THOUGHTS = {
  enter: ['听说这儿的魔法书很灵～','来玩两把放松一下','今天要刷个高分！','哇，里面好热闹'],
  play: ['这关好难…再试一次','哈哈终于过了！','手抖了手抖了','这 AR 也太酷了吧','差一点点！','上头了上头了'],
  leave: ['玩累了，回家咯','今天战绩不错～','下次再来刷分','肚子饿了，先撤']
};
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// 程序生成 Q 弹小人（胶囊身体 + 球头 + 小帽子）
function createVisitorBody(color){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.5, 6, 12),
    new THREE.MeshStandardMaterial({color, roughness:0.6, flatShading:true})
  );
  body.position.y = 0.55; g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12),
    new THREE.MeshStandardMaterial({color:0xffe0c0, roughness:0.7, flatShading:true})
  );
  head.position.y = 1.05; g.add(head);
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.22, 8),
    new THREE.MeshStandardMaterial({color, roughness:0.6, flatShading:true})
  );
  hat.position.y = 1.32; g.add(hat);
  return g;
}

// 心声气泡（共享一张 CanvasTexture，省内存）
let bubbleCanvas=null, bubbleCtx=null, bubbleTex=null;
function getBubble(){
  if(!bubbleCanvas){
    bubbleCanvas=document.createElement('canvas');
    bubbleCanvas.width=512; bubbleCanvas.height=128;
    bubbleCtx=bubbleCanvas.getContext('2d');
    bubbleTex=new THREE.CanvasTexture(bubbleCanvas);
    bubbleTex.colorSpace=THREE.SRGBColorSpace;
  }
  return {bubbleCanvas,bubbleCtx,bubbleTex};
}
function makeBubbleSprite(){
  const {bubbleTex}=getBubble();
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:bubbleTex, transparent:true, depthTest:false}));
  sp.scale.set(1.6,0.4,1); sp.position.y=1.75;
  sp.visible=false;
  return sp;
}
function paintBubble(text){
  const {bubbleCanvas,bubbleCtx}=getBubble();
  const w=bubbleCanvas.width, h=bubbleCanvas.height;
  bubbleCtx.clearRect(0,0,w,h);
  bubbleCtx.fillStyle='rgba(255,247,232,0.95)';
  roundRect(bubbleCtx, 8, 30, w-16, h-44, 24); bubbleCtx.fill();
  bubbleCtx.beginPath(); bubbleCtx.moveTo(w/2-12, h-14); bubbleCtx.lineTo(w/2, h-2); bubbleCtx.lineTo(w/2+12, h-14); bubbleCtx.fill();
  bubbleCtx.fillStyle='#593a20';
  bubbleCtx.font='bold 40px Georgia,"Microsoft YaHei",serif';
  bubbleCtx.textAlign='center'; bubbleCtx.textBaseline='middle';
  bubbleCtx.fillText(text, w/2, h/2+6);
  getBubble().bubbleTex.needsUpdate=true;
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

const VISITOR_COLORS=[0xff8a9b,0x8ad0ff,0xffdf8c,0xb8e890,0xc89eff];

/**
 * 创建游戏厅访客系统。
 * @param {THREE.Scene} scene
 * @param {Array} machinePositions - 街机世界坐标数组 [{x,z}, ...]
 */
export function createArcadeVisitors(scene, machinePositions){
  const visitors=[];
  const count = 3;

  function pickTarget(){
    if(!machinePositions.length) return {x:0,z:-2};
    const m = machinePositions[Math.floor(Math.random()*machinePositions.length)];
    return {x: m.x + (Math.random()-0.5)*0.6, z: m.z + 1.3};
  }
  function showThought(v, text){
    paintBubble(text);
    v.bubble.visible = true;
    v.bubbleVisible = true;
    v.bubbleTimer = 2.5 + Math.random()*1.5;
  }
  function spawnVisitor(){
    const color = VISITOR_COLORS[visitors.length % VISITOR_COLORS.length];
    const body = createVisitorBody(color);
    body.position.set((Math.random()-0.5)*4, 0, 7);
    scene.add(body);
    const bubble = makeBubbleSprite();
    body.add(bubble);
    const v = {
      body, bubble, bubbleVisible:false, bubbleTimer:0,
      state:'going', target: pickTarget(), stateTimer:0,
      speed: 1.2 + Math.random()*0.6, bobPhase: Math.random()*Math.PI*2
    };
    showThought(v, pick(THOUGHTS.enter));
    visitors.push(v);
  }

  function update(delta, time){
    for(let i=visitors.length-1; i>=0; i--){
      const v = visitors[i];
      v.stateTimer += delta;
      if(v.bubbleVisible){
        v.bubbleTimer -= delta;
        if(v.bubbleTimer<=0){ v.bubble.visible=false; v.bubbleVisible=false; }
      }
      const dx = v.target.x - v.body.position.x;
      const dz = v.target.z - v.body.position.z;
      const dist = Math.hypot(dx,dz);
      v.body.position.y = Math.abs(Math.sin(time*6 + v.bobPhase))*0.08;
      if(v.state==='going' || v.state==='leaving'){
        if(dist > 0.3){
          v.body.position.x += (dx/dist)*v.speed*delta;
          v.body.position.z += (dz/dist)*v.speed*delta;
          v.body.rotation.y = Math.atan2(dx, dz);
        } else {
          if(v.state==='going'){
            v.state='playing'; v.stateTimer=0;
            v.body.rotation.y = Math.atan2(v.target.x - v.body.position.x, -(v.target.z - v.body.position.z));
            showThought(v, pick(THOUGHTS.play));
          } else {
            scene.remove(v.body);
            visitors.splice(i,1);
          }
        }
      } else if(v.state==='playing'){
        if(v.stateTimer > 4 + Math.random()*3){
          v.state='leaving'; v.stateTimer=0;
          v.target = {x:(Math.random()-0.5)*4, z:8};
          showThought(v, pick(THOUGHTS.leave));
        } else if(v.stateTimer > 2 && !v.bubbleVisible && Math.random()<0.01){
          showThought(v, pick(THOUGHTS.play));
        }
      }
    }
    if(visitors.length < count && Math.random() < 0.005){
      spawnVisitor();
    }
  }

  for(let i=0;i<count;i++) spawnVisitor();
  return { update, visitors };
}
