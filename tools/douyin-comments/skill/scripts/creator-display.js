const {spawnSync,execFileSync}=require('node:child_process');
function runCreator(command,args,options={},deps={spawnSync,execFileSync}){
 const env={...process.env,...options.env};
 const usable=Boolean(env.DISPLAY)&&deps.spawnSync('xdpyinfo',[],{env,stdio:'ignore',timeout:3000}).status===0;
 if(usable)return deps.execFileSync(command,args,{...options,env});
 return deps.execFileSync('xvfb-run',['-a',command,...args],{...options,env});
}
module.exports={runCreator};
