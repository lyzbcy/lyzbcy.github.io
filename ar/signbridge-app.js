// site-dev/ar/signbridge-app.js
// 旗舰② AR 手语桥：手势识别成词 → 拼句 → 语音朗读。
// 痛点：听障人士沟通障碍（公益无障碍）。
// AI：MediaPipe HandLandmarker 双手21点 + gesture-dict 启发式手势分类（常用词）。
import * as THREE from 'three';
import {createHandLandmarker} from './shared/mediapipe-loader.js';
import {recognize, GESTURE_DICT} from './shared/gesture-dict.js';
import {showToast, injectCameraSelector, getUserCameraStream} from './shared/fairy-ui.js';
import {BaseGame} from './shared/game-state.js';

const game = new BaseGame('signbridge_best');
game.setMode('boot');
const video = document.getElementById('video');
const canvas = document.getElementById('scene');
const permission = document.getElementById('permission');
const panel = document.getElementById('panel');
const currentWord = document.getElementById('current-word');
const sentenceEl = document.getElementById('sentence');
const wordCountEl = document.getElementById('word-count');

// ---------- Three.js 场景：画双手骨骼连线 ----------
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
camera.position.z = 5;
scene.add(new THREE.AmbientLight(0xffffff, 1));

const HAND_CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const handGroup = new THREE.Group(); scene.add(handGroup);

let handLandmarker = null, mode = 'boot';
const sentence = [];
let pendingWord = null, pendingCount = 0, lastAcceptedWord = '', acceptCooldown = 0;

async function startCamera(){
  try{
    game.setCameraAttempted('true');
    const cardEl = document.querySelector('#permission .perm-card');
    const sel = (cardEl && cardEl.__camSelector) ? cardEl.__camSelector.getSel() : {facingMode:'user'};
    const stream = await getUserCameraStream(sel);
    video.srcObject = stream; await video.play();
    game.setCameraReady('true');
    handLandmarker = await createHandLandmarker();
    game.setMode('camera'); mode='camera';
    permission.classList.add('hidden'); panel.style.display='none';
    hideCursorWhilePlaying();
    showToast('做手势试试，识别后会自动加入句子', 2200);
    game.start(); loop();
  }catch(e){
    game.setError(e); game.setMode('fallback');
    showToast('摄像头不可用，进入演示模式', 2000);
    startDemo();
  }
}
function startDemo(){
  mode='demo'; game.setMode('mouse');
  permission.classList.add('hidden'); panel.style.display='none';
  game.start(); loop();
  showToast('演示模式：随机演示可识别的词', 2000);
  let i=0;
  setInterval(()=>{ const w=GESTURE_DICT[i%GESTURE_DICT.length].word; i++; showCurrentWord(w,0.9); }, 2500);
}

let _cursorTimer=null;
function hideCursorWhilePlaying(){
  document.body.style.cursor='none';
  addEventListener('mousemove',()=>{ document.body.style.cursor='auto'; clearTimeout(_cursorTimer); _cursorTimer=setTimeout(()=>{document.body.style.cursor='none';},1500); });
}

function showCurrentWord(word, conf){
  currentWord.querySelector('.big').textContent = word;
  currentWord.querySelector('.conf').textContent = conf>=0.85?'识别置信度高':'识别中…请保持手势';
  currentWord.classList.add('show');
  document.body.dataset.recognized = word;
  clearTimeout(currentWord._t);
  currentWord._t = setTimeout(()=>currentWord.classList.remove('show'), 1800);
}

function addToSentence(word){
  if(word===lastAcceptedWord && acceptCooldown>0) return;
  sentence.push(word);
  lastAcceptedWord = word;
  acceptCooldown = 2.0;
  updateSentence();
}
function updateSentence(){
  if(sentence.length===0){
    sentenceEl.textContent='还没有识别的词，做出手势试试';
    sentenceEl.classList.add('empty');
  } else {
    sentenceEl.textContent = sentence.join(' ');
    sentenceEl.classList.remove('empty');
  }
  wordCountEl.textContent = sentence.length;
  document.body.dataset.sentenceLength = sentence.length;
}

function speak(){
  if(sentence.length===0){ showToast('句子为空',1200); return; }
  const text = sentence.join('，');
  if('speechSynthesis' in window){
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.9;
    speechSynthesis.speak(u);
    showToast('朗读中…',1500);
  } else { showToast('浏览器不支持语音朗读',1500); }
}
function copySentence(){
  if(sentence.length===0){ showToast('句子为空',1200); return; }
  const text = sentence.join(' ');
  navigator.clipboard?.writeText(text).then(()=>showToast('已复制：'+text,1500)).catch(()=>showToast('复制失败',1200));
}
function clearSentence(){ sentence.length=0; lastAcceptedWord=''; updateSentence(); showToast('已清空',1000); }

function drawHands(hands){
  handGroup.clear();
  if(!hands||hands.length===0) return;
  const lineMat = new THREE.LineBasicMaterial({color:0xffdf8c, transparent:true, opacity:0.7});
  const dotMat = new THREE.MeshBasicMaterial({color:0xfff0c0});
  hands.forEach(h=>{
    const lm = h.landmarks || h;
    if(!lm || lm.length<21) return;
    HAND_CONNECTIONS.forEach(([a,b])=>{
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3((1-lm[a].x)*2-1, -lm[a].y*2+1, 0),
        new THREE.Vector3((1-lm[b].x)*2-1, -lm[b].y*2+1, 0)
      ]);
      handGroup.add(new THREE.Line(g, lineMat));
    });
    lm.forEach(p=>{
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.012,8,8), dotMat);
      d.position.set((1-p.x)*2-1, -p.y*2+1, 0);
      handGroup.add(d);
    });
  });
}

function loop(){
  requestAnimationFrame(loop);
  if(acceptCooldown>0) acceptCooldown -= 0.016;
  if(mode==='camera' && handLandmarker && video.readyState>=2){
    const res = handLandmarker.detectForVideo(video, performance.now());
    const hands = res.landmarks || [];
    drawHands(hands);
    const r = recognize(hands.map(h=>({landmarks:h})));
    if(r){
      if(r.word===pendingWord){ pendingCount++; }
      else { pendingWord=r.word; pendingCount=1; }
      if(pendingCount>=2){
        showCurrentWord(r.word, r.confidence);
        if(r.confidence>=0.6) addToSentence(r.word);
        pendingCount=0; pendingWord=null;
      }
    } else { pendingWord=null; pendingCount=0; }
  }
  renderer.render(scene, camera);
}

document.getElementById('camera').onclick = startCamera;
document.getElementById('cam2').onclick = startCamera;
document.getElementById('demo').onclick = startDemo;
document.getElementById('demo2').onclick = startDemo;
document.getElementById('speak-btn').onclick = speak;
document.getElementById('copy-btn').onclick = copySentence;
document.getElementById('clear-btn').onclick = clearSentence;
(async ()=>{ try{ const c=document.querySelector('#permission .perm-card'); if(c) c.__camSelector=await injectCameraSelector(c,'user'); }catch(e){} })();
addEventListener('resize', ()=>{ renderer.setSize(innerWidth,innerHeight); });
