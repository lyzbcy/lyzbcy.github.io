// Recovery is for read-only page selection. Never wrap a reply submission in this helper.
export async function recoverReadOnlyUi(action, recover, {onRetry=()=>{}}={}) {
  try { return await action(); }
  catch (error) {
    if (/LOGIN_EXPIRED|用户未登录|StatusCode.*8/i.test(error.message)) throw error;
    onRetry(error);
    await recover();
    return action(); // exactly one fresh-page retry, then fail this collection
  }
}

export async function settlePending(pending, timeoutMs=7000) {
  let timer;
  try {
    return await Promise.race([
      Promise.allSettled([...pending]).then(()=>true),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})
    ]);
  } finally { clearTimeout(timer); }
}

export async function boundedResponse(operation, timeoutMs=5000) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('COMMENT_RESPONSE_TIMEOUT')),timeoutMs);})
    ]);
  } finally { clearTimeout(timer); }
}
