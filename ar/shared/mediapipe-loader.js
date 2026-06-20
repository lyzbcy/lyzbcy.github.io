// site-dev/ar/shared/mediapipe-loader.js
// 统一按需加载 MediaPipe Tasks-Vision（失败时由调用方 fallback 到鼠标演示）
const MEDIAPIPE_BUNDLE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";
const MEDIAPIPE_WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const HAND_MODEL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let _module = null;
async function getModule(){
  if(_module) return _module;
  _module = await import(MEDIAPIPE_BUNDLE);
  return _module;
}

export async function createHandLandmarker(){
  const {FilesetResolver, HandLandmarker} = await getModule();
  const fs = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  return HandLandmarker.createFromOptions(fs, {
    baseOptions:{modelAssetPath:HAND_MODEL, delegate:"GPU"},
    runningMode:"VIDEO", numHands:2
  });
}
export async function createFaceLandmarker(){
  const {FilesetResolver, FaceLandmarker} = await getModule();
  const fs = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  return FaceLandmarker.createFromOptions(fs, {
    baseOptions:{modelAssetPath:FACE_MODEL, delegate:"GPU"},
    runningMode:"VIDEO", numFaces:1,
    outputFaceBlendshapes:true, outputFacialTransformationMatrixes:false
  });
}
export async function createPoseLandmarker(){
  const {FilesetResolver, PoseLandmarker} = await getModule();
  const fs = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  return PoseLandmarker.createFromOptions(fs, {
    baseOptions:{modelAssetPath:POSE_MODEL, delegate:"GPU"},
    runningMode:"VIDEO", numPoses:1
  });
}
